import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db, storage } from './firebase';
import {
  collection, addDoc, onSnapshot, query,
  deleteDoc, doc, serverTimestamp, updateDoc,
  orderBy, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Plus, X, Edit, Trash2, Image as ImageIcon,
  Check, ChevronDown, ChevronUp, Filter,
  Search, Upload
} from 'lucide-react';

const Cardapio = ({ user, isMobile }) => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const [produto, setProduto] = useState({
    nome: '',
    preco: '',
    descricao: '',
    categoria: '',
    ativo: true,
    foto: null,
    complementos: {
      ativo: false,
      tituloGrupo: 'Adicionais',
      qtdMinima: 1,
      qtdMaxima: 1,
      opcoes: []
    }
  });

  const [previewImagem, setPreviewImagem] = useState(null);
  const [novaOpcao, setNovaOpcao] = useState({ nome: '', preco: 0 });

  // Carregar produtos
  useEffect(() => {
    if (!user) return;

    const produtosRef = collection(db, 'estabelecimentos', user.uid, 'cardapio');
    const q = query(produtosRef, orderBy('nome', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProdutos(lista);
    });

    return () => unsubscribe();
  }, [user]);

  // Categorias únicas
  const categorias = ['todas', ...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = !busca || 
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao?.toLowerCase().includes(busca.toLowerCase());
    
    const matchCategoria = categoriaFiltro === 'todas' || p.categoria === categoriaFiltro;
    
    return matchBusca && matchCategoria;
  });

  const handleImageUpload = async (file) => {
    if (!file || !user) return null;
    
    setUploading(true);
    try {
      const timestamp = Date.now();
      const nomeArquivo = `produto_${user.uid}_${timestamp}`;
      const storageRef = ref(storage, `cardapio/${user.uid}/${nomeArquivo}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setUploading(false);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setUploading(false);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Upload da imagem se houver
      let fotoUrl = null;
      if (produto.foto instanceof File) {
        fotoUrl = await handleImageUpload(produto.foto);
      }
      
      const produtoData = {
        nome: produto.nome.trim(),
        preco: parseFloat(produto.preco),
        descricao: produto.descricao.trim(),
        categoria: produto.categoria.trim(),
        ativo: produto.ativo,
        foto: fotoUrl || produto.foto,
        complementos: produto.complementos,
        atualizadoEm: serverTimestamp()
      };

      if (editandoId) {
        // Atualizar
        await updateDoc(
          doc(db, 'estabelecimentos', user.uid, 'cardapio', editandoId),
          produtoData
        );
        alert('Produto atualizado com sucesso!');
      } else {
        // Criar novo
        await addDoc(
          collection(db, 'estabelecimentos', user.uid, 'cardapio'),
          {
            ...produtoData,
            criadoEm: serverTimestamp()
          }
        );
        alert('Produto adicionado com sucesso!');
      }

      resetForm();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      await deleteDoc(doc(db, 'estabelecimentos', user.uid, 'cardapio', id));
      alert('Produto excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto.');
    }
  };

  const handleEdit = (produto) => {
    setEditandoId(produto.id);
    setProduto({
      nome: produto.nome || '',
      preco: produto.preco || '',
      descricao: produto.descricao || '',
      categoria: produto.categoria || '',
      ativo: produto.ativo !== false,
      foto: produto.foto || null,
      complementos: produto.complementos || {
        ativo: false,
        tituloGrupo: 'Adicionais',
        qtdMinima: 1,
        qtdMaxima: 1,
        opcoes: []
      }
    });
    setPreviewImagem(produto.foto || null);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setProduto({
      nome: '',
      preco: '',
      descricao: '',
      categoria: '',
      ativo: true,
      foto: null,
      complementos: {
        ativo: false,
        tituloGrupo: 'Adicionais',
        qtdMinima: 1,
        qtdMaxima: 1,
        opcoes: []
      }
    });
    setPreviewImagem(null);
    setEditandoId(null);
    setMostrarFormulario(false);
    setNovaOpcao({ nome: '', preco: 0 });
  };

  const toggleAtivo = async (id, ativoAtual) => {
    try {
      await updateDoc(
        doc(db, 'estabelecimentos', user.uid, 'cardapio', id),
        { ativo: !ativoAtual, atualizadoEm: serverTimestamp() }
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do produto.');
    }
  };

  const adicionarOpcao = () => {
    if (!novaOpcao.nome.trim()) return;
    
    setProduto(prev => ({
      ...prev,
      complementos: {
        ...prev.complementos,
        opcoes: [...prev.complementos.opcoes, {
          nome: novaOpcao.nome.trim(),
          preco: parseFloat(novaOpcao.preco) || 0
        }]
      }
    }));
    
    setNovaOpcao({ nome: '', preco: 0 });
  };

  const removerOpcao = (index) => {
    setProduto(prev => ({
      ...prev,
      complementos: {
        ...prev.complementos,
        opcoes: prev.complementos.opcoes.filter((_, i) => i !== index)
      }
    }));
  };

  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      flexWrap: 'wrap',
      gap: '20px'
    },
    title: { color: '#4FD1C5', fontSize: '28px' },
    btnNovo: {
      backgroundColor: '#4FD1C5',
      color: '#00171A',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    filtros: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    searchInput: {
      flex: 1,
      minWidth: '200px',
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      backgroundColor: 'rgba(0, 35, 40, 0.6)',
      color: 'white',
      fontSize: '14px'
    },
    categoriaSelect: {
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      backgroundColor: 'rgba(0, 35, 40, 0.6)',
      color: 'white',
      minWidth: '150px'
    },
    formCard: {
      backgroundColor: 'rgba(0, 35, 40, 0.8)',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      borderRadius: '12px',
      padding: '30px',
      marginBottom: '30px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: { color: '#81E6D9', fontSize: '14px', fontWeight: '500' },
    input: {
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      backgroundColor: 'rgba(0, 23, 26, 0.8)',
      color: 'white',
      fontSize: '14px'
    },
    textarea: {
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      backgroundColor: 'rgba(0, 23, 26, 0.8)',
      color: 'white',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical'
    },
    uploadArea: {
      border: '2px dashed rgba(79, 209, 197, 0.3)',
      borderRadius: '12px',
      padding: '40px 20px',
      textAlign: 'center',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 23, 26, 0.5)',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: '#4FD1C5',
        backgroundColor: 'rgba(79, 209, 197, 0.05)'
      }
    },
    imagePreview: {
      width: '100%',
      maxWidth: '200px',
      height: '200px',
      objectFit: 'cover',
      borderRadius: '8px',
      margin: '0 auto'
    },
    complementosSection: {
      padding: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '8px',
      marginTop: '20px'
    },
    opcoesList: {
      marginTop: '15px'
    },
    opcaoItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '6px',
      marginBottom: '8px'
    },
    formActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '30px',
      paddingTop: '20px',
      borderTop: '1px solid rgba(79, 209, 197, 0.1)'
    },
    btnSalvar: {
      backgroundColor: '#4FD1C5',
      color: '#00171A',
      border: 'none',
      padding: '12px 30px',
      borderRadius: '8px',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '16px'
    },
    btnCancelar: {
      backgroundColor: 'transparent',
      color: '#A0AEC0',
      border: '1px solid rgba(79, 209, 197, 0.3)',
      padding: '12px 30px',
      borderRadius: '8px',
      cursor: 'pointer'
    },
    produtosGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px'
    },
    produtoCard: {
      backgroundColor: 'rgba(0, 35, 40, 0.6)',
      border: '1px solid rgba(79, 209, 197, 0.12)',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'transform 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        borderColor: 'rgba(79, 209, 197, 0.3)'
      }
    },
    produtoImage: {
      width: '100%',
      height: '180px',
      objectFit: 'cover',
      backgroundColor: 'rgba(0, 0, 0, 0.2)'
    },
    produtoContent: {
      padding: '20px'
    },
    produtoNome: {
      color: '#4FD1C5',
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    produtoDescricao: {
      color: '#A0AEC0',
      fontSize: '14px',
      marginBottom: '12px',
      minHeight: '40px'
    },
    produtoPreco: {
      color: '#10B981',
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '15px'
    },
    produtoActions: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    badgeCategoria: {
      backgroundColor: 'rgba(79, 209, 197, 0.1)',
      color: '#81E6D9',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600'
    },
    btnAcao: {
      padding: '8px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    btnEditar: {
      backgroundColor: 'rgba(79, 209, 197, 0.1)',
      color: '#4FD1C5'
    },
    btnExcluir: {
      backgroundColor: 'rgba(245, 101, 101, 0.1)',
      color: '#F56565'
    },
    statusToggle: {
      position: 'relative',
      width: '44px',
      height: '24px',
      backgroundColor: '#10B981',
      borderRadius: '12px',
      cursor: 'pointer'
    },
    toggleKnob: {
      position: 'absolute',
      top: '2px',
      left: '2px',
      width: '20px',
      height: '20px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: 'transform 0.3s ease'
    }
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        {/* Cabeçalho */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📋 Gerenciar Cardápio</h1>
            <p style={{ color: '#81E6D9', opacity: 0.8 }}>
              {produtos.length} produtos cadastrados
            </p>
          </div>
          
          <button
            style={styles.btnNovo}
            onClick={() => {
              resetForm();
              setMostrarFormulario(!mostrarFormulario);
            }}
          >
            {mostrarFormulario ? '✕ Fechar' : '➕ Novo Produto'}
          </button>
        </div>

        {/* Formulário (condicional) */}
        {mostrarFormulario && (
          <div style={styles.formCard}>
            <h2 style={{ color: '#4FD1C5', marginBottom: '25px' }}>
              {editandoId ? '✏️ Editar Produto' : '✨ Novo Produto'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                {/* Informações Básicas */}
                <div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nome do Produto *</label>
                    <input
                      style={styles.input}
                      value={produto.nome}
                      onChange={(e) => setProduto({ ...produto, nome: e.target.value })}
                      placeholder="Ex: Pizza Margherita"
                      required
                    />
                  </div>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Preço (R$) *</label>
                    <input
                      style={styles.input}
                      type="number"
                      step="0.01"
                      min="0"
                      value={produto.preco}
                      onChange={(e) => setProduto({ ...produto, preco: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Categoria</label>
                    <input
                      style={styles.input}
                      value={produto.categoria}
                      onChange={(e) => setProduto({ ...produto, categoria: e.target.value })}
                      placeholder="Ex: Pizzas, Lanches, Bebidas"
                      list="categorias"
                    />
                    <datalist id="categorias">
                      {categorias.filter(c => c !== 'todas').map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>
                
                {/* Descrição e Imagem */}
                <div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Descrição</label>
                    <textarea
                      style={styles.textarea}
                      value={produto.descricao}
                      onChange={(e) => setProduto({ ...produto, descricao: e.target.value })}
                      placeholder="Descreva o produto..."
                    />
                  </div>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Foto do Produto</label>
                    <div style={styles.uploadArea}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="imageUpload"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setProduto({ ...produto, foto: file });
                            setPreviewImagem(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <label htmlFor="imageUpload" style={{ cursor: 'pointer' }}>
                        {previewImagem ? (
                          <img 
                            src={previewImagem} 
                            alt="Preview" 
                            style={styles.imagePreview}
                          />
                        ) : (
                          <>
                            <Upload size={40} color="#4FD1C5" />
                            <div style={{ marginTop: '10px', color: '#81E6D9' }}>
                              Clique para selecionar uma imagem
                            </div>
                            <div style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '5px' }}>
                              Recomendado: 800x600px
                            </div>
                          </>
                        )}
                      </label>
                      {previewImagem && (
                        <button
                          type="button"
                          onClick={() => {
                            setProduto({ ...produto, foto: null });
                            setPreviewImagem(null);
                          }}
                          style={{
                            marginTop: '10px',
                            color: '#F56565',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Remover imagem
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Complementos */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={styles.complementosSection}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ ...styles.label, marginBottom: 0 }}>
                        <input
                          type="checkbox"
                          checked={produto.complementos.ativo}
                          onChange={(e) => setProduto({
                            ...produto,
                            complementos: { ...produto.complementos, ativo: e.target.checked }
                          })}
                          style={{ marginRight: '10px' }}
                        />
                        Adicionar opções de complemento
                      </label>
                    </div>
                    
                    {produto.complementos.ativo && (
                      <div>
                        <div style={{ marginTop: '15px' }}>
                          <div style={styles.inputGroup}>
                            <label style={styles.label}>Título do Grupo de Opções</label>
                            <input
                              style={styles.input}
                              value={produto.complementos.tituloGrupo}
                              onChange={(e) => setProduto({
                                ...produto,
                                complementos: { ...produto.complementos, tituloGrupo: e.target.value }
                              })}
                              placeholder="Ex: Escolha os adicionais"
                            />
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                            <div style={styles.inputGroup}>
                              <label style={styles.label}>Quantidade Mínima</label>
                              <input
                                style={styles.input}
                                type="number"
                                min="0"
                                value={produto.complementos.qtdMinima}
                                onChange={(e) => setProduto({
                                  ...produto,
                                  complementos: { ...produto.complementos, qtdMinima: parseInt(e.target.value) || 0 }
                                })}
                              />
                            </div>
                            
                            <div style={styles.inputGroup}>
                              <label style={styles.label}>Quantidade Máxima</label>
                              <input
                                style={styles.input}
                                type="number"
                                min="1"
                                value={produto.complementos.qtdMaxima}
                                onChange={(e) => setProduto({
                                  ...produto,
                                  complementos: { ...produto.complementos, qtdMaxima: parseInt(e.target.value) || 1 }
                                })}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Adicionar opções */}
                        <div style={{ marginTop: '20px' }}>
                          <h4 style={{ color: '#81E6D9', marginBottom: '10px' }}>Opções Disponíveis</h4>
                          
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                              style={{ ...styles.input, flex: 1 }}
                              placeholder="Nome da opção (ex: Queijo extra)"
                              value={novaOpcao.nome}
                              onChange={(e) => setNovaOpcao({ ...novaOpcao, nome: e.target.value })}
                            />
                            <input
                              style={{ ...styles.input, width: '120px' }}
                              type="number"
                              step="0.01"
                              placeholder="Preço +"
                              value={novaOpcao.preco}
                              onChange={(e) => setNovaOpcao({ ...novaOpcao, preco: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={adicionarOpcao}
                              style={{
                                backgroundColor: '#4FD1C5',
                                color: '#00171A',
                                border: 'none',
                                padding: '0 20px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              Adicionar
                            </button>
                          </div>
                          
                          {/* Lista de opções */}
                          <div style={styles.opcoesList}>
                            {produto.complementos.opcoes.map((opcao, index) => (
                              <div key={index} style={styles.opcaoItem}>
                                <div>
                                  <div style={{ color: 'white', fontWeight: '500' }}>{opcao.nome}</div>
                                  <div style={{ color: '#81E6D9', fontSize: '12px' }}>
                                    + R$ {opcao.preco.toFixed(2)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removerOpcao(index)}
                                  style={{
                                    backgroundColor: 'transparent',
                                    color: '#F56565',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '5px'
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            
                            {produto.complementos.opcoes.length === 0 && (
                              <div style={{ color: '#A0AEC0', textAlign: 'center', padding: '20px' }}>
                                Nenhuma opção adicionada ainda
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Ações do Formulário */}
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
                  disabled={loading || uploading}
                >
                  {loading ? 'Salvando...' : 
                   uploading ? 'Enviando imagem...' : 
                   editandoId ? 'Atualizar Produto' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros */}
        <div style={styles.filtros}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search 
              size={18} 
              color="#A0AEC0" 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)' 
              }} 
            />
            <input
              style={{ ...styles.searchInput, paddingLeft: '40px' }}
              placeholder="Buscar produtos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          
          <select
            style={styles.categoriaSelect}
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            {categorias.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'todas' ? 'Todas as categorias' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Produtos */}
        {produtosFiltrados.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#A0AEC0',
            backgroundColor: 'rgba(0, 35, 40, 0.6)',
            borderRadius: '12px',
            border: '2px dashed rgba(79, 209, 197, 0.1)'
          }}>
            <ImageIcon size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ color: '#81E6D9', marginBottom: '8px' }}>
              {busca || categoriaFiltro !== 'todas' ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
            </h3>
            <p style={{ marginBottom: '20px' }}>
              {busca || categoriaFiltro !== 'todas' 
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando seu primeiro produto!'}
            </p>
            {!busca && categoriaFiltro === 'todas' && (
              <button
                style={styles.btnNovo}
                onClick={() => {
                  resetForm();
                  setMostrarFormulario(true);
                }}
              >
                <Plus size={20} />
                Adicionar Primeiro Produto
              </button>
            )}
          </div>
        ) : (
          <div style={styles.produtosGrid}>
            {produtosFiltrados.map(prod => (
              <div key={prod.id} style={styles.produtoCard}>
                {/* Imagem */}
                <div style={{ position: 'relative' }}>
                  <img
                    src={prod.foto || 'https://via.placeholder.com/300x180?text=Sem+imagem'}
                    alt={prod.nome}
                    style={styles.produtoImage}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x180?text=Sem+imagem';
                    }}
                  />
                  
                  {/* Status */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: prod.ativo ? '#10B981' : '#F56565',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {prod.ativo ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
                
                {/* Conteúdo */}
                <div style={styles.produtoContent}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={styles.produtoNome}>{prod.nome}</h3>
                    {prod.categoria && (
                      <span style={styles.badgeCategoria}>
                        {prod.categoria}
                      </span>
                    )}
                  </div>
                  
                  <p style={styles.produtoDescricao}>
                    {prod.descricao || 'Sem descrição'}
                  </p>
                  
                  <div style={styles.produtoPreco}>
                    R$ {parseFloat(prod.preco).toFixed(2)}
                  </div>
                  
                  {prod.complementos?.ativo && (
                    <div style={{
                      marginBottom: '15px',
                      padding: '8px',
                      backgroundColor: 'rgba(79, 209, 197, 0.05)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#81E6D9'
                    }}>
                      <span>⚙️ {prod.complementos.opcoes.length} opções disponíveis</span>
                    </div>
                  )}
                  
                  {/* Ações */}
                  <div style={styles.produtoActions}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{ ...styles.btnAcao, ...styles.btnEditar }}
                        onClick={() => handleEdit(prod)}
                        title="Editar produto"
                      >
                        <Edit size={18} />
                      </button>
                      
                      <button
                        style={{ ...styles.btnAcao, ...styles.btnExcluir }}
                        onClick={() => handleDelete(prod.id)}
                        title="Excluir produto"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    {/* Toggle Ativo/Inativo */}
                    <div
                      style={{
                        ...styles.statusToggle,
                        backgroundColor: prod.ativo ? '#10B981' : '#CBD5E0'
                      }}
                      onClick={() => toggleAtivo(prod.id, prod.ativo)}
                      title={prod.ativo ? 'Desativar produto' : 'Ativar produto'}
                    >
                      <div
                        style={{
                          ...styles.toggleKnob,
                          transform: prod.ativo ? 'translateX(20px)' : 'translateX(0)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Contador */}
        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: 'rgba(0, 35, 40, 0.6)',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#81E6D9',
          fontSize: '14px'
        }}>
          Mostrando {produtosFiltrados.length} de {produtos.length} produtos
        </div>
      </div>
    </Layout>
  );
};

export default Cardapio;