import { useState } from 'react';
import Lojas from './Lojas'; // Certifique-se de que o arquivo Lojas.jsx está na mesma pasta
import Dashboard from "./Dashboard";


const Menu = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const styles = {
    container: {
      display: 'flex',
      width: '100vw',
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #003d45 0%, #001a1d 100%)',
      color: '#FFFFFF',
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      margin: 0,
      padding: 0,
      position: 'absolute',
      top: 0,
      left: 0,
    },
    sidebar: {
      width: isSidebarOpen ? '260px' : '80px',
      background: 'rgba(0, 20, 25, 0.4)',
      backdropFilter: 'blur(10px)',
      borderRight: '1px solid rgba(79, 209, 197, 0.1)',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
    },
    mainContent: {
      flex: 1,
      padding: '40px',
      overflowY: 'auto',
      height: '100vh',
      boxSizing: 'border-box',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '40px',
    },
    contentCard: {
      background: 'rgba(0, 43, 48, 0.4)',
      backdropFilter: 'blur(20px)',
      padding: '35px',
      borderRadius: '24px',
      border: '1px solid rgba(79, 209, 197, 0.1)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '16px 20px',
      margin: '4px 10px',
      cursor: 'pointer',
      borderRadius: '12px',
      transition: '0.3s',
      color: 'rgba(255, 255, 255, 0.6)',
      textDecoration: 'none',
    },
    menuItemActive: {
      background: 'rgba(79, 209, 197, 0.15)',
      color: '#4FD1C5',
      fontWeight: '600',
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        body, html { 
          margin: 0 !important; 
          padding: 0 !important; 
          background-color: #001a1d !important; 
          overflow-x: hidden;
        }
        #root { width: 100%; height: 100%; }
        .menu-item:hover { background: rgba(79, 209, 197, 0.1); color: #4FD1C5; }
      `}</style>

      <aside style={styles.sidebar}>
        <div style={{ padding: '30px', textAlign: 'center' }}>
          <h2 
            style={{ color: '#4FD1C5', margin: 0, cursor: 'pointer', display: isSidebarOpen ? 'block' : 'none' }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            FoodWay
          </h2>
        </div>
        
        <nav style={{ flex: 1 }}>
          <div 
            className="menu-item"
            style={{ ...styles.menuItem, ...(activeSection === 'dashboard' ? styles.menuItemActive : {}) }}
            onClick={() => setActiveSection('dashboard')}
          >
            <span>📊</span>
            {isSidebarOpen && <span style={{ marginLeft: '15px' }}>Dashboard</span>}
          </div>

          <div 
            className="menu-item"
            style={{ ...styles.menuItem, ...(activeSection === 'estabelecimentos' ? styles.menuItemActive : {}) }}
            onClick={() => setActiveSection('estabelecimentos')}
          >
            <span>🏪</span>
            {isSidebarOpen && <span style={{ marginLeft: '15px' }}>Lojas</span>}
          </div>
        </nav>

        <button 
          onClick={onLogout}
          style={{
            margin: '20px', padding: '12px', background: 'transparent', 
            color: '#FF8080', border: '1px solid #FF8080', borderRadius: '8px', cursor: 'pointer'
          }}
        >
          {isSidebarOpen ? 'SAIR DO SISTEMA' : '🚪'}
        </button>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.header}>
          <h1 style={{ margin: 0 }}>
            {activeSection === 'dashboard' ? 'DASHBOARD' : 'GESTÃO DE LOJAS'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold' }}>Admin</div>
              <div style={{ fontSize: '12px', opacity: 0.6 }}>Gerente de Logística</div>
            </div>
            <div style={{ width: '45px', height: '45px', background: '#4FD1C5', borderRadius: '50%' }}></div>
          </div>
        </header>

        <div style={styles.contentCard}>
          {/* RENDERIZAÇÃO CONDICIONAL DAS TELAS */}
          {activeSection === "dashboard" ? <Dashboard /> : <Lojas />}

        </div>
      </main>
    </div>
  );
};

export default Menu;