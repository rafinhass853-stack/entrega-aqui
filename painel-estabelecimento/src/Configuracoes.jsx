import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

const Configuracoes = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    // Horários de Funcionamento
    horarios: [
      { dia: 'segunda', aberto: true, inicio: '18:00', fim: '23:00' },
      { dia: 'terca', aberto: true, inicio: '18:00', fim: '23:00' },
      { dia: 'quarta', aberto: true, inicio: '18:00', fim: '23:00' },
      { dia: 'quinta', aberto: true, inicio: '18:00', fim: '23:00' },
      { dia: 'sexta', aberto: true, inicio: '18:00', fim: '00:00' },
      { dia: 'sabado', aberto: true, inicio: '17:00', fim: '00:00' },
      { dia: 'domingo', aberto: true, inicio: '17:00', fim: '23:00' }
    ],
    
    // Raio de Entrega
    raioEntrega: 5,
    taxaEntregaBase: 5.00,
    taxaPorKm: 2.00,
    valorMinimoPedido: 15.00,
    
    // Taxas por Bairro
    bairros: [
      { nome: 'Centro', taxa: 5.00 },
      { nome: 'Vila Nova', taxa: 7.00 },
      { nome: 'Jardins', taxa: 8.00 }
    ],
    
    // Impressão
    impressoraAtiva: true,
    impressoraNome: 'EPSON-TM-T20',
    copiasCozinha: 1,
    copiasBalcao: 1,
    
    // Notificações
    notificacoes: {
      novoPedido: true,
      pedidoPronto: true,
      entregadorChegou: true,
      pagamentoConfirmado: true,
      alertasEstoque: true
    },
    
    // Sistema
    tempoPreparoPadrao: 30,
    tempoEntregaEstimado: 45,
    lojaAberta: true
  });

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const configRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'sistema');
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        setConfig(prev => ({
          ...prev,
          ...configSnap.data()
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const handleSalvarConfig = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const configRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'sistema');
      await setDoc(configRef, {
        ...config,
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleHorarioChange = (index, field, value) => {
    const novosHorarios = [...config.horarios];
    
    if (field === 'aberto') {
      novosHorarios[index].aberto = value;
    } else if (field === 'inicio' || field === 'fim') {
      novosHorarios[index][field] = value;
    }
    
    setConfig(prev => ({ ...prev, horarios: novosHorarios }));
  };

  const handleBairroChange = (index, field, value) => {
    const novosBairros = [...config.bairros];
    novosBairros[index][field] = value;
    setConfig(prev => ({ ...prev, bairros: novosBairros }));
  };

  const adicionarBairro = () => {
    setConfig(prev => ({
      ...prev,
      bairros: [
        ...prev.bairros,
        { nome: '', taxa: 5.00 }
      ]
    }));
  };

  const removerBairro = (index) => {
    const novosBairros = config.bairros.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, bairros: novosBairros }));
  };

  const handleNotificacaoChange = (campo, valor) => {
    setConfig(prev => ({
      ...prev,
      notificacoes: {
        ...prev.notificacoes,
        [campo]: valor
      }
    }));
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const diasDaSemana = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca', label: 'Terça-feira' },
    { key: 'quarta', label: 'Quarta-feira' },
    { key: 'quinta', label: 'Quinta-feira' },
    { key: 'sexta', label: 'Sexta-feira' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>⚙️ Configurações do Sistema</h1>
            <p style={styles.subtitle}>
              Configure as regras de funcionamento do seu estabelecimento
            </p>
          </div>
        </header>

        <form onSubmit={handleSalvarConfig} style={styles.form}>
          {/* Horários de Funcionamento */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🕒 Horários de Funcionamento</h2>
            <div style={styles.horariosGrid}>
              {diasDaSemana.map((dia, index) => {
                const horario = config.horarios.find(h => h.dia === dia.key) || config.horarios[index];
                
                return (
                  <div key={dia.key} style={styles.horarioCard}>
                    <div style={styles.horarioHeader}>
                      <div style={styles.checkboxGroup}>
                        <input
                          type="checkbox"
                          id={`aberto-${dia.key}`}
                          checked={horario.aberto}
                          onChange={(e) => handleHorarioChange(index, 'aberto', e.target.checked)}
                        />
                        <label htmlFor={`aberto-${dia.key}`} style={styles.checkboxLabel}>
                          {dia.label}
                        </label>
                      </div>
                    </div>
                    
                    <div style={styles.horarioInputs}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Abre</label>
                        <input
                          style={styles.inputTime}
                          type="time"
                          value={horario.inicio}
                          onChange={(e) => handleHorarioChange(index, 'inicio', e.target.value)}
                          disabled={!horario.aberto}
                        />
                      </div>
                      
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Fecha</label>
                        <input
                          style={styles.inputTime}
                          type="time"
                          value={horario.fim}
                          onChange={(e) => handleHorarioChange(index, 'fim', e.target.value)}
                          disabled={!horario.aberto}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raio de Entrega */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📍 Raio de Entrega e Taxas</h2>
            <div style={styles.raioGrid}>
              <div style={styles.raioCard}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Raio de Entrega (km)</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.5"
                    value={config.raioEntrega}
                    onChange={(e) => setConfig(prev => ({ ...prev, raioEntrega: parseFloat(e.target.value) }))}
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Taxa Base de Entrega</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={config.taxaEntregaBase}
                    onChange={(e) => setConfig(prev => ({ ...prev, taxaEntregaBase: parseFloat(e.target.value) }))}
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Taxa por Km Adicional</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={config.taxaPorKm}
                    onChange={(e) => setConfig(prev => ({ ...prev, taxaPorKm: parseFloat(e.target.value) }))}
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Valor Mínimo do Pedido</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={config.valorMinimoPedido}
                    onChange={(e) => setConfig(prev => ({ ...prev, valorMinimoPedido: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div style={styles.calculoCard}>
                <h4 style={styles.calculoTitle}>🧮 Cálculo Exemplo</h4>
                <div style={styles.calculoExemplo}>
                  <div style={styles.calculoItem}>
                    <span>Distância: 3km</span>
                    <span>{formatarMoeda(config.taxaEntregaBase)}</span>
                  </div>
                  <div style={styles.calculoItem}>
                    <span>Adicional (3km - 1km): 2km</span>
                    <span>{formatarMoeda(config.taxaPorKm * 2)}</span>
                  </div>
                  <div style={styles.calculoTotal}>
                    <strong>Taxa Total:</strong>
                    <strong>{formatarMoeda(config.taxaEntregaBase + (config.taxaPorKm * 2))}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Taxas por Bairro */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🏘️ Taxas por Bairro</h2>
            <div style={styles.bairrosContainer}>
              {config.bairros.map((bairro, index) => (
                <div key={index} style={styles.bairroRow}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nome do Bairro</label>
                    <input
                      style={styles.input}
                      value={bairro.nome}
                      onChange={(e) => handleBairroChange(index, 'nome', e.target.value)}
                      placeholder="Ex: Centro"
                    />
                  </div>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Taxa Fixa</label>
                    <input
                      style={styles.input}
                      type="number"
                      step="0.01"
                      value={bairro.taxa}
                      onChange={(e) => handleBairroChange(index, 'taxa', parseFloat(e.target.value))}
                    />
                  </div>
                  
                  <button
                    type="button"
                    style={styles.btnRemover}
                    onClick={() => removerBairro(index)}
                    disabled={config.bairros.length <= 1}
                  >
                    🗑️
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                style={styles.btnAdicionar}
                onClick={adicionarBairro}
              >
                ➕ Adicionar Bairro
              </button>
            </div>
          </div>

          {/* Configurações de Impressão */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🖨️ Impressão Automática</h2>
            <div style={styles.impressaoGrid}>
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="impressoraAtiva"
                  checked={config.impressoraAtiva}
                  onChange={(e) => setConfig(prev => ({ ...prev, impressoraAtiva: e.target.checked }))}
                />
                <label htmlFor="impressoraAtiva" style={styles.checkboxLabel}>
                  Ativar impressão automática
                </label>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nome da Impressora</label>
                <input
                  style={styles.input}
                  value={config.impressoraNome}
                  onChange={(e) => setConfig(prev => ({ ...prev, impressoraNome: e.target.value }))}
                  disabled={!config.impressoraAtiva}
                />
              </div>
              
              <div style={styles.inputGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cópias Cozinha</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={config.copiasCozinha}
                    onChange={(e) => setConfig(prev => ({ ...prev, copiasCozinha: parseInt(e.target.value) }))}
                    disabled={!config.impressoraAtiva}
                    min="1"
                    max="5"
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cópias Balcão</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={config.copiasBalcao}
                    onChange={(e) => setConfig(prev => ({ ...prev, copiasBalcao: parseInt(e.target.value) }))}
                    disabled={!config.impressoraAtiva}
                    min="0"
                    max="5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notificações */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🔔 Notificações do Sistema</h2>
            <div style={styles.notificacoesGrid}>
              {Object.entries(config.notificacoes).map(([key, value]) => {
                const labels = {
                  novoPedido: 'Novo pedido recebido',
                  pedidoPronto: 'Pedido pronto para entrega',
                  entregadorChegou: 'Entregador chegou',
                  pagamentoConfirmado: 'Pagamento confirmado',
                  alertasEstoque: 'Alertas de estoque baixo'
                };
                
                return (
                  <div key={key} style={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id={key}
                      checked={value}
                      onChange={(e) => handleNotificacaoChange(key, e.target.checked)}
                    />
                    <label htmlFor={key} style={styles.checkboxLabel}>
                      {labels[key]}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configurações Gerais */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>⚡ Configurações Gerais</h2>
            <div style={styles.geralGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Tempo de Preparo Padrão (min)</label>
                <input
                  style={styles.input}
                  type="number"
                  value={config.tempoPreparoPadrao}
                  onChange={(e) => setConfig(prev => ({ ...prev, tempoPreparoPadrao: parseInt(e.target.value) }))}
                  min="5"
                  max="120"
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Tempo de Entrega Estimado (min)</label>
                <input
                  style={styles.input}
                  type="number"
                  value={config.tempoEntregaEstimado}
                  onChange={(e) => setConfig(prev => ({ ...prev, tempoEntregaEstimado: parseInt(e.target.value) }))}
                  min="15"
                  max="120"
                />
              </div>
              
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="lojaAberta"
                  checked={config.lojaAberta}
                  onChange={(e) => setConfig(prev => ({ ...prev, lojaAberta: e.target.checked }))}
                />
                <label htmlFor="lojaAberta" style={styles.checkboxLabel}>
                  Loja aberta para receber pedidos
                </label>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.btnCancelar}
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={styles.btnSalvar}
              disabled={loading}
            >
              {loading ? 'Salvando...' : '💾 Salvar Todas as Configurações'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
  header: { 
    marginBottom: '40px', 
    paddingBottom: '20px', 
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)' 
  },
  title: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '40px'
  },
  section: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px'
  },
  sectionTitle: {
    color: '#4FD1C5',
    fontSize: '20px',
    marginBottom: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  horariosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px'
  },
  horarioCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(79, 209, 197, 0.08)',
    borderRadius: '8px',
    padding: '20px'
  },
  horarioHeader: {
    marginBottom: '15px'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  checkboxLabel: {
    color: '#81E6D9',
    fontSize: '14px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  horarioInputs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
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
  inputTime: {
    backgroundColor: 'rgba(0, 23, 26, 0.8)',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    color: '#fff',
    outline: 'none',
    fontSize: '14px',
    fontFamily: 'monospace'
  },
  raioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px'
  },
  raioCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  calculoCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(79, 209, 197, 0.08)',
    borderRadius: '8px',
    padding: '20px'
  },
  calculoTitle: {
    color: '#4FD1C5',
    fontSize: '16px',
    marginBottom: '15px'
  },
  calculoExemplo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  calculoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#A0AEC0',
    fontSize: '14px'
  },
  calculoTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '10px',
    borderTop: '1px solid rgba(79, 209, 197, 0.2)',
    color: '#81E6D9',
    fontSize: '16px'
  },
  bairrosContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  bairroRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr auto',
    gap: '15px',
    alignItems: 'end'
  },
  btnRemover: {
    backgroundColor: 'rgba(245, 101, 101, 0.1)',
    color: '#F56565',
    border: '1px solid rgba(245, 101, 101, 0.2)',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnAdicionar: {
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    color: '#4FD1C5',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '10px'
  },
  impressaoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  notificacoesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px'
  },
  geralGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '20px',
    padding: '20px 0'
  },
  btnCancelar: {
    backgroundColor: 'transparent',
    color: '#A0AEC0',
    border: '1px solid rgba(79, 209, 197, 0.3)',
    padding: '12px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  btnSalvar: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }
};

export default Configuracoes;