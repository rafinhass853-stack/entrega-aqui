import React, { useState } from 'react';
import { Layout } from './Menu';

const FormasPagamento = ({ user, isMobile }) => {
  // Estado inicial com as formas de pagamento comuns
  const [pagamentos, setPagamentos] = useState([
    { id: 'pix', nome: 'Pix', icone: '💎', ativo: true, tipo: 'Online/Presencial' },
    { id: 'credito', nome: 'Cartão de Crédito', icone: '💳', ativo: true, tipo: 'Maquininha' },
    { id: 'debito', nome: 'Cartão de Débito', icone: '💳', ativo: true, tipo: 'Maquininha' },
    { id: 'dinheiro', nome: 'Dinheiro', icone: '💵', ativo: true, tipo: 'Presencial' },
    { id: 'alimentacao', nome: 'Vale Alimentação', icone: '🍎', ativo: false, tipo: 'Maquininha' },
    { id: 'refeicao', nome: 'Vale Refeição', icone: '🍔', ativo: false, tipo: 'Maquininha' },
  ]);

  const togglePagamento = (id) => {
    setPagamentos(pagamentos.map(p => 
      p.id === id ? { ...p, ativo: !p.ativo } : p
    ));
  };

  const styles = {
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '16px',
      marginTop: '20px'
    },
    card: (ativo) => ({
      backgroundColor: ativo ? 'rgba(79, 209, 197, 0.1)' : 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${ativo ? '#4FD1C5' : 'rgba(79, 209, 197, 0.1)'}`,
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      opacity: ativo ? 1 : 0.6
    }),
    info: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    icone: {
      fontSize: '24px',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      width: '45px',
      height: '45px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '10px'
    },
    status: (ativo) => ({
      fontSize: '11px',
      fontWeight: 'bold',
      padding: '4px 8px',
      borderRadius: '20px',
      backgroundColor: ativo ? '#4FD1C5' : '#4A5568',
      color: ativo ? '#00171A' : '#CBD5E0',
      textTransform: 'uppercase'
    }),
    saveButton: {
      marginTop: '30px',
      backgroundColor: '#4FD1C5',
      color: '#00171A',
      border: 'none',
      borderRadius: '8px',
      padding: '15px 30px',
      fontWeight: 'bold',
      cursor: 'pointer',
      width: isMobile ? '100%' : 'auto'
    }
  };

  return (
    <Layout isMobile={isMobile}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#4FD1C5', fontSize: '24px', fontWeight: '800' }}>Formas de Pagamento</h1>
        <p style={{ color: '#81E6D9', opacity: 0.7 }}>
          Selecione quais métodos de pagamento seu estabelecimento aceita.
        </p>
      </header>

      <div style={styles.grid}>
        {pagamentos.map((p) => (
          <div 
            key={p.id} 
            style={styles.card(p.ativo)} 
            onClick={() => togglePagamento(p.id)}
          >
            <div style={styles.info}>
              <div style={styles.icone}>{p.icone}</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>{p.nome}</div>
                <div style={{ color: '#81E6D9', fontSize: '12px', opacity: 0.6 }}>{p.tipo}</div>
              </div>
            </div>
            <div style={styles.status(p.ativo)}>
              {p.ativo ? 'Ativo' : 'Inativo'}
            </div>
          </div>
        ))}
      </div>

      <button 
        style={styles.saveButton}
        onClick={() => alert('Configurações de pagamento salvas!')}
      >
        Salvar Configurações
      </button>
    </Layout>
  );
};

export default FormasPagamento;