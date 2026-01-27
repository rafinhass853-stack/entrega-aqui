// MeuPerfil.jsx
import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db, storage } from './firebase';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from 'firebase/auth';
import {
  User, Mail, Phone, MapPin, Camera,
  Lock, Save, AlertCircle,
  Building, FileText, CheckCircle
} from 'lucide-react';

const MeuPerfil = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const horarioPadrao = {
    segunda: { abre: '09:00', fecha: '18:00' },
    terca: { abre: '09:00', fecha: '18:00' },
    quarta: { abre: '09:00', fecha: '18:00' },
    quinta: { abre: '09:00', fecha: '18:00' },
    sexta: { abre: '09:00', fecha: '18:00' },
    sabado: { abre: '09:00', fecha: '18:00' },
    domingo: { abre: '09:00', fecha: '18:00' }
  };

  const [perfil, setPerfil] = useState({
    loginUsuario: '',
    cnpj: '',
    whatsappFormatado: '',
    loginEmail: '',
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    fotoUrl: null,
    fotoPreview: null,
    descricao: '',
    // ✅ Agora isso vai ser salvo na SUBCOLEÇÃO
    horarioFuncionamento: horarioPadrao
  });

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Buscar perfil
  useEffect(() => {
    if (user?.uid) fetchPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const showMensagem = (tipo, texto, tempo = 5000) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), tempo);
  };

  const fetchPerfil = async () => {
    try {
      const perfilRef = doc(db, 'estabelecimentos', user.uid);
      const perfilSnap = await getDoc(perfilRef);

      // ✅ Horário vem da subcoleção: estabelecimentos/{uid}/config/horario
      const horarioRef = doc(db, 'estabelecimentos', user.uid, 'config', 'horario');
      const horarioSnap = await getDoc(horarioRef);

      const horarioDb = horarioSnap.exists()
        ? (horarioSnap.data()?.horarioFuncionamento || null)
        : null;

      if (perfilSnap.exists()) {
        const data = perfilSnap.data();

        setPerfil(prev => ({
          ...prev,
          loginUsuario: data.loginUsuario || '',
          cnpj: data.cnpj || '',
          whatsappFormatado: data.whatsappFormatado || '',
          loginEmail: data.loginEmail || user.email || '',
          endereco: data.endereco || prev.endereco,
          fotoUrl: data.fotoUrl || null,
          descricao: data.descricao || '',
          // ✅ se não existir no banco, usa padrão
          horarioFuncionamento: horarioDb || prev.horarioFuncionamento
        }));
      } else {
        // Mesmo sem doc, pelo menos carrega o horário (se existir)
        setPerfil(prev => ({
          ...prev,
          loginEmail: user.email || '',
          horarioFuncionamento: horarioDb || prev.horarioFuncionamento
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      showMensagem('error', 'Erro ao carregar perfil');
    }
  };

  // Máscaras
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

  // Upload de imagem
  const handleImageUpload = async (file) => {
    if (!file || !user?.uid) return null;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const nomeArquivo = `perfil_${user.uid}_${timestamp}`;
      const storageRef = ref(storage, `perfis/${user.uid}/${nomeArquivo}`);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setUploading(false);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setUploading(false);
      return null;
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    const tamanhoMaximo = 5 * 1024 * 1024;

    if (!tiposPermitidos.includes(file.type)) {
      showMensagem('error', 'Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > tamanhoMaximo) {
      showMensagem('error', 'Imagem muito grande. Máximo: 5MB');
      return;
    }

    setPerfil(prev => ({ ...prev, fotoUrl: file }));

    const reader = new FileReader();
    reader.onload = (ev) => setPerfil(prev => ({ ...prev, fotoPreview: ev.target.result }));
    reader.readAsDataURL(file);
  };

  // ✅ Salvar perfil (e horário na subcoleção)
  const salvarPerfil = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    setLoading(true);

    try {
      let fotoUrlFinal = perfil.fotoUrl;

      if (perfil.fotoUrl instanceof File) {
        const uploaded = await handleImageUpload(perfil.fotoUrl);
        if (uploaded) fotoUrlFinal = uploaded;
      }

      // 1) Atualiza o doc principal SEM horário
      const perfilRef = doc(db, 'estabelecimentos', user.uid);
      const dadosAtualizados = {
        loginUsuario: (perfil.loginUsuario || '').trim(),
        cnpj: perfil.cnpj || '',
        whatsappFormatado: perfil.whatsappFormatado || '',
        whatsapp: (perfil.whatsappFormatado || '').replace(/\D/g, ''),
        loginEmail: perfil.loginEmail || user.email || '',
        endereco: perfil.endereco || {},
        fotoUrl: fotoUrlFinal || null,
        descricao: perfil.descricao || '',
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(perfilRef, dadosAtualizados);

      // 2) Salva horário na SUBCOLEÇÃO: estabelecimentos/{uid}/config/horario
      const horarioRef = doc(db, 'estabelecimentos', user.uid, 'config', 'horario');
      await setDoc(
        horarioRef,
        {
          horarioFuncionamento: perfil.horarioFuncionamento || horarioPadrao,
          atualizadoEm: serverTimestamp()
        },
        { merge: true }
      );

      showMensagem('success', 'Perfil e horário salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      showMensagem('error', 'Erro ao salvar perfil');
    } finally {
      setLoading(false);
    }
  };

  // Alterar senha
  const alterarSenha = async (e) => {
    e.preventDefault();

    if (novaSenha !== confirmarSenha) {
      showMensagem('error', 'As senhas não coincidem');
      return;
    }
    if (novaSenha.length < 6) {
      showMensagem('error', 'A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, novaSenha);

      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');

      showMensagem('success', 'Senha alterada com sucesso!');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      showMensagem('error', 'Erro ao alterar senha. Verifique a senha atual.');
    } finally {
      setLoading(false);
    }
  };

  const estados = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO',
    'MA','MT','MS','MG','PA','PB','PR','PE','PI',
    'RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ];

  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
    header: {
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '1px solid rgba(79, 209, 197, 0.08)'
    },
    title: { color: '#4FD1C5', fontSize: '28px', marginBottom: '8px' },
    subtitle: { color: '#81E6D9', opacity: 0.8 },
    mensagem: (tipo) => ({
      padding: '15px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      backgroundColor: tipo === 'success' ? 'rgba(16, 185, 129, 0.1)' :
        tipo === 'error' ? 'rgba(245, 101, 101, 0.1)' :
          'rgba(79, 209, 197, 0.1)',
      border: `1px solid ${tipo === 'success' ? '#10B98140' : tipo === 'error' ? '#F5656540' : '#4FD1C540'}`,
      color: tipo === 'success' ? '#10B981' : tipo === 'error' ? '#F56565' : '#4FD1C5',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }),
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '30px',
      alignItems: 'start'
    },
    card: {
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
    fotoContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '30px'
    },
    fotoWrapper: {
      width: '200px',
      height: '200px',
      borderRadius: '50%',
      overflow: 'hidden',
      border: '3px solid rgba(79, 209, 197, 0.3)',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      position: 'relative'
    },
    foto: { width: '100%', height: '100%', objectFit: 'cover' },
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
      flexDirection: 'column',
      gap: '10px',
      width: '100%',
      alignItems: 'center'
    },
    btnUpload: {
      backgroundColor: '#4FD1C5',
      color: '#00171A',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      maxWidth: '250px',
      justifyContent: 'center'
    },
    fotoHint: { color: '#A0AEC0', fontSize: '12px', textAlign: 'center', marginTop: '10px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px'
    },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: {
      color: '#81E6D9',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    input: {
      backgroundColor: 'rgba(0, 23, 26, 0.8)',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      color: '#fff',
      fontSize: '14px',
      outline: 'none'
    },
    textarea: {
      backgroundColor: 'rgba(0, 23, 26, 0.8)',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      color: '#fff',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      outline: 'none'
    },
    select: {
      backgroundColor: 'rgba(0, 23, 26, 0.8)',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      color: '#fff',
      fontSize: '14px',
      cursor: 'pointer',
      outline: 'none'
    },
    hint: { color: '#A0AEC0', fontSize: '12px', marginTop: '4px' },
    formActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px' },
    btnSalvar: {
      backgroundColor: '#4FD1C5',
      color: '#00171A',
      border: 'none',
      padding: '14px 40px',
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
      padding: '14px 40px',
      borderRadius: '8px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    horarioGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginTop: '15px'
    },
    diaHorario: {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      padding: '15px',
      borderRadius: '8px'
    },
    diaLabel: {
      color: '#81E6D9',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '10px',
      display: 'block'
    },
    timeInputs: { display: 'flex', gap: '10px', alignItems: 'center' },
    timeInput: {
      flex: 1,
      backgroundColor: 'rgba(0, 23, 26, 0.8)',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      borderRadius: '6px',
      padding: '8px',
      color: '#fff',
      fontSize: '14px',
      textAlign: 'center'
    }
  };

  return (
    <Layout isMobile={isMobile} user={user}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>👤 Meu Perfil</h1>
          <p style={styles.subtitle}>Gerencie as informações do seu estabelecimento</p>
        </header>

        {mensagem.texto && (
          <div style={styles.mensagem(mensagem.tipo)}>
            {mensagem.tipo === 'success' ? <CheckCircle /> : <AlertCircle />}
            {mensagem.texto}
          </div>
        )}

        <div style={styles.grid}>
          {/* Coluna Esquerda */}
          <div>
            {/* Foto */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>
                <Camera size={20} />
                Foto do Estabelecimento
              </h2>

              <div style={styles.fotoContainer}>
                <div style={styles.fotoWrapper}>
                  {perfil.fotoUrl instanceof File && perfil.fotoPreview ? (
                    <img src={perfil.fotoPreview} alt="Preview" style={styles.foto} />
                  ) : perfil.fotoUrl ? (
                    <img src={perfil.fotoUrl} alt="Logo" style={styles.foto} />
                  ) : (
                    <div style={styles.fotoPlaceholder}>
                      {perfil.loginUsuario?.charAt(0)?.toUpperCase() || 'E'}
                    </div>
                  )}
                </div>

                <div style={styles.fotoActions}>
                  <label htmlFor="fotoUpload" style={styles.btnUpload}>
                    {uploading ? (
                      <>
                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Camera size={18} />
                        Alterar Foto
                      </>
                    )}
                  </label>

                  <input
                    id="fotoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />

                  <p style={styles.fotoHint}>Recomendado: 400x400px • Máximo: 5MB</p>
                </div>
              </div>
            </div>

            {/* Horário (SUBCOLEÇÃO) */}
            <div style={{ ...styles.card, marginTop: '30px' }}>
              <h2 style={styles.sectionTitle}>🕒 Horário de Funcionamento</h2>

              <div style={styles.horarioGrid}>
                {Object.entries(perfil.horarioFuncionamento).map(([dia, horario]) => (
                  <div key={dia} style={styles.diaHorario}>
                    <label style={styles.diaLabel}>
                      {dia.charAt(0).toUpperCase() + dia.slice(1)}
                    </label>

                    <div style={styles.timeInputs}>
                      <input
                        type="time"
                        value={horario.abre}
                        onChange={(e) => setPerfil(prev => ({
                          ...prev,
                          horarioFuncionamento: {
                            ...prev.horarioFuncionamento,
                            [dia]: { ...prev.horarioFuncionamento[dia], abre: e.target.value }
                          }
                        }))}
                        style={styles.timeInput}
                      />
                      <span style={{ color: '#A0AEC0' }}>às</span>
                      <input
                        type="time"
                        value={horario.fecha}
                        onChange={(e) => setPerfil(prev => ({
                          ...prev,
                          horarioFuncionamento: {
                            ...prev.horarioFuncionamento,
                            [dia]: { ...prev.horarioFuncionamento[dia], fecha: e.target.value }
                          }
                        }))}
                        style={styles.timeInput}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ ...styles.hint, marginTop: 12 }}>
                ✅ Este horário é salvo em: <b>estabelecimentos/{'{uid}'}/config/horario</b>
              </p>
            </div>
          </div>

          {/* Coluna Direita */}
          <div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>
                <Building size={20} />
                Informações da Empresa
              </h2>

              <form onSubmit={salvarPerfil} style={styles.form}>
                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <User size={16} />
                      Nome do Estabelecimento *
                    </label>
                    <input
                      style={styles.input}
                      value={perfil.loginUsuario}
                      onChange={(e) => setPerfil(prev => ({ ...prev, loginUsuario: e.target.value }))}
                      placeholder="Ex: Restaurante Sabor Caseiro"
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <FileText size={16} />
                      CNPJ
                    </label>
                    <input
                      style={styles.input}
                      placeholder="00.000.000/0000-00"
                      value={perfil.cnpj}
                      onChange={(e) => setPerfil(prev => ({ ...prev, cnpj: maskCNPJ(e.target.value) }))}
                    />
                    <div style={styles.hint}>Opcional</div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <Phone size={16} />
                      WhatsApp / Telefone *
                    </label>
                    <input
                      style={styles.input}
                      placeholder="(11) 99999-9999"
                      value={perfil.whatsappFormatado}
                      onChange={(e) => setPerfil(prev => ({ ...prev, whatsappFormatado: maskPhone(e.target.value) }))}
                      required
                    />
                    <div style={styles.hint}>Usado para contato com clientes</div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      <Mail size={16} />
                      E-mail de Login *
                    </label>
                    <input style={styles.input} value={perfil.loginEmail} disabled />
                    <div style={styles.hint}>Contate o suporte para alterar o e-mail</div>
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Descrição do Estabelecimento</label>
                  <textarea
                    style={styles.textarea}
                    value={perfil.descricao}
                    onChange={(e) => setPerfil(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descreva seu estabelecimento, especialidades, etc."
                    maxLength={500}
                  />
                  <div style={{ ...styles.hint, textAlign: 'right' }}>
                    {(perfil.descricao || '').length}/500 caracteres
                  </div>
                </div>

                <h3 style={{ ...styles.sectionTitle, fontSize: '16px', marginTop: '30px' }}>
                  <MapPin size={18} />
                  Endereço
                </h3>

                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>CEP</label>
                    <input
                      style={styles.input}
                      placeholder="00.000-000"
                      value={perfil.endereco.cep}
                      onChange={(e) => setPerfil(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, cep: maskCEP(e.target.value) }
                      }))}
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Rua</label>
                    <input
                      style={styles.input}
                      value={perfil.endereco.rua}
                      onChange={(e) => setPerfil(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, rua: e.target.value }
                      }))}
                      placeholder="Nome da rua"
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Número</label>
                    <input
                      style={styles.input}
                      value={perfil.endereco.numero}
                      onChange={(e) => setPerfil(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, numero: e.target.value }
                      }))}
                      placeholder="123"
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Bairro</label>
                    <input
                      style={styles.input}
                      value={perfil.endereco.bairro}
                      onChange={(e) => setPerfil(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, bairro: e.target.value }
                      }))}
                      placeholder="Centro"
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Cidade</label>
                    <input
                      style={styles.input}
                      value={perfil.endereco.cidade}
                      onChange={(e) => setPerfil(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, cidade: e.target.value }
                      }))}
                      placeholder="São Paulo"
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Estado</label>
                    <select
                      style={styles.select}
                      value={perfil.endereco.estado}
                      onChange={(e) => setPerfil(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, estado: e.target.value }
                      }))}
                    >
                      <option value="">Selecione...</option>
                      {estados.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.btnSalvar} disabled={loading || uploading}>
                    {loading ? (
                      <>
                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Alterar Senha */}
            <div style={{ ...styles.card, marginTop: '30px' }}>
              <h2 style={styles.sectionTitle}>
                <Lock size={20} />
                Alterar Senha
              </h2>

              <form onSubmit={alterarSenha} style={styles.form}>
                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Senha Atual *</label>
                    <input
                      style={styles.input}
                      type="password"
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
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      required
                      minLength={6}
                    />
                    <div style={styles.hint}>Mínimo 6 caracteres</div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Confirmar Nova Senha *</label>
                    <input
                      style={styles.input}
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.btnAlterarSenha} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                        Alterando...
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        Atualizar Senha
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MeuPerfil;
