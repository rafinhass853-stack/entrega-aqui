import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, UserCheck, MapPin } from 'lucide-react';
import { db } from './firebase'; 
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

const Cadastro = ({ onVoltar, onContinuar, dadosCliente: dadosIniciais, modoCheckout = false }) => {
  const [buscandoTelefone, setBuscandoTelefone] = useState(false);
  const [cadastroEncontrado, setCadastroEncontrado] = useState(false);
  const [clienteIdNoBanco, setClienteIdNoBanco] = useState(null);
  
  const [dados, setDados] = useState({
    nomeCompleto: dadosIniciais?.nomeCompleto || '',
    rua: dadosIniciais?.rua || '',
    numero: dadosIniciais?.numero || '',
    bairro: dadosIniciais?.bairro || '',
    cidade: dadosIniciais?.cidade || '', // Removido o fixo 'Araraquara'
    telefone: dadosIniciais?.telefone || '',
    complemento: dadosIniciais?.complemento || ''
  });

  const formatarTelefone = (valor) => {
    const limpo = valor.replace(/\D/g, '');
    return limpo
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleTelefoneChange = (e) => {
    const valorFormatado = formatarTelefone(e.target.value);
    setDados({ ...dados, telefone: valorFormatado });
  };

  useEffect(() => {
    const telefoneLimpo = dados.telefone.replace(/\D/g, '');
    if (telefoneLimpo.length >= 10) {
      const delay = setTimeout(() => buscarCadastro(dados.telefone), 800);
      return () => clearTimeout(delay);
    }
  }, [dados.telefone]);

  const buscarCadastro = async (tel) => {
    setBuscandoTelefone(true);
    try {
      const q = query(
        collection(db, "Cadastros_clientes"), 
        where("telefone", "==", tel), 
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const dadosDB = docSnap.data();
        setClienteIdNoBanco(docSnap.id);
        setDados(prev => ({ ...prev, ...dadosDB }));
        setCadastroEncontrado(true);
        setTimeout(() => setCadastroEncontrado(false), 4000);
      } else {
        setClienteIdNoBanco(null);
      }
    } catch (e) { 
      console.error("Erro ao buscar cadastro:", e); 
    } finally { 
      setBuscandoTelefone(false); 
    }
  };

  const handleFinalizar = async () => {
    // Adicionada a validação da cidade
    if (!dados.nomeCompleto || !dados.telefone || !dados.rua || !dados.numero || !dados.cidade) {
      alert("Por favor, preencha todos os campos obrigatórios, incluindo a Cidade.");
      return;
    }

    try {
      const payloadCliente = {
        ...dados,
        ultimaAtualizacao: serverTimestamp()
      };

      if (clienteIdNoBanco) {
        await updateDoc(doc(db, "Cadastros_clientes", clienteIdNoBanco), payloadCliente);
      } else {
        await addDoc(collection(db, "Cadastros_clientes"), {
          ...payloadCliente,
          dataCriacao: serverTimestamp()
        });
      }

      localStorage.setItem('dadosCliente', JSON.stringify(dados));
      onContinuar(dados);
      
    } catch (error) {
      console.error("Erro ao processar cadastro:", error);
      alert("Erro ao salvar cadastro.");
    }
  };

  const styles = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    header: { backgroundColor: '#0F3460', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' },
    content: { padding: '20px', maxWidth: '500px', margin: '0 auto' },
    form: { backgroundColor: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
    sectionTitle: { fontSize: '14px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' },
    inputGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#0F3460' },
    input: { width: '100%', padding: '14px 15px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '16px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }
  };

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      
      <header style={styles.header}>
        <ArrowLeft onClick={onVoltar} style={{cursor: 'pointer'}} />
        <h2 style={{margin: 0, fontSize: '18px', fontWeight: '700'}}>
          {modoCheckout ? 'Checkout' : 'Identificação'}
        </h2>
      </header>

      <div style={styles.content}>
        <div style={styles.form}>
          <div style={styles.sectionTitle}><UserCheck size={16}/> Meus Dados</div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Telefone Celular</label>
            <div style={{position: 'relative'}}>
              <input 
                type="tel" 
                value={dados.telefone} 
                onChange={handleTelefoneChange} 
                placeholder="(16) 99999-9999" 
                style={styles.input} 
              />
              {buscandoTelefone && (
                <Loader2 size={20} style={{position: 'absolute', right: 15, top: 14, animation: 'spin 1s linear infinite', color: '#10B981'}} />
              )}
            </div>
          </div>

          {cadastroEncontrado && (
            <div style={{padding: '12px', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '10px', marginBottom: '15px', fontSize: '13px', border: '1px solid #BBF7D0'}}>
              ✨ Dados encontrados! Você pode editá-los se necessário.
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Nome Completo</label>
            <input 
              type="text" 
              value={dados.nomeCompleto} 
              onChange={e => setDados({...dados, nomeCompleto: e.target.value})} 
              placeholder="Ex: Rafael de Sousa"
              style={styles.input} 
            />
          </div>

          <div style={{...styles.sectionTitle, marginTop: '25px'}}><MapPin size={16}/> Endereço</div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 80px', gap: '10px'}}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Rua</label>
              <input type="text" value={dados.rua} onChange={e => setDados({...dados, rua: e.target.value})} style={styles.input} placeholder="Rua..." />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nº</label>
              <input type="text" value={dados.numero} onChange={e => setDados({...dados, numero: e.target.value})} style={styles.input} placeholder="123" />
            </div>
          </div>

          {/* Grid para Bairro e Cidade lado a lado */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Bairro</label>
              <input type="text" value={dados.bairro} onChange={e => setDados({...dados, bairro: e.target.value})} style={styles.input} placeholder="Bairro..." />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Cidade</label>
              <input type="text" value={dados.cidade} onChange={e => setDados({...dados, cidade: e.target.value})} style={styles.input} placeholder="Cidade..." />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Referência / Complemento</label>
            <input type="text" value={dados.complemento} onChange={e => setDados({...dados, complemento: e.target.value})} style={styles.input} placeholder="Ex: Casa fundos" />
          </div>

          <button onClick={handleFinalizar} style={styles.btn}>
            {modoCheckout ? 'Ir para Pagamento' : 'Confirmar Cadastro'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;