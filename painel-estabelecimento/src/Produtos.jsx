import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db, storage } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Produtos = ({ user, isMobile }) => {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tabAtiva, setTabAtiva] = useState('lista');
  const [produtoEditando, setProdutoEditando] = useState(null);
  
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    descricao: '',
    preco: '',
    custo: '',
    categoria: '',
    estoque: '',
    estoqueMinimo: '5',
    ativo: true,
    foto: null
  });

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Buscar produtos
    const produtosRef = collection(db, 'estabelecimentos', user.uid, 'cardapio');
    const q = query(produtosRef, orderBy('criadoEm', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaProdutos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProdutos(listaProdutos);

      // Extrair categorias únicas
      const cats = [...new Set(listaProdutos.map(p => p.categoria).filter(Boolean))];
      setCategorias(cats);
    });

    return () => unsubscribe();
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovoProduto({ ...novoProduto, foto: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitProduto = async (e) => {
    e.preventDefault();
    if (!novoProduto.nome || !novoProduto.preco || !novoProduto.categoria) {
      alert("Preencha nome, preço e categoria");
      return;
    }

    setLoading(true);
    try {
      let urlImagem = null;
      if (novoProduto.foto) {
        const nomeArquivo = `${Date.now()}_${novoProduto.foto.name}`;
        const storageRef = ref(storage, `produtos/${user.uid}/${nomeArquivo}`);
        const uploadResult = await uploadBytes(storageRef, novoProduto.foto);
        urlImagem = await getDownloadURL(uploadResult.ref);
      }

      const produtoData = {
        nome: novoProduto.nome,
        descricao: novoProduto.descricao,
        preco: parseFloat(novoProduto.preco),
        custo: parseFloat(novoProduto.custo) || 0,
        categoria: novoProduto.categoria,
        estoque: parseInt(novoProduto.estoque) || 0,
        estoqueMinimo: parseInt(novoProduto.estoqueMinimo) || 5,
        ativo: novoProduto.ativo,
        foto: urlImagem,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      if (produtoEditando) {
        // Atualizar produto existente
        await updateDoc(doc(db, 'estabelecimentos', user.uid, 'cardapio', produtoEditando.id), produtoData);
      } else {
        // Criar novo produto
        await addDoc(collection(db, 'estabelecimentos', user.uid, 'cardapio'), produtoData);
      }

      resetForm();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (produtoId, ativoAtual) => {
    try {
      await updateDoc(doc(db, 'estabelecimentos', user.uid, 'cardapio', produtoId), {
        ativo: !ativoAtual,
        atualizadoEm: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleDeleteProduto = async (produtoId) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteDoc(doc(db, 'estabelecimentos', user.uid, 'cardapio', produtoId));
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
      }
    }
  };

  const handleEditProduto = (produto) => {
    setProdutoEditando(produto);
    setNovoProduto({
      nome: produto.nome,
      descricao: produto.descricao || '',
      preco: produto.preco.toString(),
      custo: produto.custo?.toString() || '',
      categoria: produto.categoria || '',
      estoque: produto.estoque?.toString() || '',
      estoqueMinimo: produto.estoqueMinimo?.toString() || '5',
      ativo: produto.ativo !== false,
      foto: null
    });
    setPreview(produto.foto || null);
    setTabAtiva('cadastro');
  };

  const resetForm = () => {
    setNovoProduto({
      nome: '',
      descricao: '',
      preco: '',
      custo: '',
      categoria: '',
      estoque: '',
      estoqueMinimo: '5',
      ativo: true,
      foto: null
    });
    setPreview(null);
    setProdutoEditando(null);
    setTabAtiva('lista');
  };

  const produtosComAlertaEstoque = produtos.filter(p => 
    p.estoque <= p.estoqueMinimo
  );

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>🍔 Gestão de Produtos</h1>
            <p style={styles.subtitle}>
              Cadastre produtos, controle estoque e gerencie ficha técnica
            </p>
          </div>
          <div style={styles.headerActions}>
            <button 
              style={styles.btnNovo}
              onClick={() => {
                resetForm();
                setTabAtiva('cadastro');
              }}
            >
              <span style={{ marginRight: '8px' }}>➕</span>
              Novo Produto
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(tabAtiva === 'lista' ? styles.tabButtonActive : {})
            }}
            onClick={() => setTabAtiva('lista')}
          >
            📋 Lista de Produtos
            {produtosComAlertaEstoque.length > 0 && (
              <span style={styles.tabAlert}>{produtosComAlertaEstoque.length}</span>
            )}
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(tabAtiva === 'cadastro' ? styles.tabButtonActive : {})
            }}
            onClick={() => setTabAtiva('cadastro')}
          >
            {produtoEditando ? '✏️ Editar Produto' : '➕ Cadastrar Produto'}
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(tabAtiva === 'categorias' ? styles.tabButtonActive : {})
            }}
            onClick={() => setTabAtiva('categorias')}
          >
            🏷️ Categorias
          </button>
        </div>

        {/* Conteúdo das Tabs */}
        {tabAtiva === 'cadastro' && (
          <div style={styles.formContainer}>
            <form onSubmit={handleSubmitProduto} style={styles.form}>
              <div style={styles.formGrid}>
                {/* Upload de Foto */}
                <div style={styles.uploadSection}>
                  <h3 style={styles.sectionTitle}>📸 Foto do Produto</h3>
                  <div style={styles.uploadArea}>
                    {preview ? (
                      <div style={styles.previewContainer}>
                        <img src={preview} alt="Preview" style={styles.imagePreview} />
                        <button 
                          type="button"
                          style={styles.btnRemoverFoto}
                          onClick={() => {
                            setPreview(null);
                            setNovoProduto({ ...novoProduto, foto: null });
                          }}
                        >
                          ✕ Remover
                        </button>
                      </div>
                    ) : (
                      <label style={styles.uploadLabel}>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange} 
                          style={{ display: 'none' }} 
                        />
                        <div style={styles.uploadIcon}>📷</div>
                        <span style={styles.uploadText}>Clique para adicionar foto</span>
                        <span style={styles.uploadHint}>Recomendado: 800x600px</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Informações Básicas */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>📝 Informações Básicas</h3>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nome do Produto *</label>
                    <input
                      style={styles.input}
                      placeholder="Ex: Pizza Calabresa"
                      value={novoProduto.nome}
                      onChange={(e) => setNovoProduto({...novoProduto, nome: e.target.value})}
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Categoria *</label>
                    <input
                      list="categorias-list"
                      style={styles.input}
                      placeholder="Selecione ou digite uma nova"
                      value={novoProduto.categoria}
                      onChange={(e) => setNovoProduto({...novoProduto, categoria: e.target.value})}
                      required
                    />
                    <datalist id="categorias-list">
                      {categorias.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Descrição</label>
                    <textarea
                      style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                      placeholder="Ingredientes, detalhes..."
                      value={novoProduto.descricao}
                      onChange={(e) => setNovoProduto({...novoProduto, descricao: e.target.value})}
                    />
                  </div>

                  <div style={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={novoProduto.ativo}
                      onChange={(e) => setNovoProduto({...novoProduto, ativo: e.target.checked})}
                    />
                    <label htmlFor="ativo" style={styles.checkboxLabel}>
                      Produto disponível para venda
                    </label>
                  </div>
                </div>

                {/* Preços e Custos */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>💰 Preços e Custos</h3>
                  
                  <div style={styles.inputGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Preço de Venda (R$) *</label>
                      <input
                        style={styles.input}
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={novoProduto.preco}
                        onChange={(e) => setNovoProduto({...novoProduto, preco: e.target.value})}
                        required
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Custo Unitário (R$)</label>
                      <input
                        style={styles.input}
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={novoProduto.custo}
                        onChange={(e) => setNovoProduto({...novoProduto, custo: e.target.value})}
                      />
                    </div>
                  </div>

                  {novoProduto.preco && novoProduto.custo && (
                    <div style={styles.marginInfo}>
                      <div style={styles.marginItem}>
                        <span>Margem de Lucro:</span>
                        <span style={styles.marginValue}>
                          R$ {(parseFloat(novoProduto.preco) - parseFloat(novoProduto.custo || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div style={styles.marginItem}>
                        <span>Porcentagem:</span>
                        <span style={styles.marginValue}>
                          {((parseFloat(novoProduto.preco) - parseFloat(novoProduto.custo || 0)) / parseFloat(novoProduto.custo || 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controle de Estoque */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>📦 Controle de Estoque</h3>
                  
                  <div style={styles.inputGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Estoque Atual</label>
                      <input
                        style={styles.input}
                        type="number"
                        placeholder="0"
                        value={novoProduto.estoque}
                        onChange={(e) => setNovoProduto({...novoProduto, estoque: e.target.value})}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Estoque Mínimo</label>
                      <input
                        style={styles.input}
                        type="number"
                        placeholder="5"
                        value={novoProduto.estoqueMinimo}
                        onChange={(e) => setNovoProduto({...novoProduto, estoqueMinimo: e.target.value})}
                      />
                    </div>
                  </div>

                  {novoProduto.estoque && novoProduto.estoqueMinimo && (
                    <div style={{
                      ...styles.estoqueAlerta,
                      backgroundColor: parseInt(novoProduto.estoque) <= parseInt(novoProduto.estoqueMinimo) 
                        ? 'rgba(245, 101, 101, 0.1)' 
                        : 'rgba(72, 187, 120, 0.1)',
                      borderColor: parseInt(novoProduto.estoque) <= parseInt(novoProduto.estoqueMinimo) 
                        ? '#F56565' 
                        : '#48BB78'
                    }}>
                      {parseInt(novoProduto.estoque) <= parseInt(novoProduto.estoqueMinimo) ? (
                        <>
                          <span style={{color: '#F56565'}}>⚠️ ALERTA:</span> 
                          <span> Estoque abaixo do mínimo</span>
                        </>
                      ) : (
                        <>
                          <span style={{color: '#48BB78'}}>✅ OK:</span> 
                          <span> Estoque suficiente</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.btnCancelar}
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={styles.btnSalvar}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : produtoEditando ? 'Atualizar Produto' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tabAtiva === 'lista' && (
          <div style={styles.listaContainer}>
            {/* Alertas de Estoque */}
            {produtosComAlertaEstoque.length > 0 && (
              <div style={styles.alertaEstoque}>
                <div style={styles.alertaHeader}>
                  <span style={styles.alertaIcon}>⚠️</span>
                  <strong>Alertas de Estoque Baixo</strong>
                  <span style={styles.alertaCount}>{produtosComAlertaEstoque.length}</span>
                </div>
                <div style={styles.alertaProdutos}>
                  {produtosComAlertaEstoque.map(produto => (
                    <div key={produto.id} style={styles.alertaItem}>
                      <span>{produto.nome}</span>
                      <span style={styles.estoqueBaixo}>
                        Estoque: {produto.estoque} (mín: {produto.estoqueMinimo})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de Produtos */}
            <div style={styles.produtosGrid}>
              {produtos.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🍴</div>
                  <h3 style={styles.emptyTitle}>Nenhum produto cadastrado</h3>
                  <p style={styles.emptyText}>
                    Comece cadastrando seu primeiro produto!
                  </p>
                  <button 
                    style={styles.btnCadastrarPrimeiro}
                    onClick={() => setTabAtiva('cadastro')}
                  >
                    ➕ Cadastrar Primeiro Produto
                  </button>
                </div>
              ) : (
                produtos.map(produto => (
                  <div key={produto.id} style={styles.produtoCard}>
                    <div style={styles.produtoImagem}>
                      {produto.foto ? (
                        <img src={produto.foto} alt={produto.nome} style={styles.produtoFoto} />
                      ) : (
                        <div style={styles.produtoSemFoto}>🍔</div>
                      )}
                      <button
                        style={{
                          ...styles.btnStatus,
                          backgroundColor: produto.ativo ? '#48BB78' : '#F56565'
                        }}
                        onClick={() => handleToggleAtivo(produto.id, produto.ativo)}
                        title={produto.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {produto.ativo ? '✅' : '❌'}
                      </button>
                    </div>

                    <div style={styles.produtoInfo}>
                      <div style={styles.produtoHeader}>
                        <h4 style={styles.produtoNome}>{produto.nome}</h4>
                        <span style={styles.produtoCategoria}>{produto.categoria}</span>
                      </div>
                      
                      <p style={styles.produtoDescricao}>
                        {produto.descricao || 'Sem descrição'}
                      </p>

                      <div style={styles.produtoDetalhes}>
                        <div style={styles.detalheItem}>
                          <span>💰</span>
                          <span>R$ {typeof produto.preco === 'number' ? produto.preco.toFixed(2) : parseFloat(produto.preco || 0).toFixed(2)}</span>
                          {produto.custo && (
                            <span style={styles.custoLabel}>
                              (Custo: R$ {produto.custo.toFixed(2)})
                            </span>
                          )}
                        </div>
                        
                        <div style={styles.detalheItem}>
                          <span>📦</span>
                          <span style={{
                            color: produto.estoque <= produto.estoqueMinimo ? '#F56565' : '#81E6D9'
                          }}>
                            Estoque: {produto.estoque || 0}
                            {produto.estoqueMinimo && ` (mín: ${produto.estoqueMinimo})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.produtoAcoes}>
                      <button
                        style={styles.btnEditar}
                        onClick={() => handleEditProduto(produto)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        style={styles.btnExcluir}
                        onClick={() => handleDeleteProduto(produto.id)}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tabAtiva === 'categorias' && (
          <div style={styles.categoriasContainer}>
            <h3 style={styles.sectionTitle}>🏷️ Gerenciar Categorias</h3>
            <p style={styles.categoriasDesc}>
              Categorias disponíveis nos seus produtos
            </p>
            
            <div style={styles.categoriasGrid}>
              {categorias.length === 0 ? (
                <div style={styles.emptyCategorias}>
                  <span>🏷️</span>
                  <p>Nenhuma categoria cadastrada</p>
                </div>
              ) : (
                categorias.map(categoria => {
                  const produtosNaCategoria = produtos.filter(p => p.categoria === categoria);
                  
                  return (
                    <div key={categoria} style={styles.categoriaCard}>
                      <div style={styles.categoriaHeader}>
                        <h4 style={styles.categoriaNome}>{categoria}</h4>
                        <span style={styles.categoriaCount}>
                          {produtosNaCategoria.length} produtos
                        </span>
                      </div>
                      
                      <div style={styles.categoriaProdutos}>
                        {produtosNaCategoria.slice(0, 3).map(produto => (
                          <div key={produto.id} style={styles.categoriaProduto}>
                            <span>{produto.nome}</span>
                            <span style={styles.produtoPreco}>
                              R$ {produto.preco?.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {produtosNaCategoria.length > 3 && (
                          <div style={styles.categoriaMais}>
                            +{produtosNaCategoria.length - 3} produtos
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: '30px', 
    paddingBottom: '20px', 
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)' 
  },
  title: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  headerActions: { display: 'flex', gap: '12px' },
  btnNovo: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  tabButton: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    color: '#A0AEC0',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  tabButtonActive: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    borderColor: '#4FD1C5'
  },
  tabAlert: {
    backgroundColor: '#F56565',
    color: 'white',
    fontSize: '12px',
    borderRadius: '10px',
    padding: '2px 8px',
    marginLeft: '4px'
  },
  formContainer: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px'
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  sectionTitle: {
    color: '#4FD1C5',
    fontSize: '16px',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  uploadSection: {
    gridColumn: '1 / -1'
  },
  uploadArea: {
    border: '2px dashed rgba(79, 209, 197, 0.3)',
    borderRadius: '10px',
    padding: '30px',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease'
  },
  uploadLabel: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  },
  uploadIcon: {
    fontSize: '50px',
    color: '#81E6D9'
  },
  uploadText: {
    color: '#4FD1C5',
    fontSize: '16px'
  },
  uploadHint: {
    color: '#A0AEC0',
    fontSize: '12px'
  },
  previewContainer: {
    position: 'relative',
    maxWidth: '300px',
    margin: '0 auto'
  },
  imagePreview: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  btnRemoverFoto: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(245, 101, 101, 0.9)',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: '#81E6D9',
    fontSize: '14px',
    fontWeight: '500'
  },
  input: {
    backgroundColor: 'rgba(0, 23, 26, 0.8)',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    color: '#fff',
    outline: 'none',
    fontSize: '14px'
  },
  inputGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '10px'
  },
  checkboxLabel: {
    color: '#81E6D9',
    fontSize: '14px',
    cursor: 'pointer'
  },
  marginInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '10px'
  },
  marginItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#A0AEC0',
    fontSize: '14px',
    marginBottom: '5px'
  },
  marginValue: {
    color: '#F6E05E',
    fontWeight: 'bold'
  },
  estoqueAlerta: {
    border: '1px solid',
    padding: '12px',
    borderRadius: '8px',
    marginTop: '10px',
    fontSize: '14px'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(79, 209, 197, 0.08)'
  },
  btnCancelar: {
    backgroundColor: 'transparent',
    color: '#A0AEC0',
    border: '1px solid rgba(79, 209, 197, 0.3)',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnSalvar: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px'
  },
  listaContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  alertaEstoque: {
    backgroundColor: 'rgba(245, 101, 101, 0.1)',
    border: '1px solid rgba(245, 101, 101, 0.3)',
    borderRadius: '12px',
    padding: '20px'
  },
  alertaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#F56565',
    marginBottom: '15px',
    fontSize: '16px'
  },
  alertaIcon: {
    fontSize: '20px'
  },
  alertaCount: {
    backgroundColor: '#F56565',
    color: 'white',
    fontSize: '12px',
    borderRadius: '10px',
    padding: '2px 8px',
    marginLeft: 'auto'
  },
  alertaProdutos: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  alertaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
    color: '#A0AEC0',
    fontSize: '14px'
  },
  estoqueBaixo: {
    color: '#F56565',
    fontWeight: 'bold'
  },
  produtosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  produtoCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  produtoImagem: {
    position: 'relative',
    height: '150px'
  },
  produtoFoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  produtoSemFoto: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '50px'
  },
  btnStatus: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  produtoInfo: {
    padding: '20px'
  },
  produtoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  produtoNome: {
    color: '#4FD1C5',
    fontSize: '18px',
    margin: 0,
    flex: 1
  },
  produtoCategoria: {
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    color: '#4FD1C5',
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '4px',
    marginLeft: '10px'
  },
  produtoDescricao: {
    color: '#A0AEC0',
    fontSize: '14px',
    marginBottom: '15px',
    lineHeight: '1.4'
  },
  produtoDetalhes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  detalheItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#81E6D9',
    fontSize: '14px'
  },
  custoLabel: {
    color: '#A0AEC0',
    fontSize: '12px',
    marginLeft: 'auto'
  },
  produtoAcoes: {
    display: 'flex',
    padding: '15px 20px',
    borderTop: '1px solid rgba(79, 209, 197, 0.08)',
    gap: '10px'
  },
  btnEditar: {
    flex: 1,
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    color: '#4FD1C5',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px'
  },
  btnExcluir: {
    flex: 1,
    backgroundColor: 'rgba(245, 101, 101, 0.1)',
    color: '#F56565',
    border: '1px solid rgba(245, 101, 101, 0.2)',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    color: '#A0AEC0'
  },
  emptyIcon: {
    fontSize: '60px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '20px',
    marginBottom: '10px',
    color: '#81E6D9'
  },
  emptyText: {
    fontSize: '14px',
    marginBottom: '20px'
  },
  btnCadastrarPrimeiro: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px'
  },
  categoriasContainer: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px'
  },
  categoriasDesc: {
    color: '#A0AEC0',
    marginBottom: '30px'
  },
  categoriasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px'
  },
  categoriaCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(79, 209, 197, 0.08)',
    borderRadius: '8px',
    padding: '20px'
  },
  categoriaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  categoriaNome: {
    color: '#4FD1C5',
    fontSize: '16px',
    margin: 0
  },
  categoriaCount: {
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    color: '#4FD1C5',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  categoriaProdutos: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  categoriaProduto: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#A0AEC0'
  },
  produtoPreco: {
    color: '#F6E05E',
    fontWeight: 'bold'
  },
  categoriaMais: {
    textAlign: 'center',
    color: '#718096',
    fontSize: '11px',
    fontStyle: 'italic',
    marginTop: '5px'
  },
  emptyCategorias: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px 20px',
    color: '#A0AEC0'
  }
};

export default Produtos;