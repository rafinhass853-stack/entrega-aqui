import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db, auth, storage } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ImagePlus, X, Plus, Edit2, Trash2, Check } from 'lucide-react';

const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const toNumber = (v, def = 0) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : def;
};

const Cardapio = ({ isMobile }) => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // Toggle geral
  const [temGrupos, setTemGrupos] = useState(false);

  // Edição de opção
  const [grupoOpcaoEditandoId, setGrupoOpcaoEditandoId] = useState(null);
  const [indexOpcaoEditando, setIndexOpcaoEditando] = useState(null);

  const initialState = {
    nome: '',
    preco: '',
    descricao: '',
    categoria: '',
    foto: null,

    // NOVO PADRÃO: vários grupos
    gruposOpcoes: [] // [{idGrupo, tituloGrupo, obrigatorio, qtdMinima, qtdMaxima, opcoes:[{idOpcao,nome,preco,foto,preview}]}]
  };

  const [novoProduto, setNovoProduto] = useState(initialState);

  // opção temporária (adicionar/editar)
  const [novaOpcao, setNovaOpcao] = useState({
    nome: '',
    preco: '',
    foto: null,
    preview: ''
  });

  const [previewPrincipal, setPreviewPrincipal] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaProdutos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProdutos(listaProdutos);
    });

    return () => unsubscribe();
  }, []);

  const categoriasExistentes = [...new Set(produtos.map((p) => p.categoria))].filter(Boolean);

  // =========================
  // IMAGEM PRINCIPAL
  // =========================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNovoProduto({ ...novoProduto, foto: file });
      setPreviewPrincipal(URL.createObjectURL(file));
    }
  };

  // =========================
  // IMAGEM OPÇÃO
  // =========================
  const handleOpcaoImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNovaOpcao({ ...novaOpcao, foto: file, preview: URL.createObjectURL(file) });
    }
  };

  // =========================
  // GRUPOS (subcategorias)
  // =========================
  const adicionarGrupo = () => {
    const novoGrupo = {
      idGrupo: uid(),
      tituloGrupo: 'Adicionais',
      obrigatorio: false,
      qtdMinima: 0,
      qtdMaxima: 1000,
      opcoes: []
    };
    setNovoProduto((prev) => ({ ...prev, gruposOpcoes: [...prev.gruposOpcoes, novoGrupo] }));
    setTemGrupos(true);
  };

  const removerGrupo = (idGrupo) => {
    const novos = novoProduto.gruposOpcoes.filter((g) => g.idGrupo !== idGrupo);
    setNovoProduto((prev) => ({ ...prev, gruposOpcoes: novos }));
    if (novos.length === 0) {
      setTemGrupos(false);
      cancelarEdicaoOpcao();
    }
  };

  const atualizarGrupo = (idGrupo, patch) => {
    setNovoProduto((prev) => ({
      ...prev,
      gruposOpcoes: prev.gruposOpcoes.map((g) => (g.idGrupo === idGrupo ? { ...g, ...patch } : g))
    }));
  };

  // =========================
  // OPÇÕES dentro do grupo
  // =========================
  const adicionarOpcaoNoGrupo = (idGrupo) => {
    if (!novaOpcao.nome.trim()) return;

    setNovoProduto((prev) => ({
      ...prev,
      gruposOpcoes: prev.gruposOpcoes.map((g) => {
        if (g.idGrupo !== idGrupo) return g;
        const nova = {
          idOpcao: uid(),
          nome: novaOpcao.nome.trim(),
          preco: toNumber(novaOpcao.preco, 0),
          foto: novaOpcao.foto || null,
          preview: novaOpcao.preview || ''
        };
        return { ...g, opcoes: [...(g.opcoes || []), nova] };
      })
    }));

    setNovaOpcao({ nome: '', preco: '', foto: null, preview: '' });
  };

  const prepararEdicaoOpcao = (idGrupo, index) => {
    const grupo = novoProduto.gruposOpcoes.find((g) => g.idGrupo === idGrupo);
    if (!grupo) return;
    const op = grupo.opcoes?.[index];
    if (!op) return;

    setNovaOpcao({
      nome: op.nome || '',
      preco: op.preco ?? '',
      foto: op.foto || null,
      preview:
        op.foto instanceof File
          ? URL.createObjectURL(op.foto)
          : (op.preview || op.foto || '')
    });

    setGrupoOpcaoEditandoId(idGrupo);
    setIndexOpcaoEditando(index);
  };

  const confirmarEdicaoOpcao = () => {
    if (!novaOpcao.nome.trim()) return;
    if (!grupoOpcaoEditandoId && grupoOpcaoEditandoId !== 0) return;
    if (indexOpcaoEditando === null || indexOpcaoEditando === undefined) return;

    setNovoProduto((prev) => ({
      ...prev,
      gruposOpcoes: prev.gruposOpcoes.map((g) => {
        if (g.idGrupo !== grupoOpcaoEditandoId) return g;

        const novas = [...(g.opcoes || [])];
        const atual = novas[indexOpcaoEditando];
        if (!atual) return g;

        novas[indexOpcaoEditando] = {
          ...atual,
          nome: novaOpcao.nome.trim(),
          preco: toNumber(novaOpcao.preco, 0),
          foto: novaOpcao.foto || atual.foto || null,
          preview: novaOpcao.preview || atual.preview || ''
        };

        return { ...g, opcoes: novas };
      })
    }));

    cancelarEdicaoOpcao();
  };

  const cancelarEdicaoOpcao = () => {
    setNovaOpcao({ nome: '', preco: '', foto: null, preview: '' });
    setGrupoOpcaoEditandoId(null);
    setIndexOpcaoEditando(null);
  };

  const removerOpcao = (idGrupo, index) => {
    setNovoProduto((prev) => ({
      ...prev,
      gruposOpcoes: prev.gruposOpcoes.map((g) => {
        if (g.idGrupo !== idGrupo) return g;
        const novas = (g.opcoes || []).filter((_, i) => i !== index);
        return { ...g, opcoes: novas };
      })
    }));

    // se estava editando a mesma opção, cancela
    if (grupoOpcaoEditandoId === idGrupo && indexOpcaoEditando === index) {
      cancelarEdicaoOpcao();
    }
  };

  // =========================
  // CONVERSÃO DE LEGADO -> NOVO
  // (se produto antigo tiver complementos)
  // =========================
  const converterComplementosParaGrupo = (complementos) => {
    if (!complementos?.ativo) return [];
    const opcoes = (complementos.opcoes || []).map((o) => ({
      idOpcao: uid(),
      nome: o.nome || '',
      preco: 0, // legado não tinha preço
      foto: o.foto || null,
      preview: o.foto || ''
    }));

    return [
      {
        idGrupo: uid(),
        tituloGrupo: complementos.tituloGrupo || 'Escolhas',
        obrigatorio: true,
        qtdMinima: toNumber(complementos.qtdMinima, 1),
        qtdMaxima: toNumber(complementos.qtdMaxima, 1),
        opcoes
      }
    ];
  };

  // =========================
  // SALVAR NO FIREBASE
  // =========================
  const handleSalvar = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let urlPrincipal = previewPrincipal;

      // upload foto principal se for File
      if (novoProduto.foto instanceof File) {
        const refProd = ref(storage, `cardapios/${auth.currentUser.uid}/${Date.now()}_main`);
        const res = await uploadBytes(refProd, novoProduto.foto);
        urlPrincipal = await getDownloadURL(res.ref);
      }

      // Processar grupos + upload das fotos das opções
      const gruposProcessados = temGrupos
        ? await Promise.all(
            (novoProduto.gruposOpcoes || []).map(async (g) => {
              const opcoesProcessadas = await Promise.all(
                (g.opcoes || []).map(async (opt) => {
                  // foto pode ser File, URL ou null
                  if (opt.foto instanceof File) {
                    const refOpt = ref(
                      storage,
                      `cardapios/${auth.currentUser.uid}/${Date.now()}_${opt.nome || 'opcao'}`
                    );
                    const resOpt = await uploadBytes(refOpt, opt.foto);
                    const urlOpt = await getDownloadURL(resOpt.ref);
                    return {
                      idOpcao: opt.idOpcao || uid(),
                      nome: opt.nome,
                      preco: toNumber(opt.preco, 0),
                      fotoUrl: urlOpt
                    };
                  }

                  // se já for string URL
                  const url = typeof opt.foto === 'string' ? opt.foto : (opt.preview || null);

                  return {
                    idOpcao: opt.idOpcao || uid(),
                    nome: opt.nome,
                    preco: toNumber(opt.preco, 0),
                    fotoUrl: url || null
                  };
                })
              );

              return {
                idGrupo: g.idGrupo || uid(),
                tituloGrupo: (g.tituloGrupo || '').trim(),
                obrigatorio: !!g.obrigatorio,
                qtdMinima: toNumber(g.qtdMinima, 0),
                qtdMaxima: toNumber(g.qtdMaxima, 0), // 0 também pode significar “sem limite”, se quiser
                opcoes: opcoesProcessadas
              };
            })
          )
        : [];

      // LEGADO: se tiver exatamente 1 grupo, também salva em complementos pra compatibilidade
      // (se você já atualizou o app do cliente, pode remover esse bloco depois)
      const complementosCompat =
        temGrupos && gruposProcessados.length === 1
          ? {
              ativo: true,
              tituloGrupo: gruposProcessados[0].tituloGrupo || 'Escolhas',
              qtdMinima: toNumber(gruposProcessados[0].qtdMinima, 1),
              qtdMaxima: toNumber(gruposProcessados[0].qtdMaxima, 1),
              opcoes: (gruposProcessados[0].opcoes || []).map((o) => ({
                nome: o.nome,
                foto: o.fotoUrl || null
              }))
            }
          : { ativo: false };

      const dadosParaSalvar = {
        nome: novoProduto.nome,
        preco: toNumber(novoProduto.preco, 0),
        descricao: novoProduto.descricao,
        categoria: (novoProduto.categoria || '').trim(),
        foto: urlPrincipal || null,

        // NOVO:
        gruposOpcoes: temGrupos ? gruposProcessados : [],

        // LEGADO:
        complementos: complementosCompat,

        atualizadoEm: serverTimestamp()
      };

      if (editandoId) {
        await updateDoc(
          doc(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio', editandoId),
          dadosParaSalvar
        );
        alert('Produto atualizado!');
      } else {
        await addDoc(collection(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio'), {
          ...dadosParaSalvar,
          criadoEm: serverTimestamp()
        });
        alert('Produto adicionado!');
      }

      cancelarEdicao();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicao = (prod) => {
    setEditandoId(prod.id);

    const gruposDoProduto =
      Array.isArray(prod.gruposOpcoes) && prod.gruposOpcoes.length > 0
        ? prod.gruposOpcoes.map((g) => ({
            idGrupo: g.idGrupo || uid(),
            tituloGrupo: g.tituloGrupo || '',
            obrigatorio: !!g.obrigatorio,
            qtdMinima: toNumber(g.qtdMinima, 0),
            qtdMaxima: toNumber(g.qtdMaxima, 0),
            opcoes: (g.opcoes || []).map((o) => ({
              idOpcao: o.idOpcao || uid(),
              nome: o.nome || '',
              preco: toNumber(o.preco, 0),
              foto: o.fotoUrl || null,
              preview: o.fotoUrl || ''
            }))
          }))
        : converterComplementosParaGrupo(prod.complementos);

    setNovoProduto({
      nome: prod.nome,
      preco: prod.preco,
      descricao: prod.descricao || '',
      categoria: prod.categoria || '',
      foto: null,
      gruposOpcoes: gruposDoProduto
    });

    setTemGrupos(gruposDoProduto.length > 0);
    setPreviewPrincipal(prod.foto || null);

    cancelarEdicaoOpcao();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNovoProduto(initialState);
    setTemGrupos(false);
    setPreviewPrincipal(null);
    cancelarEdicaoOpcao();
  };

  const handleExcluir = async (id) => {
    if (window.confirm('Deseja excluir este item?')) {
      await deleteDoc(doc(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio', id));
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>📋 {editandoId ? 'Editando Produto' : 'Gerenciar Cardápio'}</h1>
        </header>

        <div style={styles.grid}>
          {/* FORMULÁRIO */}
          <section style={styles.formCard}>
            <h3 style={styles.cardTitle}>{editandoId ? '✏️ Alterar Dados' : '✨ Novo Produto'}</h3>

            <form onSubmit={handleSalvar} style={styles.form}>
              <div style={styles.uploadArea}>
                {previewPrincipal ? (
                  <img src={previewPrincipal} style={styles.imagePreview} alt="Preview" />
                ) : (
                  <span>📸 Foto Principal</span>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} style={styles.fileInput} />
              </div>

              <input
                placeholder="Categoria"
                list="cat-list"
                style={styles.input}
                value={novoProduto.categoria}
                onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value })}
                required
              />
              <datalist id="cat-list">{categoriasExistentes.map((c) => <option key={c} value={c} />)}</datalist>

              <input
                placeholder="Nome"
                style={styles.input}
                value={novoProduto.nome}
                onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                required
              />
              <input
                placeholder="Preço (R$)"
                type="number"
                step="0.01"
                style={styles.input}
                value={novoProduto.preco}
                onChange={(e) => setNovoProduto({ ...novoProduto, preco: e.target.value })}
                required
              />
              <textarea
                placeholder="Descrição"
                style={{ ...styles.input, height: '60px' }}
                value={novoProduto.descricao}
                onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
              />

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={temGrupos}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTemGrupos(checked);
                    if (checked && (novoProduto.gruposOpcoes || []).length === 0) {
                      adicionarGrupo();
                    }
                    if (!checked) {
                      setNovoProduto((prev) => ({ ...prev, gruposOpcoes: [] }));
                      cancelarEdicaoOpcao();
                    }
                  }}
                />
                <span style={{ marginLeft: '10px' }}>
                  Ativar grupos de opções (adicionais / sabores / etc.)
                </span>
              </label>

              {temGrupos && (
                <div style={styles.complementosArea}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <strong style={{ color: '#81E6D9', fontSize: 13 }}>Grupos / Subcategorias</strong>
                    <button type="button" onClick={adicionarGrupo} style={styles.btnAddGroup}>
                      <Plus size={16} /> Novo Grupo
                    </button>
                  </div>

                  {/* LISTA DE GRUPOS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    {(novoProduto.gruposOpcoes || []).map((grupo) => (
                      <div key={grupo.idGrupo} style={styles.groupBox}>
                        <div style={styles.groupHeader}>
                          <input
                            style={{ ...styles.input, flex: 1 }}
                            placeholder="Nome do grupo (ex: Adicionais / Escolha o sabor)"
                            value={grupo.tituloGrupo}
                            onChange={(e) => atualizarGrupo(grupo.idGrupo, { tituloGrupo: e.target.value })}
                          />

                          <button
                            type="button"
                            onClick={() => removerGrupo(grupo.idGrupo)}
                            style={{ ...styles.miniBtn, color: '#FF4D4D' }}
                            title="Remover grupo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div style={styles.groupRules}>
                          <label style={styles.ruleLabel}>
                            <input
                              type="checkbox"
                              checked={!!grupo.obrigatorio}
                              onChange={(e) => atualizarGrupo(grupo.idGrupo, { obrigatorio: e.target.checked })}
                            />
                            <span style={{ marginLeft: 8, color: '#fff', fontSize: 12 }}>Obrigatório</span>
                          </label>

                          <input
                            style={{ ...styles.input, width: 110 }}
                            type="number"
                            placeholder="Min"
                            value={grupo.qtdMinima}
                            onChange={(e) => atualizarGrupo(grupo.idGrupo, { qtdMinima: toNumber(e.target.value, 0) })}
                          />

                          <input
                            style={{ ...styles.input, width: 110 }}
                            type="number"
                            placeholder="Max"
                            value={grupo.qtdMaxima}
                            onChange={(e) => atualizarGrupo(grupo.idGrupo, { qtdMaxima: toNumber(e.target.value, 0) })}
                          />

                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                            (Ex: Max 1000 para adicionais)
                          </span>
                        </div>

                        {/* ADD OPÇÃO */}
                        <div style={styles.addSaborBox}>
                          <div style={styles.saborInputRow}>
                            <label style={styles.saborFotoLabel}>
                              {novaOpcao.preview ? (
                                <img src={novaOpcao.preview} style={styles.saborMiniPreview} alt="" />
                              ) : (
                                <ImagePlus size={18} />
                              )}
                              <input type="file" hidden onChange={handleOpcaoImageChange} />
                            </label>

                            <input
                              style={{ ...styles.input, flex: 1 }}
                              placeholder="Nome da opção (ex: Alface / Chocolate)"
                              value={novaOpcao.nome}
                              onChange={(e) => setNovaOpcao({ ...novaOpcao, nome: e.target.value })}
                            />

                            <input
                              style={{ ...styles.input, width: 120 }}
                              type="number"
                              step="0.01"
                              placeholder="Preço +"
                              value={novaOpcao.preco}
                              onChange={(e) => setNovaOpcao({ ...novaOpcao, preco: e.target.value })}
                            />

                            {grupoOpcaoEditandoId === grupo.idGrupo && indexOpcaoEditando !== null ? (
                              <button
                                type="button"
                                onClick={confirmarEdicaoOpcao}
                                style={{ ...styles.btnAddOpcao, backgroundColor: '#10B981' }}
                                title="Confirmar edição"
                              >
                                <Check size={18} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => adicionarOpcaoNoGrupo(grupo.idGrupo)}
                                style={styles.btnAddOpcao}
                                title="Adicionar opção"
                              >
                                <Plus size={18} />
                              </button>
                            )}

                            {(grupoOpcaoEditandoId === grupo.idGrupo && indexOpcaoEditando !== null) && (
                              <button
                                type="button"
                                onClick={cancelarEdicaoOpcao}
                                style={{ ...styles.btnAddOpcao, backgroundColor: 'rgba(255,255,255,0.12)' }}
                                title="Cancelar edição"
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* LISTA OPÇÕES DO GRUPO */}
                        <div style={styles.opcoesListVertical}>
                          {(grupo.opcoes || []).map((op, idx) => (
                            <div
                              key={op.idOpcao || idx}
                              style={{
                                ...styles.saborBadgeLong,
                                border:
                                  grupoOpcaoEditandoId === grupo.idGrupo && indexOpcaoEditando === idx
                                    ? '1px solid #4FD1C5'
                                    : '1px solid transparent'
                              }}
                            >
                              <img
                                src={op.preview || op.foto || 'https://via.placeholder.com/30'}
                                style={styles.saborImgThumb}
                                alt=""
                              />
                              <span style={{ flex: 1, fontSize: '13px', color: '#fff' }}>
                                {op.nome}
                                <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 8 }}>
                                  {toNumber(op.preco, 0) > 0 ? `(+ R$ ${toNumber(op.preco, 0).toFixed(2)})` : '(R$ 0,00)'}
                                </span>
                              </span>

                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                  type="button"
                                  onClick={() => prepararEdicaoOpcao(grupo.idGrupo, idx)}
                                  style={styles.miniBtn}
                                  title="Editar opção"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removerOpcao(grupo.idGrupo, idx)}
                                  style={{ ...styles.miniBtn, color: '#FF4D4D' }}
                                  title="Remover opção"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {(grupo.opcoes || []).length === 0 && (
                            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
                              Nenhuma opção adicionada ainda.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={loading} style={styles.btnSave}>
                  {loading ? 'Salvando...' : editandoId ? '✅ Salvar Alterações' : '➕ Adicionar Produto'}
                </button>
                {editandoId && (
                  <button type="button" onClick={cancelarEdicao} style={styles.btnCancel}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* LISTA DE PRODUTOS */}
          <section style={styles.listArea}>
            {categoriasExistentes.map((cat) => (
              <div key={cat} style={{ marginBottom: '25px' }}>
                <h3 style={styles.categoryHeader}>{cat}</h3>
                <div style={styles.itemsGrid}>
                  {produtos
                    .filter((p) => p.categoria === cat)
                    .map((prod) => (
                      <div key={prod.id} style={styles.itemCard}>
                        <img src={prod.foto || 'https://via.placeholder.com/50'} style={styles.itemImg} alt="" />
                        <div style={{ flex: 1 }}>
                          <h4 style={styles.itemName}>{prod.nome}</h4>
                          <span style={styles.itemPrice}>R$ {toNumber(prod.preco, 0).toFixed(2)}</span>
                          {!!(prod.gruposOpcoes?.length) && (
                            <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                              {prod.gruposOpcoes.length} grupo(s) de opções
                            </div>
                          )}
                        </div>
                        <div style={styles.itemActions}>
                          <button onClick={() => prepararEdicao(prod)} style={styles.btnEdit}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleExcluir(prod.id)} style={styles.btnDelete}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </Layout>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  header: { marginBottom: '30px', borderBottom: '1px solid #10B981', paddingBottom: '10px' },
  title: { color: '#4FD1C5', fontSize: '24px', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' },
  formCard: { backgroundColor: 'rgba(0, 35, 40, 0.7)', padding: '20px', borderRadius: '15px', border: '1px solid #10B98133', height: 'fit-content' },
  cardTitle: { color: '#4FD1C5', marginBottom: '15px', fontSize: '18px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  uploadArea: { height: '140px', border: '2px dashed #10B98155', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', backgroundColor: '#00171A' },
  fileInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' },
  imagePreview: { width: '100%', height: '100%', objectFit: 'cover' },
  input: { backgroundColor: '#00171A', border: '1px solid #10B98144', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' },
  btnSave: { flex: 2, backgroundColor: '#4FD1C5', color: '#00171A', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnCancel: { flex: 1, backgroundColor: 'transparent', color: '#FF4D4D', border: '1px solid #FF4D4D', borderRadius: '8px', cursor: 'pointer' },

  checkboxLabel: { color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  complementosArea: { background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px' },

  btnAddGroup: { background: 'rgba(16,185,129,0.18)', border: '1px solid #10B98155', color: '#10B981', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold', fontSize: 12 },

  groupBox: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12, padding: 12 },
  groupHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  groupRules: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 },
  ruleLabel: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' },

  addSaborBox: { marginTop: '10px', marginBottom: '10px' },
  saborInputRow: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },

  saborFotoLabel: { width: '42px', height: '42px', borderRadius: '8px', border: '1px solid #10B98144', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', backgroundColor: '#00171A' },
  saborMiniPreview: { width: '100%', height: '100%', objectFit: 'cover' },

  btnAddOpcao: { background: '#10B981', border: 'none', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' },

  opcoesListVertical: { display: 'flex', flexDirection: 'column', gap: '6px' },
  saborBadgeLong: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' },
  saborImgThumb: { width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', backgroundColor: '#000' },

  miniBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', padding: '5px', borderRadius: '4px', color: '#fff', cursor: 'pointer' },

  listArea: { display: 'flex', flexDirection: 'column' },
  categoryHeader: { color: '#4FD1C5', borderLeft: '3px solid #10B981', paddingLeft: '10px', fontSize: '16px', marginBottom: '15px' },
  itemsGrid: {},
  itemCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' },
  itemImg: { width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' },
  itemName: { color: '#fff', margin: 0, fontSize: '14px' },
  itemPrice: { color: '#10B981', fontWeight: 'bold', fontSize: '13px' },
  itemActions: { display: 'flex', gap: '8px' },
  btnEdit: { background: 'rgba(79, 209, 197, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: '#4FD1C5', cursor: 'pointer' },
  btnDelete: { background: 'rgba(255, 77, 77, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: '#FF4D4D', cursor: 'pointer' }
};

export default Cardapio;
