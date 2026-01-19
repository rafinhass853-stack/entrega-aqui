import React, { useState, useEffect } from 'react';
import { Layout } from './Menu'; 
import { db, auth, storage } from './firebase'; 
import { 
  collection, addDoc, onSnapshot, query, deleteDoc, doc, serverTimestamp, updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ImagePlus, X, Plus, Edit2, Trash2, Check } from 'lucide-react';

const Cardapio = ({ isMobile }) => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [temComplementos, setTemComplementos] = useState(false);
  const [indexSaborEditando, setIndexSaborEditando] = useState(null);

  const initialState = {
    nome: '',
    preco: '',
    descricao: '',
    categoria: '',
    foto: null,
    complementos: {
      ativo: false,
      tituloGrupo: '',
      qtdMinima: 1,
      qtdMaxima: 1,
      opcoes: [] 
    }
  };

  const [novoProduto, setNovoProduto] = useState(initialState);
  const [novaOpcao, setNovaOpcao] = useState({ nome: '', foto: null, preview: '' });
  const [previewPrincipal, setPreviewPrincipal] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaProdutos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProdutos(listaProdutos);
    });
    return () => unsubscribe();
  }, []);

  const categoriasExistentes = [...new Set(produtos.map(p => p.categoria))].filter(Boolean);

  // --- LOGICA DE IMAGEM PRINCIPAL ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovoProduto({ ...novoProduto, foto: file });
      setPreviewPrincipal(URL.createObjectURL(file));
    }
  };

  // --- LOGICA DE IMAGEM DA SUBCATEGORIA (SABOR) ---
  const handleSaborImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovaOpcao({ ...novaOpcao, foto: file, preview: URL.createObjectURL(file) });
    }
  };

  const adicionarOpcao = () => {
    if (!novaOpcao.nome.trim()) return;
    setNovoProduto({
      ...novoProduto,
      complementos: {
        ...novoProduto.complementos,
        opcoes: [...novoProduto.complementos.opcoes, { ...novaOpcao }]
      }
    });
    setNovaOpcao({ nome: '', foto: null, preview: '' });
  };

  const prepararEdicaoSabor = (index) => {
    const sabor = novoProduto.complementos.opcoes[index];
    setNovaOpcao({
      nome: sabor.nome,
      foto: sabor.foto,
      preview: sabor.foto instanceof File ? URL.createObjectURL(sabor.foto) : (sabor.foto || '')
    });
    setIndexSaborEditando(index);
  };

  const confirmarEdicaoSabor = () => {
    if (!novaOpcao.nome.trim()) return;
    const novasOpcoes = [...novoProduto.complementos.opcoes];
    novasOpcoes[indexSaborEditando] = { ...novaOpcao };
    setNovoProduto({
      ...novoProduto,
      complementos: { ...novoProduto.complementos, opcoes: novasOpcoes }
    });
    setNovaOpcao({ nome: '', foto: null, preview: '' });
    setIndexSaborEditando(null);
  };

  const removerOpcao = (index) => {
    const novasOpcoes = novoProduto.complementos.opcoes.filter((_, i) => i !== index);
    setNovoProduto({ ...novoProduto, complementos: { ...novoProduto.complementos, opcoes: novasOpcoes } });
    if (indexSaborEditando === index) setIndexSaborEditando(null);
  };

  // --- SALVAR NO FIREBASE ---
  const handleSalvar = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let urlPrincipal = previewPrincipal;

      if (novoProduto.foto instanceof File) {
        const refProd = ref(storage, `cardapios/${auth.currentUser.uid}/${Date.now()}_main`);
        const res = await uploadBytes(refProd, novoProduto.foto);
        urlPrincipal = await getDownloadURL(res.ref);
      }

      const opcoesProcessadas = await Promise.all(novoProduto.complementos.opcoes.map(async (opt) => {
        if (opt.foto instanceof File) {
          const refOpt = ref(storage, `cardapios/${auth.currentUser.uid}/${Date.now()}_${opt.nome}`);
          const resOpt = await uploadBytes(refOpt, opt.foto);
          const urlOpt = await getDownloadURL(resOpt.ref);
          return { nome: opt.nome, foto: urlOpt };
        }
        return { nome: opt.nome, foto: opt.foto || null };
      }));

      const dadosParaSalvar = {
        nome: novoProduto.nome,
        preco: parseFloat(novoProduto.preco),
        descricao: novoProduto.descricao,
        categoria: novoProduto.categoria.trim(),
        foto: urlPrincipal,
        complementos: temComplementos ? { 
            ...novoProduto.complementos, 
            ativo: true, 
            opcoes: opcoesProcessadas 
        } : { ativo: false },
        atualizadoEm: serverTimestamp()
      };

      if (editandoId) {
        await updateDoc(doc(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio', editandoId), dadosParaSalvar);
        alert("Produto atualizado!");
      } else {
        await addDoc(collection(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio'), { ...dadosParaSalvar, criadoEm: serverTimestamp() });
        alert("Produto adicionado!");
      }

      cancelarEdicao();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    } finally { setLoading(false); }
  };

  const prepararEdicao = (prod) => {
    setEditandoId(prod.id);
    setNovoProduto({
      nome: prod.nome,
      preco: prod.preco,
      descricao: prod.descricao || '',
      categoria: prod.categoria,
      foto: null,
      complementos: prod.complementos?.ativo ? prod.complementos : initialState.complementos
    });
    setTemComplementos(prod.complementos?.ativo || false);
    setPreviewPrincipal(prod.foto);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNovoProduto(initialState);
    setTemComplementos(false);
    setPreviewPrincipal(null);
    setNovaOpcao({ nome: '', foto: null, preview: '' });
    setIndexSaborEditando(null);
  };

  const handleExcluir = async (id) => {
    if (window.confirm("Deseja excluir este item?")) {
      await deleteDoc(doc(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio', id));
    }
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
            <h1 style={styles.title}>📋 {editandoId ? 'Editando Produto' : 'Gerenciar Cardápio'}</h1>
        </header>

        <div style={styles.grid}>
          {/* FORMULÁRIO DE CADASTRO */}
          <section style={styles.formCard}>
            <h3 style={styles.cardTitle}>{editandoId ? '✏️ Alterar Dados' : '✨ Novo Produto'}</h3>
            <form onSubmit={handleSalvar} style={styles.form}>
              <div style={styles.uploadArea}>
                {previewPrincipal ? (
                  <img src={previewPrincipal} style={styles.imagePreview} alt="Preview" />
                ) : <span>📸 Foto Principal</span>}
                <input type="file" accept="image/*" onChange={handleImageChange} style={styles.fileInput} />
              </div>

              <input placeholder="Categoria" list="cat-list" style={styles.input} value={novoProduto.categoria} onChange={(e) => setNovoProduto({...novoProduto, categoria: e.target.value})} required />
              <datalist id="cat-list">{categoriasExistentes.map(c => <option key={c} value={c} />)}</datalist>
              
              <input placeholder="Nome" style={styles.input} value={novoProduto.nome} onChange={(e) => setNovoProduto({...novoProduto, nome: e.target.value})} required />
              <input placeholder="Preço (R$)" type="number" step="0.01" style={styles.input} value={novoProduto.preco} onChange={(e) => setNovoProduto({...novoProduto, preco: e.target.value})} required />
              <textarea placeholder="Descrição" style={{...styles.input, height: '60px'}} value={novoProduto.descricao} onChange={(e) => setNovoProduto({...novoProduto, descricao: e.target.value})} />

              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={temComplementos} onChange={(e) => setTemComplementos(e.target.checked)} />
                <span style={{marginLeft: '10px'}}>Ativar escolha de sabores</span>
              </label>

              {temComplementos && (
                <div style={styles.complementosArea}>
                  <input style={styles.input} placeholder="Título do grupo" value={novoProduto.complementos.tituloGrupo} onChange={(e) => setNovoProduto({...novoProduto, complementos: {...novoProduto.complementos, tituloGrupo: e.target.value}})} />
                  
                  <div style={styles.addSaborBox}>
                    <div style={styles.saborInputRow}>
                        <label style={styles.saborFotoLabel}>
                            {novaOpcao.preview ? <img src={novaOpcao.preview} style={styles.saborMiniPreview} alt="" /> : <ImagePlus size={18} />}
                            <input type="file" hidden onChange={handleSaborImageChange} />
                        </label>
                        <input style={{...styles.input, flex: 1}} placeholder="Nome do sabor..." value={novaOpcao.nome} onChange={(e) => setNovaOpcao({...novaOpcao, nome: e.target.value})} />
                        
                        {indexSaborEditando !== null ? (
                          <button type="button" onClick={confirmarEdicaoSabor} style={{...styles.btnAddOpcao, backgroundColor: '#10B981'}}><Check size={18} /></button>
                        ) : (
                          <button type="button" onClick={adicionarOpcao} style={styles.btnAddOpcao}><Plus size={18} /></button>
                        )}
                    </div>
                  </div>

                  <div style={styles.opcoesListVertical}>
                    {novoProduto.complementos.opcoes.map((op, idx) => (
                      <div key={idx} style={{...styles.saborBadgeLong, border: indexSaborEditando === idx ? '1px solid #4FD1C5' : '1px solid transparent'}}>
                        <img src={op.preview || op.foto || 'https://via.placeholder.com/30'} style={styles.saborImgThumb} alt="" />
                        <span style={{flex: 1, fontSize: '13px'}}>{op.nome}</span>
                        <div style={{display: 'flex', gap: '5px'}}>
                           <button type="button" onClick={() => prepararEdicaoSabor(idx)} style={styles.miniBtn}><Edit2 size={12} /></button>
                           <button type="button" onClick={() => removerOpcao(idx)} style={{...styles.miniBtn, color: '#FF4D4D'}}><X size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button type="submit" disabled={loading} style={styles.btnSave}>
                  {loading ? 'Salvando...' : editandoId ? '✅ Salvar Alterações' : '➕ Adicionar Produto'}
                </button>
                {editandoId && <button type="button" onClick={cancelarEdicao} style={styles.btnCancel}>Cancelar</button>}
              </div>
            </form>
          </section>

          {/* LISTA DE PRODUTOS LATERAIS */}
          <section style={styles.listArea}>
            {categoriasExistentes.map(cat => (
              <div key={cat} style={{marginBottom: '25px'}}>
                <h3 style={styles.categoryHeader}>{cat}</h3>
                <div style={styles.itemsGrid}>
                  {produtos.filter(p => p.categoria === cat).map(prod => (
                    <div key={prod.id} style={styles.itemCard}>
                      <img src={prod.foto || 'https://via.placeholder.com/50'} style={styles.itemImg} alt="" />
                      <div style={{flex: 1}}>
                        <h4 style={styles.itemName}>{prod.nome}</h4>
                        <span style={styles.itemPrice}>R$ {parseFloat(prod.preco).toFixed(2)}</span>
                      </div>
                      <div style={styles.itemActions}>
                        <button onClick={() => prepararEdicao(prod)} style={styles.btnEdit}><Edit2 size={16} /></button>
                        <button onClick={() => handleExcluir(prod.id)} style={styles.btnDelete}><Trash2 size={16} /></button>
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
  addSaborBox: { marginTop: '10px', marginBottom: '10px' },
  saborInputRow: { display: 'flex', gap: '10px', alignItems: 'center' },
  saborFotoLabel: { width: '42px', height: '42px', borderRadius: '8px', border: '1px solid #10B98144', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', backgroundColor: '#00171A' },
  saborMiniPreview: { width: '100%', height: '100%', objectFit: 'cover' },
  btnAddOpcao: { background: '#10B981', border: 'none', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  opcoesListVertical: { display: 'flex', flexDirection: 'column', gap: '6px' },
  saborBadgeLong: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' },
  saborImgThumb: { width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', backgroundColor: '#000' },
  miniBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', padding: '5px', borderRadius: '4px', color: '#fff', cursor: 'pointer' },
  listArea: { display: 'flex', flexDirection: 'column' },
  categoryHeader: { color: '#4FD1C5', borderLeft: '3px solid #10B981', paddingLeft: '10px', fontSize: '16px', marginBottom: '15px' },
  itemCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' },
  itemImg: { width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' },
  itemName: { color: '#fff', margin: 0, fontSize: '14px' },
  itemPrice: { color: '#10B981', fontWeight: 'bold', fontSize: '13px' },
  itemActions: { display: 'flex', gap: '8px' },
  btnEdit: { background: 'rgba(79, 209, 197, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: '#4FD1C5', cursor: 'pointer' },
  btnDelete: { background: 'rgba(255, 77, 77, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: '#FF4D4D', cursor: 'pointer' },
};

export default Cardapio;