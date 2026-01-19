import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db, auth, storage } from './firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

// --- FUNÇÕES DE MÁSCARA ---
const maskCNPJ = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

const maskPhone = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')
    .slice(0, 15);
};

const maskCEP = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
    .slice(0, 10);
};

const MeuPerfil = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [perfil, setPerfil] = useState({
    loginUsuario: '', 
    cnpj: '',
    whatsappFormatado: '',
    loginEmail: user?.email || '',
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    fotoUrl: null
  });

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  useEffect(() => {
    if (user) {
      fetchPerfil();
    }
  }, [user]);

  const fetchPerfil = async () => {
    try {
      // Puxando da raiz do estabelecimento para garantir sincronia com o card do cliente
      const perfilRef = doc(db, 'estabelecimentos', user.uid);
      const perfilSnap = await getDoc(perfilRef);
      
      if (perfilSnap.exists()) {
        const data = perfilSnap.data();
        setPerfil({
          loginUsuario: data.loginUsuario || '',
          cnpj: data.cnpj || '',
          whatsappFormatado: data.whatsappFormatado || '',
          loginEmail: data.loginEmail || user.email,
          endereco: data.endereco || { rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
          fotoUrl: data.fotoUrl || null
        });
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const nomeArquivo = `perfil_${user.uid}_${Date.now()}`;
      const storageRef = ref(storage, `perfis/${user.uid}/${nomeArquivo}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const urlImagem = await getDownloadURL(uploadResult.ref);

      // Atualiza o campo fotoUrl na raiz do estabelecimento
      const perfilRef = doc(db, 'estabelecimentos', user.uid);
      await updateDoc(perfilRef, {
        fotoUrl: urlImagem,
        ultimaAtualizacao: serverTimestamp()
      });

      setPerfil(prev => ({ ...prev, fotoUrl: urlImagem }));
      alert('Foto de perfil atualizada!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao carregar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const perfilRef = doc(db, 'estabelecimentos', user.uid);
      
      // Criamos um objeto limpo para salvar (sem caracteres na versão 'whatsapp' pura)
      const payload = {
        ...perfil,
        whatsapp: perfil.whatsappFormatado.replace(/\D/g, ''),
        ultimaAtualizacao: serverTimestamp()
      };

      await updateDoc(perfilRef, payload);
      alert('Informações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAlterarSenha = async (e) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) return alert('As senhas não coincidem');

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, novaSenha);
      alert('Senha alterada!');
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
    } catch (error) {
      alert('Erro ao alterar senha. Verifique a senha atual.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>👤 Meu Perfil</h1>
          <p style={styles.subtitle}>Gerencie as informações que os clientes visualizam</p>
        </header>

        <div style={styles.grid}>
          {/* Foto do Perfil */}
          <div style={styles.perfilSection}>
            <h2 style={styles.sectionTitle}>🖼️ Foto do Estabelecimento</h2>
            <div style={styles.fotoContainer}>
              <div style={styles.fotoWrapper}>
                {perfil.fotoUrl ? (
                  <img src={perfil.fotoUrl} alt="Logo" style={styles.foto} />
                ) : (
                  <div style={styles.fotoPlaceholder}>{perfil.loginUsuario?.charAt(0) || 'S'}</div>
                )}
              </div>
              
              <div style={styles.fotoActions}>
                <label style={styles.btnUpload}>
                  {uploading ? 'Enviando...' : '📷 Alterar Foto'}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} disabled={uploading} />
                </label>
              </div>
              <p style={styles.fotoHint}>Recomendado: 400x400px (Sincroniza com App do Cliente)</p>
            </div>
          </div>

          {/* Informações da Empresa */}
          <div style={styles.infoSection}>
            <h2 style={styles.sectionTitle}>🏪 Informações da Empresa</h2>
            <form onSubmit={handleSalvarPerfil} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nome do Estabelecimento *</label>
                  <input
                    style={styles.input}
                    value={perfil.loginUsuario}
                    onChange={(e) => setPerfil({...perfil, loginUsuario: e.target.value})}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>CNPJ</label>
                  <input
                    style={styles.input}
                    placeholder="00.000.000/0000-00"
                    value={perfil.cnpj}
                    onChange={(e) => setPerfil({...perfil, cnpj: maskCNPJ(e.target.value)})}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>WhatsApp / Telefone *</label>
                  <input
                    style={styles.input}
                    placeholder="(11) 00000-0000"
                    value={perfil.whatsappFormatado}
                    onChange={(e) => setPerfil({...perfil, whatsappFormatado: maskPhone(e.target.value)})}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>E-mail de Login *</label>
                  <input style={styles.input} value={perfil.loginEmail} disabled />
                  <small style={styles.hint}>Contate o suporte para alterar o e-mail</small>
                </div>
              </div>

              <h3 style={styles.subSectionTitle}>📍 Endereço</h3>
              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>CEP</label>
                  <input
                    style={styles.input}
                    placeholder="00.000-000"
                    value={perfil.endereco.cep}
                    onChange={(e) => setPerfil({...perfil, endereco: {...perfil.endereco, cep: maskCEP(e.target.value)}})}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Rua</label>
                  <input
                    style={styles.input}
                    value={perfil.endereco.rua}
                    onChange={(e) => setPerfil({...perfil, endereco: {...perfil.endereco, rua: e.target.value}})}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Número</label>
                  <input
                    style={styles.input}
                    value={perfil.endereco.numero}
                    onChange={(e) => setPerfil({...perfil, endereco: {...perfil.endereco, numero: e.target.value}})}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Bairro</label>
                  <input
                    style={styles.input}
                    value={perfil.endereco.bairro}
                    onChange={(e) => setPerfil({...perfil, endereco: {...perfil.endereco, bairro: e.target.value}})}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cidade</label>
                  <input
                    style={styles.input}
                    value={perfil.endereco.cidade}
                    onChange={(e) => setPerfil({...perfil, endereco: {...perfil.endereco, cidade: e.target.value}})}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Estado</label>
                  <select
                    style={styles.input}
                    value={perfil.endereco.estado}
                    onChange={(e) => setPerfil({...perfil, endereco: {...perfil.endereco, estado: e.target.value}})}
                  >
                    <option value="">Selecione...</option>
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                  </select>
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="submit" style={styles.btnSalvar} disabled={loading}>
                  {loading ? 'Salvando...' : '💾 Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Alterar Senha */}
          <div style={styles.senhaSection}>
            <h2 style={styles.sectionTitle}>🔐 Alterar Senha</h2>
            <form onSubmit={handleAlterarSenha} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Senha Atual *</label>
                <input style={styles.input} type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nova Senha *</label>
                <input style={styles.input} type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={6} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar Nova Senha *</label>
                <input style={styles.input} type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required />
              </div>
              <div style={styles.formActions}>
                <button type="submit" style={styles.btnAlterarSenha} disabled={loading}>🔑 Atualizar Senha</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
  header: { marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid rgba(79, 209, 197, 0.08)' },
  title: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', alignItems: 'start' },
  perfilSection: { backgroundColor: 'rgba(0, 35, 40, 0.6)', border: '1px solid rgba(79, 209, 197, 0.12)', borderRadius: '12px', padding: '30px' },
  infoSection: { backgroundColor: 'rgba(0, 35, 40, 0.6)', border: '1px solid rgba(79, 209, 197, 0.12)', borderRadius: '12px', padding: '30px', gridColumn: 'span 2' },
  senhaSection: { backgroundColor: 'rgba(0, 35, 40, 0.6)', border: '1px solid rgba(79, 209, 197, 0.12)', borderRadius: '12px', padding: '30px' },
  sectionTitle: { color: '#4FD1C5', fontSize: '18px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' },
  subSectionTitle: { color: '#81E6D9', fontSize: '16px', margin: '25px 0 15px 0' },
  fotoContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
  fotoWrapper: { width: '200px', height: '200px', borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(79, 209, 197, 0.3)', backgroundColor: 'rgba(0, 0, 0, 0.2)' },
  foto: { width: '100%', height: '100%', objectFit: 'cover' },
  fotoPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(79, 209, 197, 0.15)', color: '#4FD1C5', fontSize: '60px', fontWeight: 'bold' },
  fotoActions: { display: 'flex', gap: '15px' },
  btnUpload: { backgroundColor: '#4FD1C5', color: '#00171A', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  fotoHint: { color: '#A0AEC0', fontSize: '12px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { color: '#81E6D9', fontSize: '14px', fontWeight: '500' },
  input: { backgroundColor: 'rgba(0, 23, 26, 0.8)', border: '1px solid rgba(79, 209, 197, 0.2)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none', fontSize: '14px' },
  hint: { color: '#A0AEC0', fontSize: '12px', marginTop: '4px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px' },
  btnSalvar: { backgroundColor: '#4FD1C5', color: '#00171A', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  btnAlterarSenha: { backgroundColor: 'rgba(72, 187, 120, 0.1)', color: '#48BB78', border: '1px solid rgba(72, 187, 120, 0.2)', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};

export default MeuPerfil;