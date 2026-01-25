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
            <p style={styles.subtitle}>Configure os horários de funcionamento do seu estabelecimento</p>
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

          {/* Ações Finais */}
          <div style={styles.actions}>
            <button type="button" style={styles.btnCancelar} onClick={() => window.location.reload()}>Cancelar</button>
            <button type="submit" style={styles.btnSalvar} disabled={loading}>
              {loading ? 'Salvando...' : '💾 Salvar Horários'}
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
  inputTime: { backgroundColor: 'rgba(0, 23, 26, 0.8)', border: '1px solid rgba(79, 209, 197, 0.2)', borderRadius: '6px', padding: '8px', color: '#fff' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '15px' },
  btnCancelar: { background: 'none', color: '#A0AEC0', border: '1px solid #444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  btnSalvar: { backgroundColor: '#4FD1C5', color: '#00171A', border: 'none', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Configuracoes;