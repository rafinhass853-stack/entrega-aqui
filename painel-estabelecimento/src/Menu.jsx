import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import Cardapio from './Cardapio';

// 1. Estilos Globais
const GlobalStyles = () => (
  <style>{`
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { 
      background-color: #00171A; 
      min-height: 100vh; 
      width: 100%;
      color-scheme: dark;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `}</style>
);

// 2. Componente de Layout (EXPORTADO para que outros arquivos como Cardapio.jsx funcionem)
export const Layout = ({ children, isMobile }) => {
  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#00171A'
    }}>
      <MenuComponent />
      <main style={{
        flex: 1,
        marginLeft: isMobile ? '0' : '260px',
        padding: isMobile ? '16px' : '24px',
        backgroundColor: '#00171A',
        minHeight: '100vh',
        width: '100%',
        color: '#A0AEC0',
        position: 'relative',
        overflowX: 'hidden'
      }}>
        {children}
      </main>
    </div>
  );
};

// 3. Componente de Menu Lateral
const MenuComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pedidosPendentes] = useState(5);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'pedidos', label: 'Pedidos', icon: '🛍️', path: '/pedidos', badge: pedidosPendentes },
    { id: 'cardapio', label: 'Cardápio', icon: '📋', path: '/cardapio' },
    { id: 'produtos', label: 'Produtos', icon: '🍔', path: '/produtos' },
    { id: 'faturamento', label: 'Faturamento', icon: '💰', path: '/faturamento' },
    { id: 'ifood', label: 'iFood Parceiro', icon: '🚚', path: '/ifood', premium: true },
    { id: 'relatorios', label: 'Relatórios', icon: '📈', path: '/relatorios' },
    { id: 'perfil', label: 'Meu Perfil', icon: '👤', path: '/perfil' },
    { id: 'config', label: 'Configurações', icon: '⚙️', path: '/configuracoes' },
  ];

  const quickActions = [
    { id: 'novo-produto', label: 'Novo Produto', icon: '➕', action: () => navigate('/produtos/novo') },
    { id: 'novo-pedido', label: 'Novo Pedido', icon: '📝', action: () => navigate('/pedidos/novo') },
    { id: 'promocao', label: 'Criar Promoção', icon: '🎯', action: () => navigate('/promocoes/nova') },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const styles = {
    sidebar: {
      width: isMobile ? (menuOpen ? '260px' : '0') : '260px',
      height: '100vh',
      backgroundColor: '#00171A',
      backgroundImage: 'linear-gradient(180deg, #00171A 0%, #002228 100%)',
      borderRight: '1px solid rgba(79, 209, 197, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: isMobile ? (menuOpen ? '16px' : '0') : '16px',
      position: 'fixed',
      left: 0, top: 0, zIndex: 1000,
      overflowY: 'auto',
      transition: 'all 0.3s ease',
      boxShadow: isMobile && menuOpen ? '0 0 40px rgba(0, 30, 35, 0.9)' : '2px 0 10px rgba(0, 0, 0, 0.3)',
    },
    overlay: {
      display: isMobile && menuOpen ? 'block' : 'none',
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 10, 15, 0.7)', zIndex: 999, backdropFilter: 'blur(3px)',
    },
    mobileMenuButton: {
      position: 'fixed', top: '16px', left: '16px', zIndex: 1001,
      backgroundColor: '#002228', border: '1px solid rgba(79, 209, 197, 0.25)',
      borderRadius: '10px', padding: '12px', color: '#4FD1C5',
      cursor: 'pointer', display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
    },
    logoSection: {
      display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', padding: '12px',
      borderRadius: '10px', backgroundColor: 'rgba(79, 209, 197, 0.05)',
    },
    brandName: { color: '#4FD1C5', fontSize: '18px', fontWeight: '800' },
    brandSubtitle: { color: '#81E6D9', fontSize: '11px', opacity: 0.7 },
    quickActionsSection: {
      marginBottom: '20px', padding: '12px', backgroundColor: 'rgba(79, 209, 197, 0.03)',
      borderRadius: '10px', border: '1px solid rgba(79, 209, 197, 0.08)',
    },
    sectionTitle: { color: '#4FD1C5', fontSize: '12px', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase' },
    quickActionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' },
    quickActionButton: {
      backgroundColor: 'rgba(79, 209, 197, 0.08)', border: '1px solid rgba(79, 209, 197, 0.15)',
      borderRadius: '8px', padding: '8px 4px', fontSize: '11px', color: '#81E6D9',
      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    },
    nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
    menuItem: (isActive, isPremium) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
      padding: '12px 14px', borderRadius: '8px',
      color: isActive ? '#00171A' : (isPremium ? '#F6E05E' : '#A0AEC0'),
      backgroundColor: isActive ? '#4FD1C5' : 'transparent',
      textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '700' : '600',
      cursor: 'pointer', border: isPremium && !isActive ? '1px solid rgba(246, 224, 94, 0.25)' : 'none',
      width: '100%', textAlign: 'left',
    }),
    badge: {
      backgroundColor: '#F56565', color: 'white', fontSize: '10px', borderRadius: '50%',
      width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    premiumBadge: {
      backgroundColor: 'rgba(246, 224, 94, 0.15)', color: '#F6E05E', fontSize: '9px',
      padding: '2px 5px', borderRadius: '4px', marginLeft: '6px',
    },
    footer: { marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(79, 209, 197, 0.08)' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px', backgroundColor: 'rgba(79, 209, 197, 0.03)', borderRadius: '8px' },
    userAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(79, 209, 197, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4FD1C5', fontWeight: '700' },
    userName: { color: '#81E6D9', fontWeight: '600', fontSize: '13px' },
    logoutButton: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', borderRadius: '8px', color: '#FEB2B2', backgroundColor: 'rgba(254, 178, 178, 0.08)', border: '1px solid rgba(254, 178, 178, 0.15)', cursor: 'pointer', width: '100%',
    }
  };

  return (
    <>
      <GlobalStyles />
      {isMobile && <div style={styles.overlay} onClick={() => setMenuOpen(false)} />}
      {isMobile && (
        <button style={styles.mobileMenuButton} onClick={toggleMenu}>
          {menuOpen ? '✕' : '☰'}
        </button>
      )}
      
      <div style={styles.sidebar}>
        <div style={styles.logoSection}>
          <span style={{ fontSize: '26px' }}>🏪</span>
          <div>
            <div style={styles.brandName}>ENTREGAQUI</div>
            <div style={styles.brandSubtitle}>Painel do Estabelecimento</div>
          </div>
        </div>

        <div style={styles.quickActionsSection}>
          <div style={styles.sectionTitle}>Ações Rápidas</div>
          <div style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <button key={action.id} onClick={() => action.action()} style={styles.quickActionButton}>
                <span style={{ fontSize: '14px' }}>{action.icon}</span>
                <span style={{ fontSize: '10px' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); if (isMobile) setMenuOpen(false); }}
                style={styles.menuItem(isActive, item.premium)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <span>{item.icon}</span>
                  <span>{item.label}{item.premium && <span style={styles.premiumBadge}>PRO</span>}</span>
                </div>
                {item.badge && <span style={styles.badge}>{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div style={styles.footer}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>U</div>
            <div>
              <div style={styles.userName}>Usuário</div>
              <div style={styles.userEmail}>{auth.currentUser?.email || 'admin@teste.com'}</div>
            </div>
          </div>
          <button style={styles.logoutButton} onClick={handleLogout}>🚪 Sair da Conta</button>
        </div>
      </div>
    </>
  );
};

// 4. Páginas e Métricas
const Dashboard = ({ user, isMobile }) => (
  <Layout isMobile={isMobile}>
    <div style={pageStyles.container}>
      <div style={pageStyles.headerSection}>
        <div>
          <h1 style={pageStyles.pageTitle}>Dashboard - Visão Geral</h1>
          <p style={pageStyles.pageSubtitle}>Bem-vindo, <strong style={{ color: '#4FD1C5' }}>{user?.email}</strong></p>
        </div>
        <div style={pageStyles.dateBadge}>📅 {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>
      <div style={pageStyles.cardsGrid}>
        <MetricCard title="Faturamento Mensal" value="R$ 5.280,00" trend="↑ 12%" icon="📊" />
        <MetricCard title="Pedidos Hoje" value="24" trend="↑ 15%" icon="🛍️" />
        <MetricCard title="Produtos Ativos" value="48" trend="+8 novos" icon="🍔" />
        <MetricCard title="Ticket Médio" value="R$ 42,50" trend="↑ 8%" icon="💰" />
      </div>
    </div>
  </Layout>
);

const MetricCard = ({ title, value, trend, icon }) => (
  <div style={pageStyles.metricCard}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
      <span style={{ marginRight: '10px' }}>{icon}</span>
      <h3 style={pageStyles.cardTitle}>{title}</h3>
    </div>
    <div style={pageStyles.cardValue}>{value}</div>
    <div style={pageStyles.cardTrend}><span style={{ color: '#48BB78' }}>{trend}</span> vs anterior</div>
  </div>
);

const pageStyles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
  headerSection: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(79, 209, 197, 0.08)' },
  pageTitle: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  pageSubtitle: { color: '#81E6D9', opacity: 0.8 },
  dateBadge: { backgroundColor: 'rgba(79, 209, 197, 0.08)', color: '#81E6D9', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(79, 209, 197, 0.15)' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' },
  metricCard: { background: 'rgba(0, 35, 40, 0.6)', padding: '22px', borderRadius: '12px', border: '1px solid rgba(79, 209, 197, 0.12)' },
  cardTitle: { color: '#81E6D9', fontSize: '14px', margin: 0 },
  cardValue: { fontSize: '28px', color: '#4FD1C5', fontWeight: '700', margin: '10px 0' },
  cardTrend: { fontSize: '13px', color: '#A0AEC0' },
};

// 5. Componente Root
const Menu = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => { setUser(u); setLoading(false); });
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => { unsubscribe(); window.removeEventListener('resize', handleResize); };
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#00171A', justifyContent: 'center', alignItems: 'center', color: '#4FD1C5', flexDirection: 'column', gap: '20px' }}>
      <GlobalStyles />
      <div style={{ width: '50px', height: '50px', border: '3px solid #002228', borderTopColor: '#4FD1C5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p>Carregando ENTREGAQUI...</p>
    </div>
  );

  return (
    <Router>
      <GlobalStyles />
      <Routes>
        <Route path="/cardapio" element={user ? <Cardapio isMobile={isMobile} /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} isMobile={isMobile} /> : <Navigate to="/login" />} />
        <Route path="/login" element={!user ? <div style={{color: 'white', padding: '20px'}}>Tela de Login (Implementar)</div> : <Navigate to="/dashboard" />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default Menu;