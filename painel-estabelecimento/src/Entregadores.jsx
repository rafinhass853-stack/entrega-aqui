import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';

const Entregadores = ({ user, isMobile }) => {
  const [entregadores, setEntregadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tabAtiva, setTabAtiva] = useState('lista');
  const [entregadorEditando, setEntregadorEditando] = useState(null);
  
  const [novoEntregador, setNovoEntregador] = useState({
    nome: '',
    telefone: '',
    veiculo: '',
    placa: '',
    status: 'disponivel',
    entregasHoje: 0,
    valorEntregas: 0,
    ativo: true
  });

  const [pedidosEmAndamento, setPedidosEmAndamento] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Buscar entregadores
    const entregadoresRef = collection(db, 'estabelecimentos', user.uid, 'entregadores');
    const q = query(entregadoresRef, orderBy('criadoEm', 'desc'));
    
    const unsubscribeEntregadores = onSnapshot(q, (snapshot) => {
      const listaEntregadores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntregadores(listaEntregadores);
    });

    // Buscar pedidos em andamento
    const pedidosRef = collection(db, 'estabelecimentos', user.uid, 'pedidos');
    const qPedidos = query(pedidosRef, where('status', 'in', ['rota', 'entrega']));
    
    const unsubscribePedidos = onSnapshot(qPedidos, (snapshot) => {
      const listaPedidos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPedidosEmAndamento(listaPedidos);
    });

    return () => {
      unsubscribeEntregadores();
      unsubscribePedidos();
    };
  }, [user]);

  const handleSubmitEntregador = async (e) => {
    e.preventDefault();
    if (!novoEntregador.nome || !novoEntregador.telefone) {
      alert("Preencha nome e telefone");
      return;
    }

    setLoading(true);
    try {
      const entregadorData = {
        nome: novoEntregador.nome,
        telefone: novoEntregador.telefone,
        veiculo: novoEntregador.veiculo,
        placa: novoEntregador.placa,
        status: novoEntregador.status,
        entregasHoje: parseInt(novoEntregador.entregasHoje) || 0,
        valorEntregas: parseFloat(novoEntregador.valorEntregas) || 0,
        ativo: novoEntregador.ativo,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      if (entregadorEditando) {
        // Atualizar entregador
        await updateDoc(doc(db, 'estabelecimentos', user.uid, 'entregadores', entregadorEditando.id), entregadorData);
      } else {
        // Criar novo entregador
        await addDoc(collection(db, 'estabelecimentos', user.uid, 'entregadores'), entregadorData);
      }

      resetForm();
    } catch (error) {
      console.error('Erro ao salvar entregador:', error);
      alert('Erro ao salvar entregador');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntregador = async (entregadorId) => {
    if (window.confirm('Tem certeza que deseja excluir este entregador?')) {
      try {
        await deleteDoc(doc(db, 'estabelecimentos', user.uid, 'entregadores', entregadorId));
      } catch (error) {
        console.error('Erro ao excluir entregador:', error);
      }
    }
  };

  const handleEditEntregador = (entregador) => {
    setEntregadorEditando(entregador);
    setNovoEntregador({
      nome: entregador.nome,
      telefone: entregador.telefone,
      veiculo: entregador.veiculo || '',
      placa: entregador.placa || '',
      status: entregador.status || 'disponivel',
      entregasHoje: entregador.entregasHoje?.toString() || '0',
      valorEntregas: entregador.valorEntregas?.toString() || '0',
      ativo: entregador.ativo !== false
    });
    setTabAtiva('cadastro');
  };

  const handleStatusChange = async (entregadorId, novoStatus) => {
    try {
      await updateDoc(doc(db, 'estabelecimentos', user.uid, 'entregadores', entregadorId), {
        status: novoStatus,
        atualizadoEm: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const resetForm = () => {
    setNovoEntregador({
      nome: '',
      telefone: '',
      veiculo: '',
      placa: '',
      status: 'disponivel',
      entregasHoje: '0',
      valorEntregas: '0',
      ativo: true
    });
    setEntregadorEditando(null);
    setTabAtiva('lista');
  };

  const getStatusInfo = (status) => {
    const statusConfig = {
      disponivel: { cor: '#48BB78', label: 'Disponível', icon: '🟢' },
      entrega: { cor: '#ED8936', label: 'Em Entrega', icon: '🟡' },
      indisponivel: { cor: '#F56565', label: 'Indisponível', icon: '🔴' },
      offline: { cor: '#718096', label: 'Offline', icon: '⚫' }
    };
    
    return statusConfig[status] || statusConfig.disponivel;
  };

  const entregadoresDisponiveis = entregadores.filter(e => 
    e.status === 'disponivel' && e.ativo !== false
  );
  const entregadoresEmEntrega = entregadores.filter(e => e.status === 'entrega');
  const entregadoresIndisponiveis = entregadores.filter(e => 
    e.status === 'indisponivel' || e.ativo === false
  );

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>🏍️ Gestão de Entregadores</h1>
            <p style={styles.subtitle}>
              Cadastre entregadores e acompanhe status em tempo real
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
              Novo Entregador
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
            📋 Lista de Entregadores
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(tabAtiva === 'cadastro' ? styles.tabButtonActive : {})
            }}
            onClick={() => setTabAtiva('cadastro')}
          >
            {entregadorEditando ? '✏️ Editar Entregador' : '➕ Cadastrar Entregador'}
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(tabAtiva === 'status' ? styles.tabButtonActive : {})
            }}
            onClick={() => setTabAtiva('status')}
          >
            🚚 Entregas em Andamento
          </button>
        </div>

        {/* Conteúdo das Tabs */}
        {tabAtiva === 'cadastro' && (
          <div style={styles.formContainer}>
            <form onSubmit={handleSubmitEntregador} style={styles.form}>
              <div style={styles.formGrid}>
                {/* Informações Pessoais */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>👤 Informações Pessoais</h3>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nome Completo *</label>
                    <input
                      style={styles.input}
                      placeholder="Ex: João da Silva"
                      value={novoEntregador.nome}
                      onChange={(e) => setNovoEntregador({...novoEntregador, nome: e.target.value})}
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Telefone *</label>
                    <input
                      style={styles.input}
                      placeholder="(11) 99999-9999"
                      value={novoEntregador.telefone}
                      onChange={(e) => setNovoEntregador({...novoEntregador, telefone: e.target.value})}
                      required
                    />
                  </div>

                  <div style={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={novoEntregador.ativo}
                      onChange={(e) => setNovoEntregador({...novoEntregador, ativo: e.target.checked})}
                    />
                    <label htmlFor="ativo" style={styles.checkboxLabel}>
                      Entregador ativo
                    </label>
                  </div>
                </div>

                {/* Informações do Veículo */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>🏍️ Informações do Veículo</h3>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Tipo de Veículo</label>
                    <select
                      style={styles.input}
                      value={novoEntregador.veiculo}
                      onChange={(e) => setNovoEntregador({...novoEntregador, veiculo: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      <option value="Moto">Moto</option>
                      <option value="Bicicleta">Bicicleta</option>
                      <option value="Carro">Carro</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Placa</label>
                    <input
                      style={styles.input}
                      placeholder="ABC-1234"
                      value={novoEntregador.placa}
                      onChange={(e) => setNovoEntregador({...novoEntregador, placa: e.target.value})}
                    />
                  </div>
                </div>

                {/* Status e Métricas */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>📊 Status e Métricas</h3>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Status Inicial</label>
                    <select
                      style={styles.input}
                      value={novoEntregador.status}
                      onChange={(e) => setNovoEntregador({...novoEntregador, status: e.target.value})}
                    >
                      <option value="disponivel">🟢 Disponível</option>
                      <option value="indisponivel">🔴 Indisponível</option>
                      <option value="offline">⚫ Offline</option>
                    </select>
                  </div>

                  <div style={styles.inputGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Entregas Hoje</label>
                      <input
                        style={styles.input}
                        type="number"
                        placeholder="0"
                        value={novoEntregador.entregasHoje}
                        onChange={(e) => setNovoEntregador({...novoEntregador, entregasHoje: e.target.value})}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Valor Entregas (R$)</label>
                      <input
                        style={styles.input}
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={novoEntregador.valorEntregas}
                        onChange={(e) => setNovoEntregador({...novoEntregador, valorEntregas: e.target.value})}
                      />
                    </div>
                  </div>
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
                  {loading ? 'Salvando...' : entregadorEditando ? 'Atualizar Entregador' : 'Cadastrar Entregador'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tabAtiva === 'lista' && (
          <div style={styles.listaContainer}>
            {/* Status Summary */}
            <div style={styles.statusSummary}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryIcon} className="disponivel">🟢</div>
                <div style={styles.summaryInfo}>
                  <div style={styles.summaryCount}>{entregadoresDisponiveis.length}</div>
                  <div style={styles.summaryLabel}>Disponíveis</div>
                </div>
              </div>
              
              <div style={styles.summaryCard}>
                <div style={styles.summaryIcon} className="entrega">🟡</div>
                <div style={styles.summaryInfo}>
                  <div style={styles.summaryCount}>{entregadoresEmEntrega.length}</div>
                  <div style={styles.summaryLabel}>Em Entrega</div>
                </div>
              </div>
              
              <div style={styles.summaryCard}>
                <div style={styles.summaryIcon} className="indisponivel">🔴</div>
                <div style={styles.summaryInfo}>
                  <div style={styles.summaryCount}>{entregadoresIndisponiveis.length}</div>
                  <div style={styles.summaryLabel}>Indisponíveis</div>
                </div>
              </div>
              
              <div style={styles.summaryCard}>
                <div style={styles.summaryIcon} className="total">🏍️</div>
                <div style={styles.summaryInfo}>
                  <div style={styles.summaryCount}>{entregadores.length}</div>
                  <div style={styles.summaryLabel}>Total</div>
                </div>
              </div>
            </div>

            {/* Lista de Entregadores */}
            <div style={styles.entregadoresGrid}>
              {entregadores.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🏍️</div>
                  <h3 style={styles.emptyTitle}>Nenhum entregador cadastrado</h3>
                  <p style={styles.emptyText}>
                    Cadastre seu primeiro entregador para começar!
                  </p>
                  <button 
                    style={styles.btnCadastrarPrimeiro}
                    onClick={() => setTabAtiva('cadastro')}
                  >
                    ➕ Cadastrar Primeiro Entregador
                  </button>
                </div>
              ) : (
                entregadores.map(entregador => {
                  const statusInfo = getStatusInfo(entregador.status);
                  
                  return (
                    <div key={entregador.id} style={styles.entregadorCard}>
                      <div style={styles.entregadorHeader}>
                        <div style={styles.entregadorAvatar}>
                          {entregador.nome?.charAt(0) || 'E'}
                        </div>
                        <div style={styles.infoEntregador}>
                          <h4 style={styles.entregadorNome}>{entregador.nome}</h4>
                          <div style={styles.entregadorContato}>
                            <a 
                              href={`https://wa.me/55${entregador.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.whatsappLink}
                            >
                              📞 {entregador.telefone}
                            </a>
                          </div>
                        </div>
                        <div style={{
                          ...styles.statusBadge,
                          backgroundColor: `${statusInfo.cor}15`,
                          borderColor: statusInfo.cor,
                          color: statusInfo.cor
                        }}>
                          <span style={{ marginRight: '6px' }}>{statusInfo.icon}</span>
                          {statusInfo.label}
                        </div>
                      </div>

                      <div style={styles.entregadorBody}>
                        <div style={styles.entregadorDetalhes}>
                          <div style={styles.detalheItem}>
                            <span>🏍️</span>
                            <span>{entregador.veiculo || 'Não informado'}</span>
                            {entregador.placa && <span> - {entregador.placa}</span>}
                          </div>
                          
                          <div style={styles.detalheItem}>
                            <span>📊</span>
                            <span>Entregas hoje: {entregador.entregasHoje || 0}</span>
                          </div>
                          
                          <div style={styles.detalheItem}>
                            <span>💰</span>
                            <span>Valor: R$ {entregador.valorEntregas?.toFixed(2) || '0,00'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={styles.entregadorFooter}>
                        <div style={styles.statusActions}>
                          <button
                            style={{
                              ...styles.btnStatusAction,
                              ...(entregador.status === 'disponivel' ? styles.btnStatusActive : {})
                            }}
                            onClick={() => handleStatusChange(entregador.id, 'disponivel')}
                            title="Disponível"
                          >
                            🟢
                          </button>
                          <button
                            style={{
                              ...styles.btnStatusAction,
                              ...(entregador.status === 'entrega' ? styles.btnStatusActive : {})
                            }}
                            onClick={() => handleStatusChange(entregador.id, 'entrega')}
                            title="Em Entrega"
                          >
                            🟡
                          </button>
                          <button
                            style={{
                              ...styles.btnStatusAction,
                              ...(entregador.status === 'indisponivel' ? styles.btnStatusActive : {})
                            }}
                            onClick={() => handleStatusChange(entregador.id, 'indisponivel')}
                            title="Indisponível"
                          >
                            🔴
                          </button>
                        </div>
                        
                        <div style={styles.entregadorAcoes}>
                          <button
                            style={styles.btnEditar}
                            onClick={() => handleEditEntregador(entregador)}
                          >
                            ✏️
                          </button>
                          <button
                            style={styles.btnExcluir}
                            onClick={() => handleDeleteEntregador(entregador.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tabAtiva === 'status' && (
          <div style={styles.statusContainer}>
            <h3 style={styles.sectionTitle}>🚚 Entregas em Andamento</h3>
            
            {pedidosEmAndamento.length === 0 ? (
              <div style={styles.emptyStatus}>
                <div style={styles.emptyIcon}>✅</div>
                <h3 style={styles.emptyTitle}>Nenhuma entrega em andamento</h3>
                <p style={styles.emptyText}>
                  Todos os pedidos foram entregues ou estão aguardando atribuição
                </p>
              </div>
            ) : (
              <div style={styles.pedidosGrid}>
                {pedidosEmAndamento.map(pedido => {
                  const entregador = entregadores.find(e => e.id === pedido.entregadorId);
                  
                  return (
                    <div key={pedido.id} style={styles.pedidoCard}>
                      <div style={styles.pedidoHeader}>
                        <div style={styles.pedidoInfo}>
                          <span style={styles.pedidoNumero}>#{pedido.numero || pedido.id.slice(-6)}</span>
                          <span style={styles.pedidoCliente}>{pedido.cliente || 'Cliente'}</span>
                        </div>
                        <div style={styles.pedidoStatus}>
                          <span style={{color: '#ED8936', marginRight: '6px'}}>🟡</span>
                          Em Rota
                        </div>
                      </div>

                      <div style={styles.pedidoBody}>
                        <div style={styles.pedidoEndereco}>
                          <span>📍</span>
                          <span>{pedido.endereco || 'Endereço não informado'}</span>
                        </div>
                        
                        {entregador && (
                          <div style={styles.infoEntregadorPedido}>
                            <div style={styles.entregadorAvatar}>
                              {entregador.nome?.charAt(0) || 'E'}
                            </div>
                            <div>
                              <div style={styles.entregadorNome}>{entregador.nome}</div>
                              <div style={styles.entregadorVeiculo}>
                                {entregador.veiculo} - {entregador.placa}
                              </div>
                              <a 
                                href={`https://wa.me/55${entregador.telefone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.whatsappLink}
                              >
                                📞 {entregador.telefone}
                              </a>
                            </div>
                          </div>
                        )}
                        
                        <div style={styles.pedidoDetalhes}>
                          <div style={styles.detalheItem}>
                            <span>🕒</span>
                            <span>Tempo: {pedido.horarioSaida ? 
                              `${Math.floor((new Date() - pedido.horarioSaida.toDate()) / 60000)} min` : 
                              '--:--'
                            }</span>
                          </div>
                          <div style={styles.detalheItem}>
                            <span>💰</span>
                            <span>Total: R$ {pedido.total?.toFixed(2) || '0,00'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={styles.pedidoActions}>
                        <button style={styles.btnContatar}>
                          📞 Contatar Cliente
                        </button>
                        <button style={styles.btnContatarEntregador}>
                          🏍️ Contatar Entregador
                        </button>
                        <button style={styles.btnEntregue}>
                          ✅ Marcar como Entregue
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
    gap: '30px'
  },
  statusSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  summaryCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  summaryIcon: {
    fontSize: '30px',
    '&.disponivel': { color: '#48BB78' },
    '&.entrega': { color: '#ED8936' },
    '&.indisponivel': { color: '#F56565' },
    '&.total': { color: '#4FD1C5' }
  },
  summaryInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  summaryCount: {
    color: '#4FD1C5',
    fontSize: '28px',
    fontWeight: 'bold'
  },
  summaryLabel: {
    color: '#81E6D9',
    fontSize: '14px'
  },
  entregadoresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  entregadorCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  entregadorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)'
  },
  entregadorAvatar: {
    width: '60px',
    height: '60px',
    backgroundColor: 'rgba(79, 209, 197, 0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4FD1C5',
    fontWeight: 'bold',
    fontSize: '24px'
  },
  infoEntregador: {
    flex: 1
  },
  entregadorNome: {
    color: '#4FD1C5',
    fontSize: '18px',
    margin: '0 0 5px 0'
  },
  entregadorContato: {
    color: '#81E6D9',
    fontSize: '14px'
  },
  whatsappLink: {
    color: '#81E6D9',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid'
  },
  entregadorBody: {
    padding: '20px'
  },
  entregadorDetalhes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  detalheItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#A0AEC0',
    fontSize: '14px'
  },
  entregadorFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderTop: '1px solid rgba(79, 209, 197, 0.08)'
  },
  statusActions: {
    display: 'flex',
    gap: '5px'
  },
  btnStatusAction: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  btnStatusActive: {
    borderColor: '#4FD1C5',
    backgroundColor: 'rgba(79, 209, 197, 0.1)'
  },
  entregadorAcoes: {
    display: 'flex',
    gap: '10px'
  },
  btnEditar: {
    width: '36px',
    height: '36px',
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    color: '#4FD1C5',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  btnExcluir: {
    width: '36px',
    height: '36px',
    backgroundColor: 'rgba(245, 101, 101, 0.1)',
    color: '#F56565',
    border: '1px solid rgba(245, 101, 101, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
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
  statusContainer: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px'
  },
  emptyStatus: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#A0AEC0'
  },
  pedidosGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  pedidoCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(79, 209, 197, 0.08)',
    borderRadius: '8px',
    padding: '20px'
  },
  pedidoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  pedidoInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  pedidoNumero: {
    color: '#F6E05E',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  pedidoCliente: {
    color: '#81E6D9',
    fontSize: '14px'
  },
  pedidoStatus: {
    color: '#ED8936',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center'
  },
  pedidoBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px'
  },
  pedidoEndereco: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    color: '#A0AEC0',
    fontSize: '14px'
  },
  infoEntregadorPedido: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    borderRadius: '8px'
  },
  entregadorVeiculo: {
    color: '#A0AEC0',
    fontSize: '12px'
  },
  pedidoDetalhes: {
    display: 'flex',
    gap: '20px'
  },
  pedidoActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  btnContatar: {
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    color: '#4FD1C5',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnContatarEntregador: {
    backgroundColor: 'rgba(237, 137, 54, 0.1)',
    color: '#ED8936',
    border: '1px solid rgba(237, 137, 54, 0.2)',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnEntregue: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    color: '#48BB78',
    border: '1px solid rgba(72, 187, 120, 0.2)',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

export default Entregadores;