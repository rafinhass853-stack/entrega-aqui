import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { 
  Search, Star, ChevronRight, MapPin, Clock, 
  Bike, Filter, X, Check, Navigation, Tag
} from 'lucide-react';

// Importar os componentes criados
import Cardapio from './Cardapio';
import Carrinho from './Carrinho';
import Cadastro from './Cadastro';
import EnviarPedido from './EnviarPedido';

const PaginaInicialCliente = () => {
  // Estados para gerenciar as telas
  const [telaAtual, setTelaAtual] = useState('home');
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState(null);
  const [pesquisa, setPesquisa] = useState('');
  const [cidade, setCidade] = useState('Araraquara');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [categoriasAtivas, setCategoriasAtivas] = useState([]);
  const [ordenacao, setOrdenacao] = useState('relevancia');
  const [filtroFreteGratis, setFiltroFreteGratis] = useState(false);
  const [filtroAbertos, setFiltroAbertos] = useState(false);
  const [raioKm, setRaioKm] = useState(5);
  const [loading, setLoading] = useState(true);
  
  // Estados para o fluxo do pedido
  const [carrinho, setCarrinho] = useState([]);
  const [dadosCliente, setDadosCliente] = useState(null);

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

  // Busca estabelecimentos do Firebase - CORRIGIDA
  useEffect(() => {
    const fetchEstabelecimentos = async () => {
      try {
        console.log('Buscando estabelecimentos do Firebase...');
        
        // Referência à coleção de estabelecimentos
        const estabelecimentosRef = collection(db, 'estabelecimentos');
        const q = query(estabelecimentosRef);
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const listaPromises = snapshot.docs.map(async (doc) => {
            const data = doc.data();
            console.log('Documento encontrado:', doc.id, data);
            
            // Buscar horário de funcionamento da subcoleção
            let horarioFuncionamento = null;
            let abertoAgora = false;
            
            try {
              const horarioRef = collection(db, 'estabelecimentos', doc.id, 'horarios');
              const horarioSnapshot = await getDocs(horarioRef);
              
              if (!horarioSnapshot.empty) {
                horarioFuncionamento = horarioSnapshot.docs[0].data();
                // Calcular se está aberto agora baseado no horário
                abertoAgora = verificarSeEstaAberto(horarioFuncionamento);
              }
            } catch (error) {
              console.log('Erro ao buscar horário:', error);
            }
            
            // Buscar cardápio para contar itens
            let quantidadeItensCardapio = 0;
            try {
              const cardapioRef = collection(db, 'estabelecimentos', doc.id, 'cardapio');
              const cardapioSnapshot = await getDocs(cardapioRef);
              quantidadeItensCardapio = cardapioSnapshot.size;
            } catch (error) {
              console.log('Erro ao contar itens do cardápio:', error);
            }
            
            // Verificar se tem foto no Firebase Storage
            const temFoto = data.fotoUrl || data.imagem || data.logo;
            
            return {
              id: doc.id,
              ...data,
              // Dados do endereço do seu Firebase
              endereco: {
                bairro: data.bairro || 'Vila Santana',
                cep: data.cep || '14801204',
                cepFormatado: data.cepFormatado || '14.801-204',
                cidade: data.cidade || 'Araraquara',
                complemento: data.complemento || '',
                completo: data.completo || 'Avenida Bandeirantes, 1981 - Vila Santana, Araraquara - SP, 14.801-204',
                numero: data.numero || '1981',
                rua: data.rua || 'Avenida Bandeirantes',
                uf: data.uf || 'SP'
              },
              // Informações do estabelecimento
              cliente: data.cliente || data.nome || data.nomeEstabelecimento || 'Estabelecimento',
              categoria: data.categoria || data.tipo || 'lanches',
              // Status e horário
              horarioFuncionamento,
              aberto: abertoAgora,
              // Dados de entrega (usar valores padrão se não existirem)
              distancia: data.distancia || Math.floor(Math.random() * 10) + 1,
              tempoEntrega: data.tempoEntrega || Math.floor(Math.random() * 30) + 15,
              taxaEntrega: data.taxaEntrega !== undefined ? data.taxaEntrega : (Math.random() > 0.5 ? 0 : (Math.random() * 10).toFixed(2)),
              // Avaliações
              avaliacao: data.avaliacao || data.rating || 4.9,
              numAvaliacoes: data.numAvaliacoes || data.totalAvaliacoes || 150,
              // Informações adicionais
              fotoUrl: temFoto,
              quantidadeItensCardapio
            };
          });
          
          const lista = await Promise.all(listaPromises);
          console.log('Estabelecimentos carregados:', lista);
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

  // Função para verificar se o estabelecimento está aberto
  const verificarSeEstaAberto = (horario) => {
    if (!horario) return true; // Se não tem horário, assume que está aberto
    
    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutosAtual = agora.getMinutes();
    const totalMinutosAtual = horaAtual * 60 + minutosAtual;
    
    // Converter horários do Firebase
    const horarioAbertura = converterHorarioParaMinutos(horario.abertura);
    const horarioFechamento = converterHorarioParaMinutos(horario.fechamento);
    
    // Verificar se está dentro do horário
    return totalMinutosAtual >= horarioAbertura && totalMinutosAtual <= horarioFechamento;
  };

  const converterHorarioParaMinutos = (horario) => {
    if (!horario) return 8 * 60; // 08:00 padrão
    
    // Formato pode ser "08:00" ou objeto com horas/minutos
    if (typeof horario === 'string') {
      const [horas, minutos] = horario.split(':').map(Number);
      return horas * 60 + minutos;
    } else if (horario.horas && horario.minutos) {
      return horario.horas * 60 + horario.minutos;
    }
    
    return 8 * 60; // Padrão
  };

  // Funções para gerenciar o fluxo
  const handleSelecionarEstabelecimento = (estabelecimento) => {
    setEstabelecimentoSelecionado(estabelecimento);
    setTelaAtual('cardapio');
    // Limpar carrinho quando muda de estabelecimento
    setCarrinho([]);
  };

  const handleVoltarHome = () => {
    setTelaAtual('home');
    setEstabelecimentoSelecionado(null);
  };

  const handleAbrirCarrinho = (novoCarrinho) => {
    if (novoCarrinho) {
      setCarrinho(novoCarrinho);
    }
    setTelaAtual('carrinho');
  };

  const handleAtualizarCarrinho = (acao, dados) => {
    switch (acao) {
      case 'atualizarQuantidade':
        setCarrinho(carrinho.map(item => 
          item.id === dados.itemId ? { ...item, quantidade: dados.quantidade } : item
        ));
        break;
      case 'removerItem':
        setCarrinho(carrinho.filter(item => item.id !== dados.itemId));
        break;
      case 'continuar':
        setTelaAtual('cadastro');
        break;
      default:
        console.warn('Ação desconhecida:', acao);
    }
  };

  const handleFinalizarCadastro = (dados) => {
    setDadosCliente(dados);
    setTelaAtual('enviar');
  };

  const handleEnviarPedido = (pedido) => {
    console.log('Pedido enviado:', pedido);
    // Aqui você pode salvar o pedido no Firebase
    // Exemplo: await addDoc(collection(db, 'pedidos'), pedido);
    // Após enviar, voltar para home
    setTelaAtual('home');
    setEstabelecimentoSelecionado(null);
    setCarrinho([]);
    setDadosCliente(null);
    alert(`Pedido #${pedido.numero} realizado com sucesso!`);
  };

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

    // Filtro por distância
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
        return b.avaliacao - a.avaliacao;
      default:
        return 0;
    }
  });

  // Renderizar a tela atual
  switch (telaAtual) {
    case 'cardapio':
      return (
        <Cardapio
          estabelecimento={estabelecimentoSelecionado}
          onVoltar={handleVoltarHome}
          onAbrirCarrinho={handleAbrirCarrinho}
        />
      );
    
    case 'carrinho':
      return (
        <Carrinho
          carrinho={carrinho}
          estabelecimento={estabelecimentoSelecionado}
          onVoltar={() => setTelaAtual('cardapio')}
          onContinuar={handleAtualizarCarrinho}
        />
      );
    
    case 'cadastro':
      return (
        <Cadastro
          dadosCliente={dadosCliente}
          onVoltar={() => setTelaAtual('carrinho')}
          onContinuar={handleFinalizarCadastro}
        />
      );
    
    case 'enviar':
      return (
        <EnviarPedido
          estabelecimento={estabelecimentoSelecionado}
          carrinho={carrinho}
          dadosCliente={dadosCliente}
          onVoltar={() => setTelaAtual('cadastro')}
          onEnviarPedido={handleEnviarPedido}
        />
      );
    
    case 'home':
    default:
      return renderTelaHome();
  }

  // Função para renderizar a tela home
  function renderTelaHome() {
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
              <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '20px' }}>
                {estabelecimentos.length > 0 
                  ? 'Tente limpar os filtros ou mudar a cidade'
                  : 'Nenhum estabelecimento cadastrado no sistema'}
              </p>
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
                  onClick={() => handleSelecionarEstabelecimento(est)}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.cardImage}>
                      {est.fotoUrl ? (
                        <img 
                          src={est.fotoUrl} 
                          alt={est.cliente} 
                          style={styles.imagemEstabelecimento}
                        />
                      ) : (
                        <div style={styles.imagePlaceholder}>
                          {est.cliente?.charAt(0) || 'E'}
                        </div>
                      )}
                      {!est.aberto && <div style={styles.closedOverlay}>FECHADO</div>}
                    </div>
                    <div style={styles.estStatus}>
                      {est.aberto ? (
                        <span style={styles.statusAberto}>● Aberto agora</span>
                      ) : (
                        <span style={styles.statusFechado}>● Fechado</span>
                      )}
                      {est.quantidadeItensCardapio > 0 && (
                        <span style={styles.cardapioBadge}>
                          <Tag size={12} /> {est.quantidadeItensCardapio} itens
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={styles.cardBody}>
                    <div style={styles.cardInfo}>
                      <h3 style={styles.estNome}>{est.cliente || 'Sem Nome'}</h3>
                      <div style={styles.rating}>
                        <Star size={14} fill="#FBBF24" color="#FBBF24" /> 
                        <span style={styles.ratingText}>{est.avaliacao?.toFixed(1) || 4.9}</span>
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
          
          {/* Debug: Mostrar dados carregados */}
          {!loading && estabelecimentos.length === 0 && (
            <div style={styles.debugInfo}>
              <p style={{ fontSize: '14px', color: '#EF4444' }}>
                ⚠️ Nenhum estabelecimento encontrado no Firebase.
              </p>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Verifique se a coleção 'estabelecimentos' existe no Firestore.
              </p>
            </div>
          )}
        </main>
      </div>
    );
  }
};

// Estilos (com adições para a nova estrutura)
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
    scrollbarWidth: 'none'
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
    position: 'relative',
    overflow: 'hidden'
  },
  
  imagemEstabelecimento: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
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
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    alignItems: 'flex-start'
  },
  
  statusAberto: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#10B981'
  },
  
  statusFechado: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#EF4444'
  },
  
  cardapioBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#0F3460',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
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
    color: '#94A3B8',
    maxWidth: '60%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
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
  
  debugInfo: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '20px',
    textAlign: 'center'
  }
};

// Estilos globais
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
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
}

export default PaginaInicialCliente;