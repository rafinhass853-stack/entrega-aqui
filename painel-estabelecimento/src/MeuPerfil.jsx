import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db, auth, storage } from './firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const MeuPerfil = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [perfil, setPerfil] = useState({
    nomeEstabelecimento: '',
    cnpj: '',
    telefone: '',
    email: user?.email || '',
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    fotoPerfil: null,
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
      const perfilRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'perfil');
      const perfilSnap = await getDoc(perfilRef);
      
      if (perfilSnap.exists()) {
        setPerfil(prev => ({
          ...prev,
          ...perfilSnap.data(),
          fotoUrl: perfilSnap.data().fotoUrl || null
        }));
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
      // Upload da imagem
      const nomeArquivo = `perfil_${user.uid}_${Date.now()}`;
      const storageRef = ref(storage, `perfis/${user.uid}/${nomeArquivo}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const urlImagem = await getDownloadURL(uploadResult.ref);

      // Atualizar no Firestore
      const perfilRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'perfil');
      await setDoc(perfilRef, {
        fotoUrl: urlImagem,
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      setPerfil(prev => ({ ...prev, fotoUrl: urlImagem }));
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const perfilRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'perfil');
      await setDoc(perfilRef, {
        ...perfil,
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleAlterarSenha = async (e) => {
    e.preventDefault();
    
    if (novaSenha !== confirmarSenha) {
      alert('As senhas não coincidem');
      return;
    }

    if (novaSenha.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Reautenticar usuário
      const credential = EmailAuthProvider.credential(
        user.email,
        senhaAtual
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Alterar senha
      await updatePassword(user, novaSenha);
      
      alert('Senha alterada com sucesso!');
      
      // Limpar campos
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Senha atual incorreta');
      } else {
        alert('Erro ao alterar senha');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPerfil(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEnderecoChange = (field, value) => {
    setPerfil(prev => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        [field]: value
      }
    }));
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>👤 Meu Perfil</h1>
          <p style={styles.subtitle}>
            Gerencie suas informações pessoais e da empresa
          </p>
        </header>

        <div style={styles.grid}>
          {/* Foto do Perfil */}
          <div style={styles.perfilSection}>
            <h2 style={styles.sectionTitle}>🖼️ Foto do Perfil</h2>
            <div style={styles.fotoContainer}>
              <div style={styles.fotoWrapper}>
                {perfil.fotoUrl ? (
                  <img src={perfil.fotoUrl} alt="Foto do Perfil" style={styles.foto} />
                ) : (
                  <div style={styles.fotoPlaceholder}>
                    {perfil.nomeEstabelecimento?.charAt(0) || 'E'}
                  </div>
                )}
              </div>
              
              <div style={styles.fotoActions}>
                <label style={styles.btnUpload}>
                  {uploading ? 'Enviando...' : '📷 Alterar Foto'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </label>
                {perfil.fotoUrl && (
                  <button 
                    style={styles.btnRemoverFoto}
                    onClick={() => handleImageChange({ target: { files: [null] } })}
                  >
                    🗑️ Remover
                  </button>
                )}
              </div>
              
              <p style={styles.fotoHint}>
                Recomendado: imagem quadrada, mínimo 400x400px
              </p>
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
                    placeholder="Ex: Pizzaria da Vila"
                    value={perfil.nomeEstabelecimento}
                    onChange={(e) => handleInputChange('nomeEstabelecimento', e.target.value)}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>CNPJ</label>
                  <input
                    style={styles.input}
                    placeholder="00.000.000/0001-00"
                    value={perfil.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Telefone *</label>
                  <input
                    style={styles.input}
                    placeholder="(11) 99999-9999"
                    value={perfil.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>E-mail *</label>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="seu@email.com"
                    value={perfil.email}
                    disabled
                    title="Para alterar o e-mail, entre em contato com o suporte"
                  />
                  <small style={styles.hint}>Contate o suporte para alterar o e-mail</small>
                </div>
              </div>

              <h3 style={styles.subSectionTitle}>📍 Endereço</h3>
              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>CEP</label>
                  <input
                    style={styles.input}
                    placeholder="00000-000"
                    value={perfil.endereco.cep}
                    onChange={(e) => handleEnderecoChange('cep', e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Rua</label>
                  <input
                    style={styles.input}
                    placeholder="Nome da rua"
                    value={perfil.endereco.rua}
                    onChange={(e) => handleEnderecoChange('rua', e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Número</label>
                  <input
                    style={styles.input}
                    placeholder="123"
                    value={perfil.endereco.numero}
                    onChange={(e) => handleEnderecoChange('numero', e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Bairro</label>
                  <input
                    style={styles.input}
                    placeholder="Centro"
                    value={perfil.endereco.bairro}
                    onChange={(e) => handleEnderecoChange('bairro', e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cidade</label>
                  <input
                    style={styles.input}
                    placeholder="São Paulo"
                    value={perfil.endereco.cidade}
                    onChange={(e) => handleEnderecoChange('cidade', e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Estado</label>
                  <select
                    style={styles.input}
                    value={perfil.endereco.estado}
                    onChange={(e) => handleEnderecoChange('estado', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="PR">Paraná</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="GO">Goiás</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="BA">Bahia</option>
                    <option value="SE">Sergipe</option>
                    <option value="AL">Alagoas</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PB">Paraíba</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="CE">Ceará</option>
                    <option value="PI">Piauí</option>
                    <option value="MA">Maranhão</option>
                    <option value="PA">Pará</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="RR">Roraima</option>
                    <option value="AC">Acre</option>
                    <option value="RO">Rondônia</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>
              </div>

              <div style={styles.formActions}>
                <button
                  type="submit"
                  style={styles.btnSalvar}
                  disabled={loading}
                >
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
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nova Senha *</label>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar Nova Senha *</label>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Digite novamente a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                />
              </div>

              <div style={styles.senhaRules}>
                <h4 style={styles.rulesTitle}>Regras da senha:</h4>
                <ul style={styles.rulesList}>
                  <li>Mínimo 6 caracteres</li>
                  <li>Use letras maiúsculas e minúsculas</li>
                  <li>Inclua números e símbolos</li>
                  <li>Não use senhas óbvias</li>
                </ul>
              </div>

              <div style={styles.formActions}>
                <button
                  type="submit"
                  style={styles.btnAlterarSenha}
                  disabled={loading}
                >
                  {loading ? 'Alterando...' : '🔑 Alterar Senha'}
                </button>
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
  header: { 
    marginBottom: '40px', 
    paddingBottom: '20px', 
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)' 
  },
  title: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '30px',
    alignItems: 'start'
  },
  perfilSection: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px'
  },
  infoSection: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px',
    gridColumn: 'span 2'
  },
  senhaSection: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px'
  },
  sectionTitle: {
    color: '#4FD1C5',
    fontSize: '18px',
    marginBottom: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  subSectionTitle: {
    color: '#81E6D9',
    fontSize: '16px',
    margin: '25px 0 15px 0'
  },
  fotoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  },
  fotoWrapper: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid rgba(79, 209, 197, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  foto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  fotoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 209, 197, 0.15)',
    color: '#4FD1C5',
    fontSize: '60px',
    fontWeight: 'bold'
  },
  fotoActions: {
    display: 'flex',
    gap: '15px'
  },
  btnUpload: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  btnRemoverFoto: {
    backgroundColor: 'rgba(245, 101, 101, 0.1)',
    color: '#F56565',
    border: '1px solid rgba(245, 101, 101, 0.2)',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  fotoHint: {
    color: '#A0AEC0',
    fontSize: '12px',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
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
  hint: {
    color: '#A0AEC0',
    fontSize: '12px',
    marginTop: '4px'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px'
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
  },
  btnAlterarSenha: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    color: '#48BB78',
    border: '1px solid rgba(72, 187, 120, 0.2)',
    padding: '12px 30px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  senhaRules: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '10px'
  },
  rulesTitle: {
    color: '#81E6D9',
    fontSize: '14px',
    marginBottom: '10px'
  },
  rulesList: {
    color: '#A0AEC0',
    fontSize: '12px',
    paddingLeft: '20px',
    margin: 0
  }
};

export default MeuPerfil;