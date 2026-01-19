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
      { nome: 'Centro', taxa: 5.00 }
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
    if (user?.uid) {
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
    novosHorarios[index][field] = value;
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
      bairros: [...prev.bairros, { nome: '', taxa: 5.00 }]
    }));
  };

  const removerBairro = (index) => {
    const novosBairros = config.bairros.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, bairros: novosBairros }));
  };

  const handleNotificacaoChange = (campo, valor) => {
    setConfig(prev => ({
      ...prev,
      notificacoes: { ...prev.notificacoes, [campo]: valor }
    }));
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
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
            <p style={styles.subtitle}>Configure as regras de funcionamento do seu estabelecimento</p>
          </div>
        </header>

        <form onSubmit={handleSalvarConfig} style={styles.form}>
          {/* Seção Horários */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🕒 Horários de Funcionamento</h2>
            <div style={styles.horariosGrid}>
              {diasDaSemana.map((dia, index) => {
                const horario = config.horarios[index] || { dia: dia.key, aberto: false, inicio: '00:00', fim: '00:00' };
                return (
                  <div key={dia.key} style={styles.horarioCard}>
                    <div style={styles.checkboxGroup}>
                      <input
                        type="checkbox"
                        id={`aberto-${dia.key}`}
                        checked={horario.aberto}
                        onChange={(e) => handleHorarioChange(index, 'aberto', e.target.checked)}
                      />
                      <label htmlFor={`aberto-${dia.key}`} style={styles.checkboxLabel}>{dia.label}</label>
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

          {/* Seção Logística */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📍 Raio de Entrega e Taxas</h2>
            <div style={styles.raioGrid}>
              <div style={styles.raioCard}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Raio de Entrega (km)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={config.raioEntrega}
                    onChange={(e) => setConfig(prev => ({ ...prev, raioEntrega: parseFloat(e.target.value) }))}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Taxa Base de Entrega</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={config.taxaEntregaBase}
                    onChange={(e) => setConfig(prev => ({ ...prev, taxaEntregaBase: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
              <div style={styles.calculoCard}>
                <h4 style={styles.calculoTitle}>🧮 Simulação (3km)</h4>
                <div style={styles.calculoTotal}>
                  <strong>Estimativa Total:</strong>
                  <strong>{formatarMoeda(config.taxaEntregaBase + (config.taxaPorKm * 2))}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Seção Bairros */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🏘️ Taxas por Bairro</h2>
            <div style={styles.bairrosContainer}>
              {config.bairros.map((bairro, index) => (
                <div key={index} style={styles.bairroRow}>
                  <input
                    style={styles.input}
                    value={bairro.nome}
                    onChange={(e) => handleBairroChange(index, 'nome', e.target.value)}
                    placeholder="Nome do Bairro"
                  />
                  <input
                    style={styles.input}
                    type="number"
                    value={bairro.taxa}
                    onChange={(e) => handleBairroChange(index, 'taxa', parseFloat(e.target.value))}
                  />
                  <button type="button" style={styles.btnRemover} onClick={() => removerBairro(index)}>🗑️</button>
                </div>
              ))}
              <button type="button" style={styles.btnAdicionar} onClick={adicionarBairro}>➕ Adicionar Bairro</button>
            </div>
          </div>

          {/* Ações Finais */}
          <div style={styles.actions}>
            <button type="button" style={styles.btnCancelar} onClick={() => window.location.reload()}>Cancelar</button>
            <button type="submit" style={styles.btnSalvar} disabled={loading}>
              {loading ? 'Salvando...' : '💾 Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '20px' },
  header: { marginBottom: '40px', borderBottom: '1px solid rgba(79, 209, 197, 0.1)' },
  title: { color: '#4FD1C5', fontSize: '26px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  form: { display: 'flex', flexDirection: 'column', gap: '30px' },
  section: { backgroundColor: 'rgba(0, 35, 40, 0.6)', borderRadius: '12px', padding: '25px', border: '1px solid rgba(79, 209, 197, 0.1)' },
  sectionTitle: { color: '#4FD1C5', fontSize: '18px', marginBottom: '20px' },
  horariosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' },
  horarioCard: { backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '8px' },
  checkboxGroup: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  checkboxLabel: { color: '#81E6D9', fontSize: '14px' },
  horarioInputs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { color: '#81E6D9', fontSize: '12px' },
  input: { backgroundColor: 'rgba(0, 23, 26, 0.8)', border: '1px solid rgba(79, 209, 197, 0.2)', borderRadius: '6px', padding: '10px', color: '#fff' },
  inputTime: { backgroundColor: 'rgba(0, 23, 26, 0.8)', border: '1px solid rgba(79, 209, 197, 0.2)', borderRadius: '6px', padding: '8px', color: '#fff' },
  raioGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  raioCard: { display: 'flex', flexDirection: 'column', gap: '15px' },
  calculoCard: { backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '20px', borderRadius: '8px' },
  calculoTitle: { color: '#4FD1C5', fontSize: '14px', marginBottom: '10px' },
  calculoTotal: { display: 'flex', justifyContent: 'space-between', color: '#81E6D9', borderTop: '1px solid #222', paddingTop: '10px' },
  bairrosContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  bairroRow: { display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px' },
  btnRemover: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' },
  btnAdicionar: { background: 'rgba(79, 209, 197, 0.1)', color: '#4FD1C5', border: '1px dashed #4FD1C5', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '15px' },
  btnCancelar: { background: 'none', color: '#A0AEC0', border: '1px solid #444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  btnSalvar: { backgroundColor: '#4FD1C5', color: '#00171A', border: 'none', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Configuracoes;