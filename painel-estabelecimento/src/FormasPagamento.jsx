import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db, auth } from './firebase';
import {
  doc, getDoc, setDoc, serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import {
  CreditCard, Wallet, Smartphone, Banknote,
  Check, X, Save, RefreshCw, AlertCircle,
  DollarSign, Smartphone as SmartphoneIcon,
  Building
} from 'lucide-react';

const FormasPagamento = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Configuração inicial
  const configInicial = {
    dinheiro_pix: {
      titulo: '💰 Dinheiro e Pix',
      opcoes: [
        { id: 'pix', nome: 'Pix', ativo: true, icone: '💎', comissao: 0 },
        { id: 'dinheiro', nome: 'Dinheiro', ativo: true, icone: '💵', comissao: 0 }
      ]
    },
    debito: {
      titulo: '💳 Cartão de Débito',
      ativo: false,
      opcoes: [
        { id: 'visa_debito', nome: 'Visa Débito', ativo: false, icone: '💳', comissao: 1.99 },
        { id: 'master_debito', nome: 'Mastercard Débito', ativo: false, icone: '💳', comissao: 1.99 },
        { id: 'elo_debito', nome: 'Elo Débito', ativo: false, icone: '💳', comissao: 2.19 },
        { id: 'maestro', nome: 'Maestro', ativo: false, icone: '💳', comissao: 1.99 },
        { id: 'cabal_debito', nome: 'Cabal Débito', ativo: false, icone: '💳', comissao: 2.09 }
      ]
    },
    credito: {
      titulo: '💳 Cartão de Crédito',
      ativo: false,
      opcoes: [
        { id: 'visa', nome: 'Visa', ativo: false, icone: '💳', comissao: 3.49 },
        { id: 'mastercard', nome: 'Mastercard', ativo: false, icone: '💳', comissao: 3.49 },
        { id: 'elo', nome: 'Elo', ativo: false, icone: '💳', comissao: 3.69 },
        { id: 'amex', nome: 'American Express', ativo: false, icone: '💳', comissao: 4.99 },
        { id: 'hipercard', nome: 'Hipercard', ativo: false, icone: '💳', comissao: 3.99 },
        { id: 'diners', nome: 'Diners Club', ativo: false, icone: '💳', comissao: 4.29 }
      ]
    },
    vr: {
      titulo: '🟢 Vale Refeição (VR)',
      ativo: false,
      opcoes: [
        { id: 'alelo_vr', nome: 'Alelo Refeição', ativo: false, icone: '🍔', comissao: 2.49 },
        { id: 'sodexo_vr', nome: 'Sodexo (Pluxee)', ativo: false, icone: '🍔', comissao: 2.49 },
        { id: 'ticket_vr', nome: 'Ticket Restaurante', ativo: false, icone: '🍔', comissao: 2.29 },
        { id: 'ifood_vr', nome: 'iFood Benefícios', ativo: false, icone: '🍔', comissao: 2.99 },
        { id: 'caju_vr', nome: 'Caju Refeição', ativo: false, icone: '🍔', comissao: 2.49 }
      ]
    },
    va: {
      titulo: '🔵 Vale Alimentação (VA)',
      ativo: false,
      opcoes: [
        { id: 'alelo_va', nome: 'Alelo Alimentação', ativo: false, icone: '🍎', comissao: 2.49 },
        { id: 'sodexo_va', nome: 'Sodexo Alimentação', ativo: false, icone: '🍎', comissao: 2.49 },
        { id: 'ticket_va', nome: 'Ticket Alimentação', ativo: false, icone: '🍎', comissao: 2.29 },
        { id: 'vr_va', nome: 'VR Alimentação', ativo: false, icone: '🍎', comissao: 2.29 },
        { id: 'caju_va', nome: 'Caju Alimentação', ativo: false, icone: '🍎', comissao: 2.49 }
      ]
    }
  };

  // Carregar configuração
  useEffect(() => {
    if (!user) return;

    const configRef = doc(db, 'estabelecimentos', user.uid, 'configuracoes', 'pagamentos');
    
    const unsubscribe = onSnapshot(configRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          setConfig(docSnap.data().config);
        } else {
          setConfig(configInicial);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar configurações:', error);
        setConfig(configInicial);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const showMensagem = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
  };

  const toggleCategoria = (categoriaId) => {
    if (!config) return;
    
    setConfig(prev => ({
      ...prev,
      [categoriaId]: {
        ...prev[categoriaId],
        ativo: !prev[categoriaId].ativo,
        // Se ativar categoria, ativa primeira opção automaticamente
        opcoes: prev[categoriaId].opcoes.map((opcao, index) => ({
          ...opcao,
          ativo: !prev[categoriaId].ativo && index === 0 ? true : opcao.ativo
        }))
      }
    }));
  };

  const toggleOpcao = (categoriaId, opcaoId) => {
    if (!config) return;
    
    setConfig(prev => ({
      ...prev,
      [categoriaId]: {
        ...prev[categoriaId],
        opcoes: prev[categoriaId].opcoes.map(opcao =>
          opcao.id === opcaoId
            ? { ...opcao, ativo: !opcao.ativo }
            : opcao
        )
      }
    }));
  };

  const salvarConfiguracao = async () => {
    if (!user || !config) return;
    
    setSaving(true);
    
    try {
      const configRef = doc(db, 'estabelecimentos', user.uid, 'configuracoes', 'pagamentos');
      
      await setDoc(configRef, {
        config: config,
        atualizadoEm: serverTimestamp(),
        atualizadoPor: user.email
      }, { merge: true });
      
      showMensagem('success', 'Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showMensagem('error', 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const resetarConfiguracao = () => {
    if (window.confirm('Tem certeza que deseja redefinir todas as configurações?')) {
      setConfig(configInicial);
      showMensagem('info', 'Configurações redefinidas para padrão');
    }
  };

  // Calcular comissão média
  const calcularComissaoMedia = () => {
    if (!config) return 0;
    
    let totalOpcoes = 0;
    let comissaoTotal = 0;
    
    Object.values(config).forEach(categoria => {
      if (categoria.ativo || categoria.titulo === '💰 Dinheiro e Pix') {
        categoria.opcoes.forEach(opcao => {
          if (opcao.ativo) {
            totalOpcoes++;
            comissaoTotal += opcao.comissao || 0;
          }
        });
      }
    });
    
    return totalOpcoes > 0 ? (comissaoTotal / totalOpcoes).toFixed(2) : 0;
  };

  // Contar formas ativas
  const contarFormasAtivas = () => {
    if (!config) return 0;
    
    let totalAtivas = 0;
    Object.values(config).forEach(categoria => {
      if (categoria.ativo || categoria.titulo === '💰 Dinheiro e Pix') {
        totalAtivas += categoria.opcoes.filter(opcao => opcao.ativo).length;
      }
    });
    
    return totalAtivas;
  };

  if (loading || !config) {
    return (
      <Layout isMobile={isMobile}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh' 
        }}>
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

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
      border: `1px solid ${tipo === 'success' ? '#10B98140' :
              tipo === 'error' ? '#F5656540' : '#4FD1C540'}`,
      color: tipo === 'success' ? '#10B981' :
             tipo === 'error' ? '#F56565' : '#4FD1C5',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }),
    statsCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      backgroundColor: 'rgba(0, 35, 40, 0.6)',
      border: '1px solid rgba(79, 209, 197, 0.12)',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center'
    },
    statIcon: {
      fontSize: '32px',
      marginBottom: '12px'
    },
    statValue: {
      color: '#4FD1C5',
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    statLabel: {
      color: '#81E6D9',
      fontSize: '14px'
    },
    categoriaCard: {
      backgroundColor: 'rgba(0, 35, 40, 0.6)',
      border: '1px solid rgba(79, 209, 197, 0.12)',
      borderRadius: '12px',
      padding: '25px',
      marginBottom: '20px'
    },
    categoriaHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      cursor: 'pointer'
    },
    categoriaTitulo: {
      color: '#4FD1C5',
      fontSize: '18px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    toggleCategoria: (ativo) => ({
      width: '60px',
      height: '30px',
      backgroundColor: ativo ? '#10B981' : '#CBD5E0',
      borderRadius: '15px',
      position: 'relative',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }),
    toggleKnob: (ativo) => ({
      position: 'absolute',
      top: '3px',
      left: ativo ? '33px' : '3px',
      width: '24px',
      height: '24px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: 'left 0.3s ease'
    }),
    opcoesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '15px'
    },
    opcaoCard: (ativo) => ({
      backgroundColor: ativo ? 'rgba(79, 209, 197, 0.1)' : 'rgba(0, 0, 0, 0.2)',
      border: `1px solid ${ativo ? '#4FD1C5' : 'rgba(79, 209, 197, 0.1)'}`,
      borderRadius: '10px',
      padding: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        borderColor: ativo ? '#4FD1C5' : 'rgba(79, 209, 197, 0.3)'
      }
    }),
    opcaoInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    opcaoIcon: {
      fontSize: '24px'
    },
    opcaoNome: {
      color: 'white',
      fontSize: '14px',
      fontWeight: '500'
    },
    opcaoComissao: {
      color: '#81E6D9',
      fontSize: '12px',
      marginTop: '4px'
    },
    opcaoToggle: (ativo) => ({
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: ativo ? '#4FD1C5' : 'rgba(79, 209, 197, 0.1)',
      border: `2px solid ${ativo ? '#4FD1C5' : 'rgba(79, 209, 197, 0.3)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: ativo ? '#00171A' : 'transparent',
      fontSize: '10px',
      fontWeight: 'bold'
    }),
    actionsBar: {
      position: 'sticky',
      bottom: '20px',
      backgroundColor: 'rgba(0, 35, 40, 0.9)',
      border: '1px solid rgba(79, 209, 197, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backdropFilter: 'blur(10px)'
    },
    btnAcao: {
      padding: '14px 30px',
      borderRadius: '8px',
      border: 'none',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '16px',
      transition: 'all 0.2s ease'
    },
    btnSalvar: {
      backgroundColor: '#4FD1C5',
      color: '#00171A'
    },
    btnResetar: {
      backgroundColor: 'transparent',
      color: '#A0AEC0',
      border: '1px solid rgba(79, 209, 197, 0.3)'
    }
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        {/* Cabeçalho */}
        <header style={styles.header}>
          <h1 style={styles.title}>💳 Formas de Pagamento</h1>
          <p style={styles.subtitle}>
            Configure as formas de pagamento aceitas pelo seu estabelecimento
          </p>
        </header>

        {/* Mensagem de Feedback */}
        {mensagem.texto && (
          <div style={styles.mensagem(mensagem.tipo)}>
            {mensagem.tipo === 'success' ? <Check /> : <AlertCircle />}
            {mensagem.texto}
          </div>
        )}

        {/* Estatísticas */}
        <div style={styles.statsCards}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💳</div>
            <div style={styles.statValue}>{contarFormasAtivas()}</div>
            <div style={styles.statLabel}>Formas Ativas</div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statValue}>{calcularComissaoMedia()}%</div>
            <div style={styles.statLabel}>Comissão Média</div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statValue}>
              {Object.values(config).filter(cat => cat.ativo || cat.titulo === '💰 Dinheiro e Pix').length}
            </div>
            <div style={styles.statLabel}>Categorias Ativas</div>
          </div>
        </div>

        {/* Categorias de Pagamento */}
        {Object.entries(config).map(([categoriaId, categoria]) => (
          <div key={categoriaId} style={styles.categoriaCard}>
            {/* Cabeçalho da Categoria */}
            <div 
              style={styles.categoriaHeader}
              onClick={() => categoriaId !== 'dinheiro_pix' && toggleCategoria(categoriaId)}
            >
              <div style={styles.categoriaTitulo}>
                <span>{categoria.titulo.split(' ')[0]}</span>
                <span>{categoria.titulo.split(' ').slice(1).join(' ')}</span>
              </div>
              
              {categoriaId !== 'dinheiro_pix' && (
                <div 
                  style={styles.toggleCategoria(categoria.ativo)}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoria(categoriaId);
                  }}
                >
                  <div style={styles.toggleKnob(categoria.ativo)}>
                    {categoria.ativo ? '✓' : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Opções da Categoria */}
            <div style={styles.opcoesGrid}>
              {categoria.opcoes.map(opcao => (
                <div
                  key={opcao.id}
                  style={styles.opcaoCard(opcao.ativo && (categoria.ativo || categoriaId === 'dinheiro_pix'))}
                  onClick={() => (categoria.ativo || categoriaId === 'dinheiro_pix') && toggleOpcao(categoriaId, opcao.id)}
                >
                  <div style={styles.opcaoInfo}>
                    <div style={styles.opcaoIcon}>{opcao.icone}</div>
                    <div>
                      <div style={styles.opcaoNome}>{opcao.nome}</div>
                      {opcao.comissao > 0 && (
                        <div style={styles.opcaoComissao}>
                          Comissão: {opcao.comissao}%
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={styles.opcaoToggle(
                    opcao.ativo && (categoria.ativo || categoriaId === 'dinheiro_pix')
                  )}>
                    {opcao.ativo && (categoria.ativo || categoriaId === 'dinheiro_pix') ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
            
            {categoriaId !== 'dinheiro_pix' && !categoria.ativo && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                color: '#A0AEC0',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                Ative esta categoria para configurar as formas de pagamento
              </div>
            )}
          </div>
        ))}

        {/* Barra de Ações */}
        <div style={styles.actionsBar}>
          <button
            style={{ ...styles.btnAcao, ...styles.btnResetar }}
            onClick={resetarConfiguracao}
            disabled={saving}
          >
            <RefreshCw size={18} />
            Redefinir Tudo
          </button>
          
          <button
            style={{ ...styles.btnAcao, ...styles.btnSalvar }}
            onClick={salvarConfiguracao}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default FormasPagamento;