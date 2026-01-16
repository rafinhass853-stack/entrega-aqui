import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { Search, Star, ChevronRight, ArrowLeft } from 'lucide-react';

const PaginaInicialCliente = () => {
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState(null);
  const [cardapio, setCardapio] = useState([]);
  const [pesquisa, setPesquisa] = useState('');

  // 1. BUSCA TODOS OS ESTABELECIMENTOS CADASTRADOS
  useEffect(() => {
    // Referência direta para a coleção que vimos no seu console
    const q = query(collection(db, 'estabelecimentos'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Lojas encontradas:", lista); // Verifique o console do navegador (F12)
      setEstabelecimentos(lista);
    }, (error) => {
      console.error("Erro ao buscar lojas:", error);
    });

    return () => unsubscribe();
  }, []);

  // 2. BUSCA O CARDÁPIO DA LOJA SELECIONADA
  useEffect(() => {
    if (!estabelecimentoSelecionado) return;

    // Acessa a subcoleção 'cardapio' que vimos na sua imagem do Firebase
    const q = query(collection(db, 'estabelecimentos', estabelecimentoSelecionado.id, 'cardapio'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCardapio(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [estabelecimentoSelecionado]);

  // --- VISÃO DO CARDÁPIO (DETALHES) ---
  if (estabelecimentoSelecionado) {
    return (
      <div style={styles.container}>
        <header style={styles.headerSimples}>
          <button onClick={() => setEstabelecimentoSelecionado(null)} style={styles.btnBack}>
            <ArrowLeft size={24} color="#1A202C" />
          </button>
          <h2 style={styles.titleNav}>{estabelecimentoSelecionado.cliente}</h2>
        </header>

        <main style={styles.content}>
          <div style={styles.storeHero}>
             <h1 style={styles.storeName}>{estabelecimentoSelecionado.cliente}</h1>
             <p style={styles.storeInfo}>
                {estabelecimentoSelecionado.endereco?.bairro || 'Vila Santana'} • {estabelecimentoSelecionado.endereco?.cidade || 'Araraquara'}
             </p>
          </div>

          <h3 style={styles.sectionTitle}>Cardápio</h3>
          <div style={styles.cardapioList}>
            {cardapio.length === 0 && <p style={{color: '#718096'}}>Nenhum produto cadastrado nesta loja.</p>}
            {cardapio.map(item => (
              <div key={item.id} style={styles.itemCard}>
                <div style={styles.itemInfo}>
                  <h4 style={styles.itemName}>{item.nome}</h4>
                  <p style={styles.itemDesc}>{item.descricao}</p>
                  <span style={styles.itemPrice}>R$ {parseFloat(item.preco || 0).toFixed(2)}</span>
                </div>
                {item.foto && <img src={item.foto} alt={item.nome} style={styles.itemFoto} />}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // --- VISÃO DA LISTA DE LOJAS (HOME) ---
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>EntregaAqui</h1>
          <div style={styles.searchBar}>
            <Search size={20} color="#A0AEC0" />
            <input 
              type="text" 
              placeholder="Buscar estabelecimentos..." 
              style={styles.input}
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main style={styles.content}>
        <h2 style={styles.sectionTitle}>Lojas Disponíveis</h2>
        <div style={styles.grid}>
          {estabelecimentos.length === 0 && <p>Buscando estabelecimentos...</p>}
          {estabelecimentos
            .filter(e => e.cliente?.toLowerCase().includes(pesquisa.toLowerCase()))
            .map(est => (
            <div key={est.id} style={styles.card} onClick={() => setEstabelecimentoSelecionado(est)}>
              <div style={styles.cardImage}>🏪</div>
              <div style={styles.cardInfo}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.estNome}>{est.cliente || 'Sem Nome'}</h3>
                  <div style={styles.rating}><Star size={14} fill="#F6E05E" color="#F6E05E" /> 4.9</div>
                </div>
                <p style={styles.estMeta}>{est.endereco?.bairro || 'Bairro'} • Aberto</p>
                <div style={styles.btnFake}>Ver Cardápio <ChevronRight size={16} /></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

// Estilos mantidos em branco puro para destacar as fotos
const styles = {
  container: { backgroundColor: '#FFFFFF', minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { padding: '20px', borderBottom: '1px solid #F1F5F9' },
  headerSimples: { padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #F1F5F9' },
  headerContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' },
  logo: { fontSize: '24px', fontWeight: '900', color: '#1A202C' },
  searchBar: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#F7FAFC', padding: '10px 15px', borderRadius: '12px' },
  input: { border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '15px' },
  content: { maxWidth: '800px', margin: '0 auto', padding: '20px' },
  sectionTitle: { fontSize: '20px', fontWeight: '800', margin: '20px 0', color: '#1A202C' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  card: { borderRadius: '15px', border: '1px solid #F1F5F9', cursor: 'pointer', overflow: 'hidden', backgroundColor: '#FFF' },
  cardImage: { height: '120px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' },
  cardInfo: { padding: '15px' },
  estNome: { fontSize: '17px', fontWeight: '700', color: '#2D3748' },
  rating: { display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '14px' },
  estMeta: { color: '#718096', fontSize: '14px', margin: '5px 0 15px 0' },
  btnFake: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '14px', fontWeight: 'bold', color: '#1A202C' },
  btnBack: { border: 'none', background: 'none', cursor: 'pointer' },
  titleNav: { fontSize: '18px', fontWeight: '700' },
  storeHero: { padding: '20px 0', borderBottom: '2px solid #F7FAFC', marginBottom: '20px' },
  storeName: { fontSize: '28px', fontWeight: '900' },
  storeInfo: { color: '#718096', marginTop: '5px' },
  cardapioList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  itemCard: { display: 'flex', justifyContent: 'space-between', padding: '15px', borderRadius: '12px', border: '1px solid #F1F5F9', backgroundColor: '#FFF' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: '16px', fontWeight: '700', color: '#1A202C' },
  itemDesc: { fontSize: '13px', color: '#718096', margin: '5px 0' },
  itemPrice: { fontSize: '15px', fontWeight: '800', color: '#2C7A7B' },
  itemFoto: { width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', marginLeft: '10px' }
};

export default PaginaInicialCliente;