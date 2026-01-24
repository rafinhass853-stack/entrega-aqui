import React, { useState } from 'react';
import { Layout } from './Menu';

const TaxaEntrega = ({ user, isMobile }) => {
  const [bairros, setBairros] = useState([
    { id: 1, nome: 'Centro', valor: 5.00 },
    { id: 2, nome: 'Jardim América', valor: 8.50 }
  ]);
  
  const [novoBairro, setNovoBairro] = useState('');
  const [novoValor, setNovoValor] = useState('');

  const adicionarTaxa = (e) => {
    e.preventDefault();
    if (!novoBairro || !novoValor) return;

    const novaTaxa = {
      id: Date.now(),
      nome: novoBairro,
      valor: parseFloat(novoValor.replace(',', '.'))
    };

    setBairros([...bairros, novaTaxa]);
    setNovoBairro('');
    setNovoValor('');
  };

  const removerTaxa = (id) => {
    setBairros(bairros.filter(b => b.id !== id));
  };

  const styles = {
    container: {
      backgroundColor: 'rgba(79, 209, 197, 0.03)',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid rgba(79, 209, 197, 0.1)',
      maxWidth: '800px'
    },
    form: {
      display: 'flex',
      gap: '12px',
      marginBottom: '30px',
      flexWrap: isMobile ? 'wrap' : 'nowrap'
    },
    input: {
      backgroundColor: '#002228',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      color: '#fff',
      flex: 1,
      minWidth: isMobile ? '100%' : 'auto'
    },
    button: {
      backgroundColor: '#4FD1C5',
      color: '#00171A',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 24px',
      fontWeight: '700',
      cursor: 'pointer',
      minWidth: isMobile ? '100%' : 'auto'
    },
    list: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      borderBottom: '2px solid rgba(79, 209, 197, 0.1)',
      color: '#4FD1C5',
      fontSize: '14px',
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid rgba(79, 209, 197, 0.05)',
      color: '#81E6D9'
    },
    deleteBtn: {
      background: 'none',
      border: 'none',
      color: '#F56565',
      cursor: 'pointer',
      fontSize: '18px'
    }
  };

  return (
    <Layout isMobile={isMobile}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#4FD1C5', fontSize: '24px', fontWeight: '800' }}>Taxas de Entrega</h1>
        <p style={{ color: '#81E6D9', opacity: 0.7 }}>Gerencie os valores de entrega por bairro ou região.</p>
      </header>

      <div style={styles.container}>
        <form style={styles.form} onSubmit={adicionarTaxa}>
          <input 
            style={styles.input}
            placeholder="Nome do bairro"
            value={novoBairro}
            onChange={(e) => setNovoBairro(e.target.value)}
          />
          <input 
            style={styles.input}
            placeholder="Valor (Ex: 5,00)"
            type="text"
            value={novoValor}
            onChange={(e) => setNovoValor(e.target.value)}
          />
          <button type="submit" style={styles.button}>Adicionar</button>
        </form>

        <table style={styles.list}>
          <thead>
            <tr>
              <th style={styles.th}>Bairro</th>
              <th style={styles.th}>Valor</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {bairros.map((b) => (
              <tr key={b.id}>
                <td style={styles.td}>{b.nome}</td>
                <td style={styles.td}>R$ {b.valor.toFixed(2)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <button 
                    onClick={() => removerTaxa(b.id)} 
                    style={styles.deleteBtn}
                    title="Remover"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {bairros.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px', color: '#A0AEC0' }}>
            Nenhuma taxa cadastrada.
          </p>
        )}
      </div>
    </Layout>
  );
};

export default TaxaEntrega;