import React, { useState } from 'react';
import { ArrowLeft, User, MapPin, Home, Building, Phone, Smartphone } from 'lucide-react';

const Cadastro = ({ onVoltar, onContinuar, dadosCliente: dadosIniciais }) => {
  const [dados, setDados] = useState({
    nomeCompleto: dadosIniciais?.nomeCompleto || '',
    endereco: dadosIniciais?.endereco || '',
    rua: dadosIniciais?.rua || '',
    numero: dadosIniciais?.numero || '',
    bairro: dadosIniciais?.bairro || '',
    cidade: dadosIniciais?.cidade || 'Araraquara',
    telefone: dadosIniciais?.telefone || '',
    isWhatsapp: dadosIniciais?.isWhatsapp || false,
    complemento: dadosIniciais?.complemento || ''
  });

  const [erros, setErros] = useState({});

  const handleChange = (field, value) => {
    setDados(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro quando o usuário começa a digitar
    if (erros[field]) {
      setErros(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validarDados = () => {
    const novosErros = {};
    
    if (!dados.nomeCompleto.trim()) novosErros.nomeCompleto = 'Nome completo é obrigatório';
    if (!dados.rua.trim()) novosErros.rua = 'Rua é obrigatória';
    if (!dados.numero.trim()) novosErros.numero = 'Número é obrigatório';
    if (!dados.bairro.trim()) novosErros.bairro = 'Bairro é obrigatório';
    if (!dados.telefone.trim()) novosErros.telefone = 'Telefone é obrigatório';
    
    // Validar formato do telefone
    const telefoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;
    if (dados.telefone.trim() && !telefoneRegex.test(dados.telefone)) {
      novosErros.telefone = 'Telefone inválido';
    }
    
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleContinuar = () => {
    if (validarDados()) {
      onContinuar(dados);
    }
  };

  const styles = {
    container: {
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif"
    },
    header: {
      backgroundColor: '#0F3460',
      padding: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer'
    },
    headerTitle: {
      color: 'white',
      margin: 0,
      fontSize: '20px',
      fontWeight: '700'
    },
    content: {
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto'
    },
    titulo: {
      fontSize: '24px',
      fontWeight: '900',
      color: '#0F3460',
      margin: '0 0 10px 0',
      textAlign: 'center'
    },
    subtitulo: {
      fontSize: '16px',
      color: '#64748B',
      margin: '0 0 30px 0',
      textAlign: 'center'
    },
    formContainer: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
    },
    formGroup: {
      marginBottom: '25px'
    },
    formLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#0F3460',
      marginBottom: '8px'
    },
    inputGroup: {
      position: 'relative'
    },
    inputIcon: {
      position: 'absolute',
      left: '15px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#94A3B8'
    },
    input: {
      width: '100%',
      padding: '15px 15px 15px 45px',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      fontSize: '16px',
      color: '#0F3460',
      backgroundColor: '#F8FAFC',
      transition: 'all 0.3s ease'
    },
    inputFocus: {
      outline: 'none',
      borderColor: '#10B981',
      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)'
    },
    inputError: {
      borderColor: '#EF4444'
    },
    errorText: {
      color: '#EF4444',
      fontSize: '12px',
      marginTop: '5px'
    },
    checkboxGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginTop: '15px'
    },
    checkbox: {
      width: '20px',
      height: '20px',
      accentColor: '#10B981'
    },
    checkboxLabel: {
      fontSize: '14px',
      color: '#64748B',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    continuarButton: {
      backgroundColor: '#10B981',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: '18px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      width: '100%',
      marginTop: '20px',
      transition: 'background 0.3s ease'
    },
    continuarButtonDisabled: {
      backgroundColor: '#94A3B8',
      cursor: 'not-allowed'
    },
    optionalLabel: {
      fontSize: '12px',
      color: '#94A3B8',
      fontStyle: 'italic'
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={styles.headerTitle}>Cadastro</h2>
        </div>
      </header>

      <div style={styles.content}>
        <h1 style={styles.titulo}>Informações de entrega</h1>
        <p style={styles.subtitulo}>
          Preencha seus dados para receber o pedido
        </p>

        <div style={styles.formContainer}>
          {/* Nome Completo */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>
              <User size={18} />
              Nome completo
            </label>
            <div style={styles.inputGroup}>
              <User size={20} style={styles.inputIcon} />
              <input
                type="text"
                value={dados.nomeCompleto}
                onChange={(e) => handleChange('nomeCompleto', e.target.value)}
                placeholder="Digite seu nome completo"
                style={{
                  ...styles.input,
                  ...(erros.nomeCompleto ? styles.inputError : {})
                }}
                onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                onBlur={(e) => e.target.style = styles.input}
              />
            </div>
            {erros.nomeCompleto && <p style={styles.errorText}>{erros.nomeCompleto}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
            {/* Rua */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                <MapPin size={18} />
                Rua
              </label>
              <div style={styles.inputGroup}>
                <MapPin size={20} style={styles.inputIcon} />
                <input
                  type="text"
                  value={dados.rua}
                  onChange={(e) => handleChange('rua', e.target.value)}
                  placeholder="Nome da rua"
                  style={{
                    ...styles.input,
                    ...(erros.rua ? styles.inputError : {})
                  }}
                />
              </div>
              {erros.rua && <p style={styles.errorText}>{erros.rua}</p>}
            </div>

            {/* Número */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                <Home size={18} />
                Número
              </label>
              <div style={styles.inputGroup}>
                <Home size={20} style={styles.inputIcon} />
                <input
                  type="text"
                  value={dados.numero}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  placeholder="Nº"
                  style={{
                    ...styles.input,
                    ...(erros.numero ? styles.inputError : {})
                  }}
                />
              </div>
              {erros.numero && <p style={styles.errorText}>{erros.numero}</p>}
            </div>
          </div>

          {/* Complemento */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>
              Complemento <span style={styles.optionalLabel}>(opcional)</span>
            </label>
            <input
              type="text"
              value={dados.complemento}
              onChange={(e) => handleChange('complemento', e.target.value)}
              placeholder="Apartamento, bloco, ponto de referência..."
              style={styles.input}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {/* Bairro */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Bairro
              </label>
              <input
                type="text"
                value={dados.bairro}
                onChange={(e) => handleChange('bairro', e.target.value)}
                placeholder="Nome do bairro"
                style={{
                  ...styles.input,
                  ...(erros.bairro ? styles.inputError : {})
                }}
              />
              {erros.bairro && <p style={styles.errorText}>{erros.bairro}</p>}
            </div>

            {/* Cidade */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Cidade
              </label>
              <select
                value={dados.cidade}
                onChange={(e) => handleChange('cidade', e.target.value)}
                style={styles.input}
              >
                <option value="Araraquara">Araraquara, SP</option>
                <option value="São Carlos">São Carlos, SP</option>
                <option value="Ribeirão Preto">Ribeirão Preto, SP</option>
                <option value="Campinas">Campinas, SP</option>
              </select>
            </div>
          </div>

          {/* Telefone */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>
              <Phone size={18} />
              Telefone
            </label>
            <div style={styles.inputGroup}>
              <Phone size={20} style={styles.inputIcon} />
              <input
                type="tel"
                value={dados.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(16) 99999-9999"
                style={{
                  ...styles.input,
                  ...(erros.telefone ? styles.inputError : {})
                }}
              />
            </div>
            {erros.telefone && <p style={styles.errorText}>{erros.telefone}</p>}
            
            <div style={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="whatsapp"
                checked={dados.isWhatsapp}
                onChange={(e) => handleChange('isWhatsapp', e.target.checked)}
                style={styles.checkbox}
              />
              <label htmlFor="whatsapp" style={styles.checkboxLabel}>
                <Smartphone size={16} />
                Este é um número de WhatsApp
              </label>
            </div>
          </div>

          <button
            onClick={handleContinuar}
            style={{
              ...styles.continuarButton,
              ...(Object.keys(erros).length > 0 ? styles.continuarButtonDisabled : {})
            }}
            disabled={Object.keys(erros).length > 0}
          >
            Continuar com o pedido
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;