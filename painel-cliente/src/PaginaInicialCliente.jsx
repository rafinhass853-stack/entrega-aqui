import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore';
import { 
  Search, Star, ChevronRight, ArrowLeft, MapPin, Clock, 
  Bike, Filter, X, Check, Sliders, Navigation, Tag
} from 'lucide-react';

const PaginaInicialCliente = () => {
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState(null);
  const [cardapio, setCardapio] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [cidade, setCidade] = useState('Araraquara');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [categoriasAtivas, setCategoriasAtivas] = useState([]);
  const [ordenacao, setOrdenacao] = useState('relevancia');
  const [filtroFreteGratis, setFiltroFreteGratis] = useState(false);
  const [filtroAbertos, setFiltroAbertos] = useState(false);
  const [raioKm, setRaioKm] = useState(5);
  const [loading, setLoading] = useState(true);

  const categorias = [
    { id: 'lanches', nome: '🍔 Lanches' },
    { id: 'japonesa', nome: '🍣 Japonesa' },
    { id: 'churrasco', nome: '🥩 Churrasco' },
    { id: 'pizza', nome: '🍕 Pizza' },
    { id: 'brasileira', nome: '🥘 Brasileira' },
    { id: 'italiana', nome: '🍝 Italiana' },
    { id: 'saudavel', nome: '🥗 Saudável' },
    { id: 'doces', nome: '🍰 Doces' }
  ];

  // Busca estabelecimentos do Firebase
  useEffect(() => {
    const fetchEstabelecimentos = async () => {
      try {
        console.log('Buscando estabelecimentos do Firebase...');
        
        // Referência à coleção de estabelecimentos
        const estabelecimentosRef = collection(db, 'estabelecimentos');
        const q = query(estabelecimentosRef);
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const lista = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Documento encontrado:', doc.id, data);
            
            return {
              id: doc.id,
              ...data,
              // Adiciona dados mockados para campos que podem não existir no Firebase ainda
              distancia: data.distancia || Math.floor(Math.random() * 10) + 1,
              tempoEntrega: data.tempoEntrega || Math.floor(Math.random() * 30) + 15,
              taxaEntrega: data.taxaEntrega !== undefined ? data.taxaEntrega : (Math.random() > 0.5 ? 0 : (Math.random() * 10).toFixed(2)),
              aberto: data.aberto !== undefined ? data.aberto : Math.random() > 0.2,
              categoria: data.categoria || 'lanches'
            };
          });
          
          console.log('Estabelecimentos carregados:', lista.length);
          setEstabelecimentos(lista);
          setLoading(false);
        }, (error) => {
          console.error('Erro ao buscar estabelecimentos:', error);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Erro ao buscar estabelecimentos:', error);
        setLoading(false);
      }
    };

    fetchEstabelecimentos();
  }, []);

  // Busca cardápio do estabelecimento selecionado
  useEffect(() => {
    if (!estabelecimentoSelecionado) return;

    const fetchCardapio = async () => {
      try {
        console.log('Buscando cardápio para:', estabelecimentoSelecionado.id);
        
        // Referência à subcoleção cardapio do estabelecimento
        const cardapioRef = collection(db, 'estabelecimentos', estabelecimentoSelecionado.id, 'cardapio');
        const q = query(cardapioRef);
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cardapioData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('Cardápio carregado:', cardapioData.length, 'itens');
          setCardapio(cardapioData);
        }, (error) => {
          console.error('Erro ao buscar cardápio:', error);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Erro ao buscar cardápio:', error);
      }
    };

    fetchCardapio();
  }, [estabelecimentoSelecionado]);

  // Filtra estabelecimentos
  const estabelecimentosFiltrados = estabelecimentos.filter(est => {
    // Filtro por cidade
    if (cidade && est.endereco?.cidade !== cidade) {
      return false;
    }

    // Filtro de pesquisa no nome
    if (pesquisa && !est.cliente?.toLowerCase().includes(pesquisa.toLowerCase())) {
      return false;
    }

    // Filtro por categoria
    if (categoriasAtivas.length > 0) {
      if (!est.categoria || !categoriasAtivas.includes(est.categoria)) {
        return false;
      }
    }

    // Filtro frete grátis
    if (filtroFreteGratis && Number(est.taxaEntrega) > 0) {
      return false;
    }

    // Filtro abertos
    if (filtroAbertos && !est.aberto) {
      return false;
    }

    // Filtro por distância (mockado para agora)
    if (est.distancia > raioKm) {
      return false;
    }

    return true;
  });

  // Ordena estabelecimentos
  const estabelecimentosOrdenados = [...estabelecimentosFiltrados].sort((a, b) => {
    switch (ordenacao) {
      case 'menor-preco':
        return (a.taxaEntrega || 0) - (b.taxaEntrega || 0);
      case 'maior-preco':
        return (b.taxaEntrega || 0) - (a.taxaEntrega || 0);
      case 'mais-proximo':
        return a.distancia - b.distancia;
      case 'mais-rapido':
        return a.tempoEntrega - b.tempoEntrega;
      case 'melhor-avaliacao':
        return 4.9 - 4.9; // Mock - implementar avaliações reais
      default:
        return 0;
    }
  });

  // Tela de cardápio
  if (estabelecimentoSelecionado) {
    return (
      <div style={styles.container}>
        <header style={styles.headerSimples}>
          <button onClick={() => setEstabelecimentoSelecionado(null)} style={styles.btnBack}>
            <ArrowLeft size={24} color="#ffffff" />
          </button>
          <h2 style={styles.titleNav}>{estabelecimentoSelecionado.cliente}</h2>
        </header>

        <main style={styles.content}>
          <div style={styles.storeHero}>
            <h1 style={styles.storeName}>{estabelecimentoSelecionado.cliente}</h1>
            <div style={styles.storeBadges}>
              {estabelecimentoSelecionado.aberto ? (
                <span style={styles.badgeAberto}>Aberto agora</span>
              ) : (
                <span style={styles.badgeFechado}>Fechado</span>
              )}
              <span style={styles.badge}>⭐ {estabelecimentoSelecionado.avaliacao || 4.9}</span>
              <span style={styles.badge}>🛵 {estabelecimentoSelecionado.tempoEntrega || 25}-{estabelecimentoSelecionado.tempoEntrega + 10 || 35} min</span>
              <span style={estabelecimentoSelecionado.taxaEntrega > 0 ? styles.badgeFrete : styles.badgeFreteGratis}>
                {estabelecimentoSelecionado.taxaEntrega > 0 
                  ? `Frete R$ ${Number(estabelecimentoSelecionado.taxaEntrega).toFixed(2)}` 
                  : 'Frete Grátis'}
              </span>
            </div>
            <p style={styles.storeInfo}>
              {estabelecimentoSelecionado.endereco?.bairro || 'Vila Santana'} • {estabelecimentoSelecionado.endereco?.cidade || 'Araraquara'}
              {estabelecimentoSelecionado.endereco?.rua && `, ${estabelecimentoSelecionado.endereco.rua}`}
            </p>
          </div>

          <h3 style={styles.sectionTitle}>Cardápio</h3>
          <div style={styles.cardapioList}>
            {cardapio.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>Nenhum produto cadastrado ainda</p>
              </div>
            ) : (
              cardapio.map(item => (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.itemInfo}>
                    <h4 style={styles.itemName}>{item.nome}</h4>
                    <p style={styles.itemDesc}>{item.descricao || 'Sem descrição'}</p>
                    <span style={styles.itemPrice}>
                      R$ {item.preco ? Number(item.preco).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  {item.foto && (
                    <img src={item.foto} alt={item.nome} style={styles.itemFoto} />
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // Tela principal
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.logo}>
            <span style={styles.logoBlue}>Entrega</span>
            <span style={styles.logoGreen}>Aqui</span>
          </h1>
          
          <div style={styles.locationSelector}>
            <MapPin size={18} color="#10B981" />
            <select 
              value={cidade} 
              onChange={(e) => setCidade(e.target.value)}
              style={styles.selectCity}
            >
              <option value="Araraquara">Araraquara, SP</option>
              <option value="São Carlos">São Carlos, SP</option>
              <option value="Ribeirão Preto">Ribeirão Preto, SP</option>
              <option value="Campinas">Campinas, SP</option>
            </select>
          </div>
        </div>

        <div style={styles.searchContainer}>
          <Search size={20} color="#10B981" />
          <input 
            type="text" 
            placeholder="Buscar estabelecimentos, lanches, japonesa..."
            style={styles.searchInput}
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
          <button 
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            style={styles.filterButton}
          >
            <Filter size={20} color="#ffffff" />
          </button>
        </div>

        {/* Categorias */}
        <div style={styles.categoriesContainer}>
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                if (categoriasAtivas.includes(cat.id)) {
                  setCategoriasAtivas(categoriasAtivas.filter(c => c !== cat.id));
                } else {
                  setCategoriasAtivas([...categoriasAtivas, cat.id]);
                }
              }}
              style={{
                ...styles.categoryButton,
                backgroundColor: categoriasAtivas.includes(cat.id) ? '#10B981' : '#0F3460'
              }}
            >
              {cat.nome}
              {categoriasAtivas.includes(cat.id) && <Check size={14} style={{ marginLeft: '5px' }} />}
            </button>
          ))}
        </div>
      </header>

      {/* Filtros Avançados */}
      {filtrosAbertos && (
        <div style={styles.filtersPanel}>
          <div style={styles.filtersHeader}>
            <h3 style={styles.filtersTitle}>Filtros</h3>
            <button onClick={() => setFiltrosAbertos(false)} style={styles.closeButton}>
              <X size={20} />
            </button>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <input 
                type="checkbox" 
                checked={filtroFreteGratis}
                onChange={(e) => setFiltroFreteGratis(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.checkboxLabel}>Frete Grátis</span>
            </label>
            
            <label style={styles.filterLabel}>
              <input 
                type="checkbox" 
                checked={filtroAbertos}
                onChange={(e) => setFiltroAbertos(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.checkboxLabel}>Abertos Agora</span>
            </label>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Raio de Entrega: {raioKm} km</label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={raioKm}
              onChange={(e) => setRaioKm(parseInt(e.target.value))}
              style={styles.rangeSlider}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Ordenar por:</label>
            <select 
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="relevancia">Mais Relevantes</option>
              <option value="menor-preco">Menor Preço</option>
              <option value="maior-preco">Maior Preço</option>
              <option value="mais-proximo">Mais Próximo</option>
              <option value="mais-rapido">Mais Rápido</option>
              <option value="melhor-avaliacao">Melhor Avaliação</option>
            </select>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main style={styles.content}>
        <div style={styles.resultsHeader}>
          <h2 style={styles.sectionTitle}>
            Lojas Disponíveis em {cidade}
            <span style={styles.resultsCount}> ({estabelecimentosOrdenados.length})</span>
          </h2>
          {(filtroFreteGratis || filtroAbertos || categoriasAtivas.length > 0 || ordenacao !== 'relevancia' || pesquisa) && (
            <button 
              onClick={() => {
                setCategoriasAtivas([]);
                setFiltroFreteGratis(false);
                setFiltroAbertos(false);
                setOrdenacao('relevancia');
                setRaioKm(5);
                setPesquisa('');
              }}
              style={styles.clearFilters}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}></div>
            <p>Carregando estabelecimentos...</p>
          </div>
        ) : estabelecimentosOrdenados.length === 0 ? (
          <div style={styles.emptyState}>
            <Search size={48} color="#94A3B8" />
            <p style={styles.emptyText}>Nenhum estabelecimento encontrado</p>
            <button 
              onClick={() => {
                setCategoriasAtivas([]);
                setPesquisa('');
                setFiltroFreteGratis(false);
                setFiltroAbertos(false);
              }}
              style={styles.emptyButton}
            >
              Limpar pesquisa e filtros
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {estabelecimentosOrdenados.map(est => (
              <div 
                key={est.id} 
                style={styles.card}
                onClick={() => setEstabelecimentoSelecionado(est)}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.cardImage}>
                    {/* Aqui você pode adicionar uma imagem real do estabelecimento */}
                    <div style={styles.imagePlaceholder}>
                      {est.cliente?.charAt(0) || 'E'}
                    </div>
                    {!est.aberto && <div style={styles.closedOverlay}>FECHADO</div>}
                  </div>
                  <div style={styles.estStatus}>
                    {est.aberto ? (
                      <span style={styles.statusAberto}>● Aberto</span>
                    ) : (
                      <span style={styles.statusFechado}>● Fechado</span>
                    )}
                  </div>
                </div>
                
                <div style={styles.cardBody}>
                  <div style={styles.cardInfo}>
                    <h3 style={styles.estNome}>{est.cliente || 'Sem Nome'}</h3>
                    <div style={styles.rating}>
                      <Star size={14} fill="#FBBF24" color="#FBBF24" /> 
                      <span style={styles.ratingText}>{est.avaliacao || 4.9}</span>
                      <span style={styles.ratingCount}>({est.numAvaliacoes || 150}+)</span>
                    </div>
                  </div>
                  
                  <p style={styles.estCategoria}>
                    {categorias.find(c => c.id === est.categoria)?.nome || 'Variado'}
                  </p>
                  
                  <div style={styles.estDetails}>
                    <div style={styles.detailItem}>
                      <Clock size={14} color="#94A3B8" />
                      <span>{est.tempoEntrega || 25}-{est.tempoEntrega + 10 || 35} min</span>
                    </div>
                    <div style={styles.detailItem}>
                      <Navigation size={14} color="#94A3B8" />
                      <span>{est.distancia || 2} km</span>
                    </div>
                    <div style={styles.detailItem}>
                      <Bike size={14} color="#94A3B8" />
                      <span>{est.taxaEntrega > 0 ? `R$ ${Number(est.taxaEntrega).toFixed(2)}` : 'Grátis'}</span>
                    </div>
                  </div>
                  
                  <div style={styles.cardFooter}>
                    <span style={styles.estEndereco}>
                      {est.endereco?.bairro || 'Bairro'} • {est.endereco?.cidade || 'Cidade'}
                    </span>
                    <div style={styles.btnVerCardapio}>
                      Ver Cardápio <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// Estilos (mantidos os mesmos do código anterior)
const styles = {
  container: { 
    backgroundColor: '#F8FAFC', 
    minHeight: '100vh', 
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" 
  },
  
  header: { 
    backgroundColor: '#0F3460',
    padding: '20px 20px 15px',
    borderBottomLeftRadius: '24px',
    borderBottomRightRadius: '24px',
    boxShadow: '0 4px 20px rgba(15, 52, 96, 0.1)'
  },
  
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  
  logo: { 
    fontSize: '28px', 
    fontWeight: '900', 
    margin: 0,
    display: 'flex',
    gap: '2px'
  },
  
  logoBlue: {
    color: '#ffffff'
  },
  
  logoGreen: {
    color: '#10B981'
  },
  
  locationSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '8px 16px',
    borderRadius: '12px',
    cursor: 'pointer'
  },
  
  selectCity: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    outline: 'none',
    cursor: 'pointer'
  },
  
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#ffffff',
    padding: '12px 20px',
    borderRadius: '16px',
    marginBottom: '15px'
  },
  
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'none',
    outline: 'none',
    fontSize: '15px',
    color: '#1E293B'
  },
  
  filterButton: {
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: '10px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  categoriesContainer: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '5px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },
  
  categoryButton: {
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  
  filtersPanel: {
    backgroundColor: '#ffffff',
    margin: '15px 20px',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
  },
  
  filtersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  
  filtersTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0F3460',
    margin: 0
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    padding: '5px'
  },
  
  filterGroup: {
    marginBottom: '20px'
  },
  
  filterLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    color: '#1E293B',
    fontSize: '14px',
    fontWeight: '500'
  },
  
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#10B981'
  },
  
  checkboxLabel: {
    flex: 1
  },
  
  rangeSlider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#E2E8F0',
    outline: 'none',
    accentColor: '#10B981'
  },
  
  selectFilter: {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer'
  },
  
  content: {
    padding: '20px'
  },
  
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0F3460',
    margin: 0
  },
  
  resultsCount: {
    color: '#64748B',
    fontWeight: '400'
  },
  
  clearFilters: {
    backgroundColor: 'transparent',
    border: '1px solid #10B981',
    color: '#10B981',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(15, 52, 96, 0.1)'
    }
  },
  
  cardHeader: {
    position: 'relative'
  },
  
  cardImage: {
    height: '160px',
    backgroundColor: '#D1FAE5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  
  imagePlaceholder: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700'
  },
  
  estStatus: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  
  statusAberto: {
    color: '#10B981'
  },
  
  statusFechado: {
    color: '#EF4444'
  },
  
  cardBody: {
    padding: '20px'
  },
  
  cardInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  
  estNome: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0F3460',
    margin: 0,
    flex: 1
  },
  
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  
  ratingText: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0F3460'
  },
  
  ratingCount: {
    fontSize: '12px',
    color: '#94A3B8'
  },
  
  estCategoria: {
    color: '#64748B',
    fontSize: '13px',
    margin: '0 0 15px 0'
  },
  
  estDetails: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px'
  },
  
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#64748B'
  },
  
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #F1F5F9',
    paddingTop: '15px'
  },
  
  estEndereco: {
    fontSize: '13px',
    color: '#94A3B8'
  },
  
  btnVerCardapio: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#10B981'
  },
  
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #10B981',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  
  emptyText: {
    color: '#64748B',
    fontSize: '16px',
    margin: '20px 0'
  },
  
  emptyButton: {
    backgroundColor: '#10B981',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  
  headerSimples: {
    backgroundColor: '#0F3460',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  
  btnBack: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  titleNav: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0
  },
  
  storeHero: {
    padding: '30px 20px 20px',
    borderBottom: '1px solid #E2E8F0'
  },
  
  storeName: {
    fontSize: '28px',
    fontWeight: '900',
    color: '#0F3460',
    margin: '0 0 15px 0'
  },
  
  storeBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px'
  },
  
  badgeAberto: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600'
  },
  
  badgeFechado: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600'
  },
  
  badge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600'
  },
  
  badgeFrete: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600'
  },
  
  badgeFreteGratis: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600'
  },
  
  storeInfo: {
    color: '#64748B',
    fontSize: '14px',
    marginTop: '10px'
  },
  
  cardapioList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px 0'
  },
  
  itemCard: {
    backgroundColor: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    transition: 'all 0.2s ease'
  },
  
  itemInfo: {
    flex: 1
  },
  
  itemName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0F3460',
    margin: '0 0 8px 0'
  },
  
  itemDesc: {
    fontSize: '14px',
    color: '#64748B',
    margin: '0 0 15px 0',
    lineHeight: 1.5
  },
  
  itemPrice: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#10B981'
  },
  
  itemFoto: {
    width: '100px',
    height: '100px',
    borderRadius: '12px',
    objectFit: 'cover',
    marginLeft: '15px'
  }
};

// Adicionar estilos globais
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: #F1F5F9;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #94A3B8;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #64748B;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  select {
    cursor: pointer;
  }
  
  button {
    cursor: pointer;
  }
  
  .categoriesContainer::-webkit-scrollbar {
    display: none;
  }
`;

// Adicionar estilos globais ao documento
const styleSheet = document.createElement("style");
styleSheet.innerText = globalStyles;
document.head.appendChild(styleSheet);

export default PaginaInicialCliente;