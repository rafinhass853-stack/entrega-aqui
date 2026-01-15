import React, { useState, useEffect } from 'react';
import { Layout } from './Menu'; 
import { db, auth, storage } from './firebase'; 
import { 
  collection, addDoc, onSnapshot, query, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Cardapio = ({ isMobile }) => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    preco: '',
    descricao: '',
    categoria: '', // Agora começa vazio para o cliente digitar
    foto: null
  });
  const [preview, setPreview] = useState(null);

  // 1. CARREGAR PRODUTOS EM TEMPO REAL
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaProdutos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProdutos(listaProdutos);
    });

    return () => unsubscribe();
  }, []);

  // Extrai categorias únicas já existentes para sugerir ao digitar
  const categoriasExistentes = [...new Set(produtos.map(p => p.categoria))].filter(Boolean);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovoProduto({ ...novoProduto, foto: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAddProduto = async (e) => {
    e.preventDefault();
    if (!novoProduto.nome || !novoProduto.preco || !novoProduto.categoria) {
      alert("Por favor, preencha Nome, Preço e Categoria");
      return;
    }

    setLoading(true);
    try {
      let urlImagem = null;
      if (novoProduto.foto) {
        const nomeArquivo = `${Date.now()}_${novoProduto.foto.name}`;
        const storageRef = ref(storage, `cardapios/${auth.currentUser.uid}/${nomeArquivo}`);
        const uploadResult = await uploadBytes(storageRef, novoProduto.foto);
        urlImagem = await getDownloadURL(uploadResult.ref);
      }

      const itemParaSalvar = {
        nome: novoProduto.nome,
        preco: novoProduto.preco,
        descricao: novoProduto.descricao,
        categoria: novoProduto.categoria.trim(), // Salva a categoria digitada
        foto: urlImagem,
        criadoEm: serverTimestamp()
      };

      await addDoc(collection(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio'), itemParaSalvar);

      // Limpa preservando a categoria se quiser cadastrar vários itens na mesma
      setNovoProduto({ ...novoProduto, nome: '', preco: '', descricao: '', foto: null });
      setPreview(null);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar no Firebase.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduto = async (id) => {
    if (window.confirm("Deseja excluir este item?")) {
      try {
        await deleteDoc(doc(db, 'estabelecimentos', auth.currentUser.uid, 'cardapio', id));
      } catch (error) {
        console.error("Erro ao remover:", error);
      }
    }
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>📋 Gerenciar Cardápio</h1>
          <p style={styles.subtitle}>Crie suas próprias categorias e organize seus itens</p>
        </header>

        <div style={styles.grid}>
          {/* Formulário de Cadastro */}
          <section style={styles.formCard}>
            <h3 style={styles.cardTitle}>Novo Produto</h3>
            <form onSubmit={handleAddProduto} style={styles.form}>
              <div style={styles.uploadArea}>
                {preview ? (
                  <img src={preview} alt="Preview" style={styles.imagePreview} />
                ) : (
                  <label style={styles.uploadLabel}>
                    <span style={{fontSize: '30px'}}>📸</span>
                    <span>Adicionar Foto</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Categoria (Crie ou Selecione)</label>
                <input 
                  list="categorias-list"
                  style={styles.input}
                  placeholder="Ex: Pizzas, Bebidas, Promoções..."
                  value={novoProduto.categoria}
                  onChange={(e) => setNovoProduto({...novoProduto, categoria: e.target.value})}
                />
                <datalist id="categorias-list">
                  {categoriasExistentes.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nome do Produto</label>
                <input 
                  style={styles.input} 
                  placeholder="Ex: Pizza Calabresa" 
                  value={novoProduto.nome}
                  onChange={(e) => setNovoProduto({...novoProduto, nome: e.target.value})}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Preço (R$)</label>
                <input 
                  style={styles.input} 
                  type="number" step="0.01" 
                  placeholder="0,00" 
                  value={novoProduto.preco}
                  onChange={(e) => setNovoProduto({...novoProduto, preco: e.target.value})}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Descrição</label>
                <textarea 
                  style={{...styles.input, height: '60px', resize: 'none'}} 
                  placeholder="Ingredientes e detalhes..." 
                  value={novoProduto.descricao}
                  onChange={(e) => setNovoProduto({...novoProduto, descricao: e.target.value})}
                />
              </div>

              <button type="submit" disabled={loading} style={styles.btnSave}>
                {loading ? 'Salvando...' : 'Adicionar ao Cardápio'}
              </button>
            </form>
          </section>

          {/* Lista Organizada por Categorias Criadas pelo Cliente */}
          <section style={styles.listArea}>
            {categoriasExistentes.length === 0 && (
              <p style={{color: '#A0AEC0', textAlign: 'center'}}>Nenhum item cadastrado ainda.</p>
            )}
            
            {categoriasExistentes.map(cat => (
              <div key={cat} style={{marginBottom: '30px'}}>
                <h3 style={styles.categoryHeader}>{cat}</h3>
                <div style={styles.itemsGrid}>
                  {produtos.filter(p => p.categoria === cat).map(prod => (
                    <div key={prod.id} style={styles.itemCard}>
                      <div style={styles.itemImageArea}>
                        {prod.foto ? <img src={prod.foto} style={styles.itemImg} alt={prod.nome} /> : <span>🍴</span>}
                      </div>
                      <div style={styles.itemInfo}>
                        <h4 style={styles.itemName}>{prod.nome}</h4>
                        <p style={styles.itemDesc}>{prod.descricao}</p>
                        <span style={styles.itemPrice}>R$ {parseFloat(prod.preco || 0).toFixed(2)}</span>
                      </div>
                      <button onClick={() => handleRemoveProduto(prod.id)} style={styles.btnDelete}>🗑️</button>
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
  container: { maxWidth: '1200px', margin: '0 auto' },
  header: { marginBottom: '30px' },
  title: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' },
  formCard: { backgroundColor: 'rgba(0, 35, 40, 0.6)', padding: '24px', borderRadius: '15px', border: '1px solid rgba(79, 209, 197, 0.15)' },
  cardTitle: { color: '#4FD1C5', marginBottom: '20px', fontSize: '18px' },
  categoryHeader: { color: '#4FD1C5', borderBottom: '2px solid rgba(79, 209, 197, 0.3)', paddingBottom: '8px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '16px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  uploadArea: { height: '130px', border: '2px dashed rgba(79, 209, 197, 0.3)', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: 'rgba(0,0,0,0.2)' },
  uploadLabel: { cursor: 'pointer', textAlign: 'center', color: '#81E6D9', display: 'flex', flexDirection: 'column' },
  imagePreview: { width: '100%', height: '100%', objectFit: 'cover' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { color: '#81E6D9', fontSize: '14px' },
  input: { backgroundColor: 'rgba(0, 23, 26, 0.8)', border: '1px solid rgba(79, 209, 197, 0.2)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' },
  btnSave: { backgroundColor: '#4FD1C5', color: '#00171A', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  itemsGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  itemCard: { backgroundColor: 'rgba(0, 35, 40, 0.4)', padding: '12px', borderRadius: '12px', display: 'flex', gap: '15px', alignItems: 'center', border: '1px solid rgba(79, 209, 197, 0.05)' },
  itemImageArea: { width: '60px', height: '60px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemImg: { width: '100%', height: '100%', objectFit: 'cover' },
  itemInfo: { flex: 1 },
  itemName: { color: '#4FD1C5', fontSize: '16px', margin: '0 0 4px 0' },
  itemDesc: { color: '#A0AEC0', fontSize: '12px', margin: 0 },
  itemPrice: { color: '#F6E05E', fontWeight: 'bold', fontSize: '14px' },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '18px' }
};

export default Cardapio;