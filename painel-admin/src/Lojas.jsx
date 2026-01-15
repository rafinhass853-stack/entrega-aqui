import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, onSnapshot, orderBy, Timestamp } from "firebase/firestore";

const Lojas = () => {
  const [formData, setFormData] = useState({
    cliente: '',
    cnpj: '',
    telefone: '',
    whatsapp: '',
    responsavel: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    loginEmail: '',
    loginUsuario: '',
    senha: ''
  });

  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Buscar estabelecimentos cadastrados
  useEffect(() => {
    setIsLoadingList(true);
    const q = query(collection(db, "estabelecimentos"), orderBy("dataCadastro", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const estabelecimentosData = [];
      querySnapshot.forEach((doc) => {
        estabelecimentosData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setEstabelecimentos(estabelecimentosData);
      setIsLoadingList(false);
    });

    return () => unsubscribe();
  }, []);

  // Formatações
  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      if (numbers.length <= 2) return numbers;
      else if (numbers.length <= 5) return numbers.replace(/^(\d{2})(\d+)/, '$1.$2');
      else if (numbers.length <= 8) return numbers.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
      else if (numbers.length <= 12) return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
      else return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
    }
    return numbers.slice(0, 18);
  };

  const formatTelefone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      if (numbers.length <= 2) return numbers;
      else if (numbers.length <= 6) return numbers.replace(/^(\d{2})(\d+)/, '($1) $2');
      else return numbers.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
    } else {
      return numbers.replace(/^(\d{2})(\d{1})(\d{4})(\d+)/, '($1) $2 $3-$4').slice(0, 16);
    }
  };

  const formatCEP = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 8) {
      if (numbers.length <= 5) return numbers;
      else return numbers.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2-$3');
    }
    return numbers.slice(0, 10);
  };

  // Formatar data para exibição
  const formatarData = (data) => {
    if (data && data.toDate) {
      const date = data.toDate();
      return date.toLocaleDateString('pt-BR');
    }
    if (data && typeof data === 'string') {
      return new Date(data).toLocaleDateString('pt-BR');
    }
    return 'Data inválida';
  };

  // Handlers
  const handleCNPJChange = (e) => setFormData({...formData, cnpj: formatCNPJ(e.target.value)});
  const handleTelefoneChange = (e) => setFormData({...formData, telefone: formatTelefone(e.target.value)});
  const handleWhatsAppChange = (e) => setFormData({...formData, whatsapp: formatTelefone(e.target.value)});
  const handleCEPChange = (e) => setFormData({...formData, cep: formatCEP(e.target.value)});

  // Buscar CEP
  const buscarCEP = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      alert('CEP inválido. Digite 8 números.');
      return;
    }
    
    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || ''
        }));
      } else {
        alert('CEP não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Erro ao buscar CEP. Tente novamente.');
    } finally {
      setIsLoadingCEP(false);
    }
  };

  // Cadastrar loja
  const handleCadastrar = async (e) => {
    e.preventDefault();
    
    // Validações
    const erros = [];
    if (!formData.cliente) erros.push('Nome do Estabelecimento');
    if (!formData.cnpj.replace(/\D/g, '')) erros.push('CNPJ');
    if (!formData.telefone.replace(/\D/g, '')) erros.push('Telefone');
    if (!formData.responsavel) erros.push('Responsável');
    if (!formData.cep.replace(/\D/g, '')) erros.push('CEP');
    if (!formData.rua) erros.push('Rua');
    if (!formData.numero) erros.push('Número');
    if (!formData.bairro) erros.push('Bairro');
    if (!formData.cidade) erros.push('Cidade');
    if (!formData.uf) erros.push('UF');
    if (!formData.loginEmail) erros.push('E-mail de login');
    if (!formData.senha || formData.senha.length < 6) erros.push('Senha (mínimo 6 caracteres)');
    
    if (erros.length > 0) {
      alert(`❌ Preencha os seguintes campos:\n\n• ${erros.join('\n• ')}`);
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.loginEmail, formData.senha);
      const user = userCredential.user;

      const cnpjNumeros = formData.cnpj.replace(/\D/g, '');
      const telefoneNumeros = formData.telefone.replace(/\D/g, '');
      const whatsappNumeros = formData.whatsapp.replace(/\D/g, '');
      const cepNumeros = formData.cep.replace(/\D/g, '');

      // Salvar no Firestore
      await setDoc(doc(db, "estabelecimentos", user.uid), {
        cliente: formData.cliente,
        responsavel: formData.responsavel,
        cnpj: cnpjNumeros,
        cnpjFormatado: formData.cnpj,
        telefone: telefoneNumeros,
        telefoneFormatado: formData.telefone,
        whatsapp: whatsappNumeros,
        whatsappFormatado: formData.whatsapp,
        
        endereco: {
          cep: cepNumeros,
          cepFormatado: formData.cep,
          rua: formData.rua,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          uf: formData.uf,
          completo: `${formData.rua}, ${formData.numero}${formData.complemento ? ' - ' + formData.complemento : ''} - ${formData.bairro}, ${formData.cidade} - ${formData.uf}, ${formData.cep}`
        },
        
        loginEmail: formData.loginEmail,
        loginUsuario: formData.loginUsuario || formData.loginEmail.split('@')[0],
        
        tipoConta: 'loja',
        dataCadastro: Timestamp.now(),
        ativo: true,
        ultimaAtualizacao: Timestamp.now()
      });

      alert("✅ Estabelecimento cadastrado com sucesso!");
      
      // Limpar formulário
      setFormData({
        cliente: '', cnpj: '', telefone: '', whatsapp: '', responsavel: '',
        cep: '', rua: '', numero: '', complemento: '', bairro: '',
        cidade: '', uf: '', loginEmail: '', loginUsuario: '', senha: ''
      });
      
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      let errorMessage = "Erro ao cadastrar: ";
      if (error.code === 'auth/email-already-in-use') errorMessage = "❌ Este e-mail já está em uso.";
      else if (error.code === 'auth/invalid-email') errorMessage = "❌ E-mail inválido.";
      else if (error.code === 'auth/weak-password') errorMessage = "❌ Senha muito fraca.";
      else errorMessage += error.message;
      alert(errorMessage);
    }
  };

  // Estilos
  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' },
    title: { color: '#4FD1C5', marginBottom: '25px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' },
    section: { background: 'rgba(0, 20, 25, 0.4)', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(79, 209, 197, 0.2)' },
    sectionTitle: { color: '#4FD1C5', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: 'rgba(0, 20, 25, 0.4)', border: '1px solid rgba(79, 209, 197, 0.2)', borderRadius: '8px', color: 'white', outline: 'none' },
    button: { padding: '12px 20px', background: '#4FD1C5', border: 'none', borderRadius: '6px', color: '#001a1d', fontWeight: 'bold', cursor: 'pointer' },
    buttonSecondary: { background: 'rgba(79, 209, 197, 0.2)', color: '#4FD1C5', border: '1px solid rgba(79, 209, 197, 0.3)' },
    submitButton: { width: '100%', padding: '15px', background: '#4FD1C5', border: 'none', borderRadius: '8px', fontWeight: 'bold', color: '#001a1d', cursor: 'pointer', marginTop: '20px' },
    loading: { display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(79, 209, 197, 0.3)', borderRadius: '50%', borderTopColor: '#4FD1C5', animation: 'spin 1s linear infinite' },
    
    // Estilos da lista
    listaContainer: { marginTop: '40px' },
    listaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    totalBadge: { background: '#4FD1C5', color: '#001a1d', padding: '5px 10px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' },
    table: { width: '100%', borderCollapse: 'collapse', background: 'rgba(0, 20, 25, 0.4)', borderRadius: '8px', overflow: 'hidden' },
    tableHeader: { background: 'rgba(79, 209, 197, 0.1)', color: '#4FD1C5', padding: '15px', textAlign: 'left', borderBottom: '2px solid rgba(79, 209, 197, 0.2)' },
    tableCell: { padding: '15px', borderBottom: '1px solid rgba(79, 209, 197, 0.1)', color: 'white' },
    statusAtivo: { color: '#4FD1C5', fontWeight: 'bold' },
    statusInativo: { color: '#FF6B6B', fontWeight: 'bold' },
    loadingRow: { textAlign: 'center', padding: '40px', color: '#4FD1C5' },
    emptyRow: { textAlign: 'center', padding: '40px', color: '#ccc' }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏢 GESTÃO DE LOJAS</h2>
      
      <form onSubmit={handleCadastrar}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📋 Dados do Estabelecimento</h3>
          <div style={styles.grid}>
            <input style={styles.input} placeholder="Nome do Estabelecimento *" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})} required />
            <input style={styles.input} placeholder="CNPJ *" value={formData.cnpj} onChange={handleCNPJChange} required maxLength={18} />
            <input style={styles.input} placeholder="Telefone *" value={formData.telefone} onChange={handleTelefoneChange} required maxLength={15} />
            <input style={styles.input} placeholder="WhatsApp" value={formData.whatsapp} onChange={handleWhatsAppChange} maxLength={16} />
            <input style={styles.input} placeholder="Responsável *" value={formData.responsavel} onChange={e => setFormData({...formData, responsavel: e.target.value})} required />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📍 Endereço</h3>
          <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
            <input style={{...styles.input, flex: 1}} placeholder="CEP *" value={formData.cep} onChange={handleCEPChange} onBlur={buscarCEP} required maxLength={10} />
            <button type="button" onClick={buscarCEP} style={{...styles.button, ...styles.buttonSecondary}} disabled={isLoadingCEP}>
              {isLoadingCEP ? <span style={styles.loading}></span> : '🔍 Buscar'}
            </button>
          </div>
          <div style={styles.grid}>
            <input style={styles.input} placeholder="Rua *" value={formData.rua} onChange={e => setFormData({...formData, rua: e.target.value})} required />
            <input style={styles.input} placeholder="Número *" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} required />
            <input style={styles.input} placeholder="Bairro *" value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} required />
            <input style={styles.input} placeholder="Cidade *" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} required />
            <input style={styles.input} placeholder="Complemento" value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} />
            <input style={{...styles.input, textTransform: 'uppercase'}} placeholder="UF *" value={formData.uf} onChange={e => setFormData({...formData, uf: e.target.value.toUpperCase()})} maxLength={2} required />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🔐 Dados de Acesso</h3>
          <div style={styles.grid}>
            <input style={styles.input} placeholder="E-mail para Login *" type="email" value={formData.loginEmail} onChange={e => setFormData({...formData, loginEmail: e.target.value})} required />
            <input style={styles.input} placeholder="Nome de Usuário" value={formData.loginUsuario} onChange={e => setFormData({...formData, loginUsuario: e.target.value})} />
            <input style={styles.input} placeholder="Senha * (mín. 6 caracteres)" type="password" value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} required minLength={6} />
          </div>
        </div>

        <button type="submit" style={styles.submitButton}>💾 SALVAR ESTABELECIMENTO</button>
      </form>

      {/* Lista de Estabelecimentos Cadastrados */}
      <div style={styles.listaContainer}>
        <div style={styles.listaHeader}>
          <h2 style={{...styles.title, margin: 0}}>📋 ESTABELECIMENTOS CADASTRADOS</h2>
          <span style={styles.totalBadge}>{estabelecimentos.length} estabelecimentos</span>
        </div>

        <div style={styles.section}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Estabelecimento</th>
                <th style={styles.tableHeader}>CNPJ</th>
                <th style={styles.tableHeader}>Responsável</th>
                <th style={styles.tableHeader}>Cidade/UF</th>
                <th style={styles.tableHeader}>E-mail</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingList ? (
                <tr>
                  <td colSpan="7" style={styles.loadingRow}>
                    <span style={styles.loading}></span> Carregando estabelecimentos...
                  </td>
                </tr>
              ) : estabelecimentos.length === 0 ? (
                <tr>
                  <td colSpan="7" style={styles.emptyRow}>
                    Nenhum estabelecimento cadastrado ainda
                  </td>
                </tr>
              ) : (
                estabelecimentos.map((estabelecimento) => (
                  <tr key={estabelecimento.id}>
                    <td style={styles.tableCell}>
                      <strong>{estabelecimento.cliente}</strong><br/>
                      <small style={{color: '#ccc', fontSize: '12px'}}>
                        {estabelecimento.telefoneFormatado}
                      </small>
                    </td>
                    <td style={styles.tableCell}>{estabelecimento.cnpjFormatado}</td>
                    <td style={styles.tableCell}>{estabelecimento.responsavel}</td>
                    <td style={styles.tableCell}>
                      {estabelecimento.endereco?.cidade} / {estabelecimento.endereco?.uf}
                    </td>
                    <td style={styles.tableCell}>{estabelecimento.loginEmail}</td>
                    <td style={styles.tableCell}>
                      <span style={estabelecimento.ativo ? styles.statusAtivo : styles.statusInativo}>
                        {estabelecimento.ativo ? '✅ Ativo' : '❌ Inativo'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {formatarData(estabelecimento.dataCadastro)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #4FD1C5 !important; }
        button:hover { opacity: 0.9; transform: translateY(-1px); }
        tr:hover { background: rgba(79, 209, 197, 0.05); }
      `}</style>
    </div>
  );
};

export default Lojas;