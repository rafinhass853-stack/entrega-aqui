import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, MapPin, Home, Phone, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from './firebase'; 
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';

const Cadastro = ({ onVoltar, onContinuar, dadosCliente: dadosIniciais }) => {
  const [loading, setLoading] = useState(false);
  const [buscandoTelefone, setBuscandoTelefone] = useState(false);
  const [cadastroEncontrado, setCadastroEncontrado] = useState(false);
  
  const [dados, setDados] = useState({
    nomeCompleto: dadosIniciais?.nomeCompleto || '',
    rua: dadosIniciais?.rua || '',
    numero: dadosIniciais?.numero || '',
    bairro: dadosIniciais?.bairro || '',
    cidade: dadosIniciais?.cidade || 'Araraquara',
    telefone: dadosIniciais?.telefone || '',
    isWhatsapp: dadosIniciais?.isWhatsapp || false,
    complemento: dadosIniciais?.complemento || ''
  });

  const [erros, setErros] = useState({});

  // Efeito para buscar cadastro automaticamente quando o telefone estiver completo
  useEffect(() => {
    const telefoneLimpo = dados.telefone.replace(/\D/g, '');
    if (telefoneLimpo.length >= 10) { // Fixos (10) ou Celulares (11)
      const delayBusca = setTimeout(() => {
        buscarCadastroPorTelefone(dados.telefone);
      }, 500); // Pequeno delay para esperar o usuário parar de digitar
      return () => clearTimeout(delayBusca);
    }
  }, [dados.telefone]);

  const buscarCadastroPorTelefone = async (tel) => {
    setBuscandoTelefone(true);
    try {
      const q = query(
        collection(db, "Cadastros_clientes"), 
        where("telefone", "==", tel),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const dadosExistentes = querySnapshot.docs[0].data();
        setDados(prev => ({
          ...prev,
          ...dadosExistentes
        }));
        setCadastroEncontrado(true);
        // Limpa avisos de erro se encontrar o cadastro
        setErros({});
        
        // Remove a mensagem de sucesso após 3 segundos
        setTimeout(() => setCadastroEncontrado(false), 3000);
      }
    } catch (error) {
      console.error("Erro ao buscar cadastro:", error);
    } finally {
      setBuscandoTelefone(false);
    }
  };

  const handleChange = (field, value) => {
    setDados(prev => ({ ...prev, [field]: value }));
    if (erros[field]) setErros(prev => ({ ...prev, [field]: '' }));
  };

  const validarDados = () => {
    const novosErros = {};
    if (!dados.nomeCompleto.trim()) novosErros.nomeCompleto = 'Nome completo é obrigatório';
    if (!dados.rua.trim()) novosErros.rua = 'Rua é obrigatória';
    if (!dados.numero.trim()) novosErros.numero = 'Número é obrigatório';
    if (!dados.bairro.trim()) novosErros.bairro = 'Bairro é obrigatório';
    if (!dados.telefone.trim()) novosErros.telefone = 'Telefone é obrigatório';
    
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleContinuar = async () => {
    if (validarDados()) {
      setLoading(true);
      try {
        // Opcional: Você pode querer verificar se já existe antes de salvar novamente
        // Para evitar duplicados, ou apenas seguir se já foi buscado.
        await addDoc(collection(db, "Cadastros_clientes"), {
          ...dados,
          dataAtualizacao: serverTimestamp()
        });
        
        onContinuar(dados);
      } catch (error) {
        console.error("Erro:", error);
        alert("Erro ao salvar dados.");
      } finally {
        setLoading(false);
      }
    }
  };

  const styles = {
    // ... (mantendo seus estilos originais e adicionando os novos abaixo)
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    header: { backgroundColor: '#0F3460', padding: '20px', position: 'sticky', top: 0, zIndex: 100, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' },
    headerContent: { display: 'flex', alignItems: 'center', gap: '15px' },
    backButton: { background: 'none', border: 'none', color: 'white', cursor: 'pointer' },
    headerTitle: { color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' },
    content: { padding: '20px', maxWidth: '600px', margin: '0 auto' },
    titulo: { fontSize: '24px', fontWeight: '900', color: '#0F3460', margin: '0 0 10px 0', textAlign: 'center' },
    subtitulo: { fontSize: '16px', color: '#64748B', margin: '0 0 30px 0', textAlign: 'center' },
    formContainer: { backgroundColor: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
    formGroup: { marginBottom: '25px' },
    formLabel: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '600', color: '#0F3460', marginBottom: '8px' },
    inputGroup: { position: 'relative' },
    inputIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 2 },
    input: { width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px', color: '#0F3460', backgroundColor: '#F8FAFC' },
    autoFillBanner: { 
        display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ECFDF5', 
        color: '#059669', padding: '10px 15px', borderRadius: '10px', marginBottom: '20px',
        fontSize: '14px', fontWeight: '500', border: '1px solid #10B981'
    },
    continuarButton: { backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '12px', padding: '18px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', width: '100%', marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' },
    continuarButtonDisabled: { backgroundColor: '#94A3B8', cursor: 'not-allowed' },
    loaderIcon: { position: 'absolute', right: '15px', top: '35%', color: '#10B981', animation: 'spin 1s linear infinite' }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}><ArrowLeft size={24} /></button>
          <h2 style={styles.headerTitle}>Identificação</h2>
        </div>
      </header>

      <div style={styles.content}>
        <h1 style={styles.titulo}>Boas-vindas!</h1>
        <p style={styles.subtitulo}>Digite seu telefone para agilizar o pedido</p>

        <div style={styles.formContainer}>
          {/* Campo de Telefone Primeiro para a busca */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}><Phone size={18} /> Telefone celular</label>
            <div style={styles.inputGroup}>
              <Phone size={20} style={styles.inputIcon} />
              <input
                type="tel"
                value={dados.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(16) 99999-9999"
                style={{ ...styles.input, ...(erros.telefone ? {borderColor: '#EF4444'} : {}) }}
              />
              {buscandoTelefone && <Loader2 size={20} style={styles.loaderIcon} className="animate-spin" />}
            </div>
            {erros.telefone && <p style={{color: '#EF4444', fontSize: '12px'}}>{erros.telefone}</p>}
          </div>

          {cadastroEncontrado && (
            <div style={styles.autoFillBanner}>
              <CheckCircle2 size={18} /> Cadastro encontrado! Preenchemos seus dados.
            </div>
          )}

          <hr style={{marginBottom: '25px', border: 'none', borderTop: '1px solid #F1F5F9'}} />

          {/* Restante do Formulário */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}><User size={18} /> Nome completo</label>
            <div style={styles.inputGroup}>
              <User size={20} style={styles.inputIcon} />
              <input
                type="text"
                value={dados.nomeCompleto}
                onChange={(e) => handleChange('nomeCompleto', e.target.value)}
                placeholder="Como quer ser chamado?"
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}><MapPin size={18} /> Rua</label>
              <input
                type="text"
                value={dados.rua}
                onChange={(e) => handleChange('rua', e.target.value)}
                placeholder="Endereço"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}><Home size={18} /> Nº</label>
              <input
                type="text"
                value={dados.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                placeholder="Ex: 123"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Bairro</label>
            <input
              type="text"
              value={dados.bairro}
              onChange={(e) => handleChange('bairro', e.target.value)}
              placeholder="Ex: Vila Santana"
              style={styles.input}
            />
          </div>

          <button
            onClick={handleContinuar}
            style={{ ...styles.continuarButton, ...(loading ? styles.continuarButtonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Confirmar Endereço'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;