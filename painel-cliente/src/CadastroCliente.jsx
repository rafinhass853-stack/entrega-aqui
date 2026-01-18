// CadastroCliente.jsx
import React, { useState } from 'react';

const CadastroCliente = ({ onCadastroCompleto }) => {
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: 'SP',
    referencia: '',
    tipoEndereco: 'casa'
  });

  const tiposEndereco = [
    { value: 'casa', label: '🏠 Casa' },
    { value: 'apartamento', label: '🏢 Apartamento' },
    { value: 'trabalho', label: '💼 Trabalho' },
    { value: 'outro', label: '📍 Outro' }
  ];

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.numero || form.numero.trim() === '') {
      alert('Por favor, informe o número da casa/apartamento!');
      return;
    }
    
    // Salvar no localStorage
    const clienteData = {
      ...form,
      id: Date.now().toString(),
      dataCadastro: new Date().toISOString(),
      enderecoCompleto: `${form.rua}, ${form.numero}${form.complemento ? `, ${form.complemento}` : ''} - ${form.bairro}, ${form.cidade} - ${form.estado}`,
      ativo: true
    };
    
    localStorage.setItem('clienteData', JSON.stringify(clienteData));
    onCadastroCompleto(clienteData);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>🚀</div>
        <h1 style={styles.title}>Entregauqui</h1>
        <p style={styles.subtitle}>Cadastre-se para fazer pedidos</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Dados Pessoais</h3>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Nome Completo *
              <span style={styles.required}> *</span>
            </label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              style={styles.input}
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Telefone *
              <span style={styles.required}> *</span>
            </label>
            <input
              type="tel"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              style={styles.input}
              placeholder="(11) 99999-9999"
              pattern="\([0-9]{2}\) [0-9]{5}-[0-9]{4}"
              required
            />
            <small style={styles.hint}>Formato: (11) 99999-9999</small>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Endereço de Entrega</h3>
          
          <div style={styles.addressGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Rua/Avenida *
                <span style={styles.required}> *</span>
              </label>
              <input
                type="text"
                name="rua"
                value={form.rua}
                onChange={handleChange}
                style={styles.input}
                placeholder="Nome da rua ou avenida"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Número *
                <span style={styles.required}> *</span>
              </label>
              <input
                type="text"
                name="numero"
                value={form.numero}
                onChange={handleChange}
                style={styles.input}
                placeholder="Nº ou S/N"
                required
              />
              <small style={styles.hint}>Obrigatório para entrega</small>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Complemento</label>
            <input
              type="text"
              name="complemento"
              value={form.complemento}
              onChange={handleChange}
              style={styles.input}
              placeholder="Apto, Bloco, Casa, etc."
            />
            <small style={styles.hint}>Ex: Apto 42, Bloco B, Casa 3</small>
          </div>

          <div style={styles.addressGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Bairro *
                <span style={styles.required}> *</span>
              </label>
              <input
                type="text"
                name="bairro"
                value={form.bairro}
                onChange={handleChange}
                style={styles.input}
                placeholder="Seu bairro"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Cidade *
                <span style={styles.required}> *</span>
              </label>
              <input
                type="text"
                name="cidade"
                value={form.cidade}
                onChange={handleChange}
                style={styles.input}
                placeholder="Sua cidade"
                required
              />
            </div>
          </div>

          <div style={styles.addressGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Estado *
                <span style={styles.required}> *</span>
              </label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                style={styles.select}
                required
              >
                <option value="">Selecione</option>
                {estados.map(estado => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo do Endereço</label>
              <select
                name="tipoEndereco"
                value={form.tipoEndereco}
                onChange={handleChange}
                style={styles.select}
              >
                {tiposEndereco.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Ponto de Referência</label>
            <input
              type="text"
              name="referencia"
              value={form.referencia}
              onChange={handleChange}
              style={styles.input}
              placeholder="Ex: Próximo ao mercado, em frente à escola"
            />
            <small style={styles.hint}>Opcional, mas ajuda o entregador</small>
          </div>
        </div>

        <div style={styles.preview}>
          <h4 style={styles.previewTitle}>📦 Endereço de Entrega:</h4>
          <p style={styles.previewText}>
            {form.rua && form.numero 
              ? `${form.rua}, ${form.numero}${form.complemento ? `, ${form.complemento}` : ''}${form.bairro ? ` - ${form.bairro}` : ''}${form.cidade ? `, ${form.cidade}` : ''}${form.estado ? ` - ${form.estado}` : ''}`
              : 'Preencha os campos acima para visualizar o endereço'
            }
          </p>
          {form.referencia && (
            <p style={styles.previewRef}>
              <strong>Referência:</strong> {form.referencia}
            </p>
          )}
        </div>

        <div style={styles.terms}>
          <p style={styles.termsText}>
            Ao cadastrar, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
        </div>

        <button type="submit" style={styles.button}>
          Salvar e Começar a Pedir
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#fff',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center',
    padding: '20px 0',
    borderBottom: '1px solid #E2E8F0'
  },
  logo: {
    fontSize: '48px',
    marginBottom: '10px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '900',
    color: '#1A202C',
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#718096',
    fontSize: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  section: {
    backgroundColor: '#F8FAFC',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #E2E8F0'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #E2E8F0'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '15px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4A5568',
    display: 'flex',
    alignItems: 'center'
  },
  required: {
    color: '#E53E3E',
    marginLeft: '4px'
  },
  input: {
    padding: '12px 15px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s',
    backgroundColor: 'white',
    ':focus': {
      borderColor: '#4299E1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.1)'
    }
  },
  select: {
    padding: '12px 15px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':focus': {
      borderColor: '#4299E1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.1)'
    }
  },
  addressGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  hint: {
    fontSize: '12px',
    color: '#A0AEC0',
    marginTop: '4px'
  },
  preview: {
    backgroundColor: '#EDF2F7',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #CBD5E0'
  },
  previewTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: '10px'
  },
  previewText: {
    fontSize: '14px',
    color: '#4A5568',
    lineHeight: '1.6',
    margin: '0'
  },
  previewRef: {
    fontSize: '14px',
    color: '#718096',
    margin: '10px 0 0 0',
    paddingTop: '10px',
    borderTop: '1px solid #CBD5E0'
  },
  terms: {
    textAlign: 'center',
    padding: '10px'
  },
  termsText: {
    fontSize: '12px',
    color: '#718096',
    lineHeight: '1.4'
  },
  button: {
    backgroundColor: '#48BB78',
    color: 'white',
    padding: '16px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(72, 187, 120, 0.2)',
    ':hover': {
      backgroundColor: '#38A169',
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 8px -1px rgba(72, 187, 120, 0.3)'
    },
    ':active': {
      transform: 'translateY(0)'
    }
  }
};

export default CadastroCliente;