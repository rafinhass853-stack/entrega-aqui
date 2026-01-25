import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const FormasPagamento = ({ isMobile }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [opcoes, setOpcoes] = useState({
    dinheiro_pix: [
      { id: 'pix', nome: 'Pix', ativo: true, icone: '💎' },
      { id: 'dinheiro', nome: 'Dinheiro', ativo: true, icone: '💵' },
    ],
    debito: [
      { id: 'visa_debito', nome: 'Visa Débito', ativo: false, icone: '💳' },
      { id: 'master_debito', nome: 'Mastercard Débito', ativo: false, icone: '💳' },
      { id: 'elo_debito', nome: 'Elo Débito', ativo: false, icone: '💳' },
      { id: 'maestro', nome: 'Maestro', ativo: false, icone: '💳' },
      { id: 'cabal_debito', nome: 'Cabal Débito', ativo: false, icone: '💳' },
    ],
    credito: [
      { id: 'visa', nome: 'Visa', ativo: false, icone: '💳' },
      { id: 'mastercard', nome: 'Mastercard', ativo: false, icone: '💳' },
      { id: 'elo', nome: 'Elo', ativo: false, icone: '💳' },
      { id: 'amex', nome: 'American Express', ativo: false, icone: '💳' },
      { id: 'hipercard', nome: 'Hipercard', ativo: false, icone: '💳' },
      { id: 'diners', nome: 'Diners Club', ativo: false, icone: '💳' },
      { id: 'discover', nome: 'Discover', ativo: false, icone: '💳' },
      { id: 'jcb', nome: 'JCB', ativo: false, icone: '💳' },
      { id: 'aura', nome: 'Aura', ativo: false, icone: '💳' },
      { id: 'unionpay', nome: 'UnionPay', ativo: false, icone: '💳' },
      { id: 'cabal_credito', nome: 'Cabal Crédito', ativo: false, icone: '💳' },
    ],
    vr: [
      { id: 'alelo_vr', nome: 'Alelo Refeição', ativo: false, icone: '🍔' },
      { id: 'sodexo_vr', nome: 'Sodexo Refeição (Pluxee)', ativo: false, icone: '🍔' },
      { id: 'ticket_vr', nome: 'Ticket Restaurante', ativo: false, icone: '🍔' },
      { id: 'vr_refeicao', nome: 'VR Refeição', ativo: false, icone: '🍔' },
      { id: 'ifood_vr', nome: 'iFood Benefícios (VR)', ativo: false, icone: '🍔' },
      { id: 'ben_vr', nome: 'Ben Visa Vale Refeição', ativo: false, icone: '🍔' },
      { id: 'caju_vr', nome: 'Caju Refeição', ativo: false, icone: '🍔' },
      { id: 'flash_vr', nome: 'Flash Refeição', ativo: false, icone: '🍔' },
      { id: 'swile_vr', nome: 'Swile Refeição', ativo: false, icone: '🍔' },
    ],
    va: [
      { id: 'alelo_va', nome: 'Alelo Alimentação', ativo: false, icone: '🍎' },
      { id: 'sodexo_va', nome: 'Sodexo Alimentação (Pluxee)', ativo: false, icone: '🍎' },
      { id: 'ticket_va', nome: 'Ticket Alimentação', ativo: false, icone: '🍎' },
      { id: 'vr_va', nome: 'VR Alimentação', ativo: false, icone: '🍎' },
      { id: 'ben_va', nome: 'Ben Visa Vale Alimentação', ativo: false, icone: '🍎' },
      { id: 'caju_va', nome: 'Caju Alimentação', ativo: false, icone: '🍎' },
      { id: 'flash_va', nome: 'Flash Alimentação', ativo: false, icone: '🍎' },
      { id: 'swile_va', nome: 'Swile Alimentação', ativo: false, icone: '🍎' },
    ]
  });

  useEffect(() => {
    // Usamos onAuthStateChanged para garantir que temos o UID antes de buscar
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "estabelecimentos", user.uid, "configuracoes", "pagamentos");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setOpcoes(docSnap.data().config);
          }
        } catch (e) {
          console.error("Erro ao carregar pagamentos:", e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleOpcao = (categoria, id) => {
    setOpcoes(prev => ({
      ...prev,
      [categoria]: prev[categoria].map(item => 
        item.id === id ? { ...item, ativo: !item.ativo } : item
      )
    }));
  };

  const salvar = async () => {
    if (!auth.currentUser) return alert("Usuário não autenticado.");
    
    setSaving(true);
    try {
      const docRef = doc(db, "estabelecimentos", auth.currentUser.uid, "configuracoes", "pagamentos");
      await setDoc(docRef, {
        config: opcoes,
        atualizadoEm: serverTimestamp() // Recomendado usar o timestamp do servidor
      }, { merge: true }); // Merge garante que não sobrescrevemos outros dados acidentalmente
      
      alert("Formas de pagamento atualizadas com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  // Reutilizando seus estilos...
  const styles = {
    sectionTitle: { color: '#4FD1C5', fontSize: '12px', fontWeight: 'bold', margin: '25px 0 15px 0', textTransform: 'uppercase', borderLeft: '3px solid #4FD1C5', paddingLeft: '10px' },
    grid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' },
    card: (ativo) => ({
      backgroundColor: ativo ? 'rgba(79, 209, 197, 0.1)' : '#002228',
      border: `1px solid ${ativo ? '#4FD1C5' : 'rgba(79, 209, 197, 0.1)'}`,
      borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: '0.2s',
      userSelect: 'none'
    }),
    saveBtn: { backgroundColor: '#4FD1C5', color: '#00171A', border: 'none', borderRadius: '6px', padding: '15px 40px', fontWeight: 'bold', cursor: 'pointer', marginTop: '30px', width: isMobile ? '100%' : 'auto', transition: 'opacity 0.2s' }
  };

  if (loading) return <Layout isMobile={isMobile}><div style={{color: '#4FD1C5', padding: '20px'}}>Carregando configurações...</div></Layout>;

  // Renderização das categorias (mapeada para reduzir repetição de código)
  const categorias = [
    { key: 'dinheiro_pix', titulo: '💰 Dinheiro e Pix' },
    { key: 'debito', titulo: '💳 Cartão de Débito' },
    { key: 'credito', titulo: '💳 Cartão de Crédito' },
    { key: 'vr', titulo: '🟢 Vale Refeição (VR)' },
    { key: 'va', titulo: '🔵 Vale Alimentação (VA)' }
  ];

  return (
    <Layout isMobile={isMobile}>
      <h1 style={{ color: '#4FD1C5', fontWeight: '800', fontSize: isMobile ? '20px' : '28px' }}>Configurar Pagamentos</h1>
      <p style={{ color: '#81E6D9', opacity: 0.7, marginBottom: '20px' }}>Selecione as formas de pagamento que seu estabelecimento aceita na entrega.</p>
      
      {categorias.map(cat => (
        <React.Fragment key={cat.key}>
          <div style={styles.sectionTitle}>{cat.titulo}</div>
          <div style={styles.grid}>
            {opcoes[cat.key].map(p => (
              <div key={p.id} style={styles.card(p.ativo)} onClick={() => toggleOpcao(cat.key, p.id)}>
                <span style={{color: '#fff', fontSize: '14px'}}>{p.icone} {p.nome}</span>
                <span style={{
                   width: '12px', 
                   height: '12px', 
                   borderRadius: '50%', 
                   backgroundColor: p.ativo ? '#4FD1C5' : '#1A363D',
                   border: p.ativo ? 'none' : '1px solid #4FD1C5'
                }} />
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}

      <button 
        style={{...styles.saveBtn, opacity: saving ? 0.7 : 1}} 
        onClick={salvar} 
        disabled={saving}
      >
        {saving ? 'PROCESSANDO...' : 'SALVAR ALTERAÇÕES'}
      </button>
    </Layout>
  );
};

export default FormasPagamento;