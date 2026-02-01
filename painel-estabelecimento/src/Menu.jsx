// Menu.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { auth, db } from "./firebase";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";

// Componentes
import Dashboard from "./Dashboard";
import TelaLogin from "./Telalogin";
import Cardapio from "./Cardapio";
import Pedidos from "./Pedidos";
import FormasPagamento from "./FormasPagamento";
import TaxaEntrega from "./TaxaEntrega";
import Faturamento from "./Faturamento";
import MeuPerfil from "./MeuPerfil";
import Entregadores from "./Entregadores";
import ComissaoPlataforma from "./ComissaoPlataforma";

/* -------------------- Estilos Globais -------------------- */
const GlobalStyles = () => (
  <style>{`
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { 
      background-color: #00171A; 
      min-height: 100vh; 
      width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      overflow-x: hidden;
    }

    body { max-width: 100vw; }

    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .spinner { 
      width: 50px; 
      height: 50px; 
      border: 3px solid #002228; 
      border-top-color: #4FD1C5; 
      border-radius: 50%; 
      animation: spin 1s linear infinite;
    }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: rgba(0, 35, 40, 0.5); }
    ::-webkit-scrollbar-thumb { background: rgba(79, 209, 197, 0.3); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(79, 209, 197, 0.5); }
  `}</style>
);

/* -------------------- Loading -------------------- */
const LoadingScreen = () => (
  <div
    style={{
      display: "flex",
      height: "100vh",
      backgroundColor: "#00171A",
      justifyContent: "center",
      alignItems: "center",
      color: "#4FD1C5",
      flexDirection: "column",
      gap: "20px",
    }}
  >
    <GlobalStyles />
    <div className="spinner"></div>
    <p>Carregando ENTREGAQUI...</p>
  </div>
);

/* -------------------- Layout com Menu -------------------- */
export const Layout = ({ children, isMobile, user }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pedidosPendentes, setPedidosPendentes] = useState(0);
  const [estabelecimento, setEstabelecimento] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = user || auth.currentUser || null;
  const estabelecimentoId = currentUser?.estabelecimentoId || currentUser?.uid || null;

  // Monitorar pedidos pendentes
  useEffect(() => {
    if (!estabelecimentoId) return;

    const q = query(
      collection(db, "Pedidos"),
      where("estabelecimentoId", "==", estabelecimentoId),
      where("status", "==", "pendente")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setPedidosPendentes(snapshot.size),
      (error) => {
        console.error("Erro ao ouvir pedidos pendentes:", error);
        setPedidosPendentes(0);
      }
    );

    return () => unsubscribe();
  }, [estabelecimentoId]);

  // Buscar dados do estabelecimento
  useEffect(() => {
    if (!estabelecimentoId) return;

    const unsubscribe = onSnapshot(
      doc(db, "estabelecimentos", estabelecimentoId),
      (docSnap) => {
        if (docSnap.exists()) setEstabelecimento(docSnap.data());
        else setEstabelecimento(null);
      },
      (error) => {
        console.error("Erro ao ouvir estabelecimento:", error);
        setEstabelecimento(null);
      }
    );

    return () => unsubscribe();
  }, [estabelecimentoId]);

  /**
   * ✅ AQUI: Dashboard e Faturamento ficam no projeto,
   * mas NÃO aparecem no menu.
   */
  const menuItems = [
    {
      id: "pedidos",
      label: "Pedidos",
      icon: "🛍️",
      path: "/pedidos",
      badge: pedidosPendentes > 0 ? pedidosPendentes : null,
    },
    { id: "cardapio", label: "Cardápio", icon: "📋", path: "/cardapio" },
    { id: "pagamentos", label: "Pagamentos", icon: "💳", path: "/pagamentos" },
    { id: "taxas", label: "Taxas de Entrega", icon: "📍", path: "/taxas" },

    // ✅ NOVO MENU
    { id: "comissao", label: "Comissão da Plataforma", icon: "🧾", path: "/comissao" },

    { id: "entregadores", label: "Entregadores", icon: "🏍️", path: "/entregadores" },
    { id: "perfil", label: "Meu Perfil", icon: "👤", path: "/perfil" },
  ];

  const quickActions = [
    { id: "novo-pedido", label: "Novo Pedido", icon: "📝", action: () => navigate("/pedidos") },
    { id: "adicionar-produto", label: "Novo Produto", icon: "🍔", action: () => navigate("/cardapio") },
    { id: "ver-entregadores", label: "Entregadores", icon: "🏍️", action: () => navigate("/entregadores") },
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
      alert("Erro ao fazer logout. Tente novamente.");
    }
  };

  const toggleMenu = () => setMenuOpen((v) => !v);
  const SIDEBAR_W = 260;

  const styles = {
    sidebar: {
      width: isMobile ? (menuOpen ? `${SIDEBAR_W}px` : "0") : `${SIDEBAR_W}px`,
      height: "100vh",
      backgroundColor: "#00171A",
      borderRight: "1px solid rgba(79, 209, 197, 0.08)",
      display: "flex",
      flexDirection: "column",
      padding: isMobile ? (menuOpen ? "16px" : "0") : "16px",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 1000,
      overflowY: "auto",
      overflowX: "hidden",
      transition: "all 0.25s ease",
      boxShadow:
        isMobile && menuOpen
          ? "0 0 40px rgba(0, 30, 35, 0.9)"
          : "2px 0 10px rgba(0, 0, 0, 0.3)",
    },
    overlay: {
      display: isMobile && menuOpen ? "block" : "none",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 10, 15, 0.7)",
      zIndex: 999,
    },
    mobileMenuButton: {
      position: "fixed",
      top: "16px",
      left: "16px",
      zIndex: 1001,
      backgroundColor: "#002228",
      border: "1px solid rgba(79, 209, 197, 0.25)",
      borderRadius: "10px",
      padding: "12px",
      color: "#4FD1C5",
      cursor: "pointer",
      display: isMobile ? "flex" : "none",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "20px",
    },
    logoSection: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "22px",
      padding: "12px",
      borderRadius: "10px",
      backgroundColor: "rgba(79, 209, 197, 0.05)",
    },
    quickActionsSection: {
      marginBottom: "16px",
      padding: "12px",
      backgroundColor: "rgba(79, 209, 197, 0.03)",
      borderRadius: "10px",
      border: "1px solid rgba(79, 209, 197, 0.08)",
    },
    quickActionsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "6px",
    },
    quickActionButton: {
      backgroundColor: "rgba(79, 209, 197, 0.08)",
      border: "1px solid rgba(79, 209, 197, 0.15)",
      borderRadius: "8px",
      padding: "8px 4px",
      fontSize: "11px",
      color: "#81E6D9",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
      transition: "all 0.2s ease",
    },
    menuItem: (isActive) => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      borderRadius: "8px",
      color: isActive ? "#00171A" : "#A0AEC0",
      backgroundColor: isActive ? "#4FD1C5" : "transparent",
      fontSize: "14px",
      fontWeight: isActive ? "700" : "600",
      cursor: "pointer",
      border: "none",
      width: "100%",
      textAlign: "left",
      transition: "all 0.2s ease",
    }),
    badge: {
      backgroundColor: "#F56565",
      color: "white",
      fontSize: "10px",
      borderRadius: "50%",
      width: "18px",
      height: "18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto",
    },
    userInfo: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "16px",
      padding: "10px",
      backgroundColor: "rgba(79, 209, 197, 0.03)",
      borderRadius: "8px",
    },
    userAvatar: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      backgroundColor: "rgba(79, 209, 197, 0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#4FD1C5",
      fontWeight: "700",
      fontSize: "18px",
    },
    logoutButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      padding: "12px",
      borderRadius: "8px",
      color: "#FEB2B2",
      backgroundColor: "rgba(254, 178, 178, 0.08)",
      border: "1px solid rgba(254, 178, 178, 0.15)",
      cursor: "pointer",
      width: "100%",
      transition: "all 0.2s ease",
    },
  };

  const currentLabel =
    menuItems.find((item) => item.path === location.pathname)?.label || "Painel";

  return (
    <>
      <GlobalStyles />
      {isMobile && <div style={styles.overlay} onClick={() => setMenuOpen(false)} />}

      {isMobile && (
        <button style={styles.mobileMenuButton} onClick={toggleMenu}>
          {menuOpen ? "✕" : "☰"}
        </button>
      )}

      <div style={styles.sidebar}>
        <div style={styles.logoSection}>
          <span style={{ fontSize: "26px" }}>🏪</span>
          <div>
            <div style={{ color: "#4FD1C5", fontSize: "18px", fontWeight: "800" }}>
              ENTREGAQUI
            </div>
            <div style={{ color: "#81E6D9", fontSize: "11px", opacity: 0.7 }}>
              Painel do Estabelecimento
            </div>
          </div>
        </div>

        <div style={styles.quickActionsSection}>
          <div
            style={{
              color: "#4FD1C5",
              fontSize: "12px",
              fontWeight: "700",
              marginBottom: "10px",
            }}
          >
            Gestão Rápida
          </div>
          <div style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.action();
                  if (isMobile) setMenuOpen(false);
                }}
                style={styles.quickActionButton}
              >
                <span style={{ fontSize: "14px" }}>{action.icon}</span>
                <span style={{ fontSize: "10px" }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMenuOpen(false);
                }}
                style={styles.menuItem(isActive)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <span>{item.icon}</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                  </span>
                </div>
                {item.badge ? <span style={styles.badge}>{item.badge}</span> : null}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid rgba(79, 209, 197, 0.08)" }}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {estabelecimento?.loginUsuario?.charAt(0)?.toUpperCase() ||
                currentUser?.email?.charAt(0)?.toUpperCase() ||
                "E"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#81E6D9", fontWeight: "600", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {estabelecimento?.loginUsuario || "Estabelecimento"}
              </div>
              <div style={{ color: "#81E6D9", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser?.email || "admin@entregaqui.com"}
              </div>
            </div>
          </div>

          <button style={styles.logoutButton} onClick={handleLogout}>
            <span>🚪</span>
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>

      <main
        style={{
          marginLeft: isMobile ? 0 : SIDEBAR_W,
          width: isMobile ? "100%" : `calc(100% - ${SIDEBAR_W}px)`,
          maxWidth: "100vw",
          padding: isMobile ? "16px" : "24px",
          backgroundColor: "#00171A",
          minHeight: "100vh",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            marginBottom: "20px",
            padding: "12px",
            backgroundColor: "rgba(0, 35, 40, 0.6)",
            borderRadius: "8px",
            border: "1px solid rgba(79, 209, 197, 0.1)",
          }}
        >
          <div
            style={{
              color: "#81E6D9",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span>🏪</span>
            <span>Estabelecimento</span>
            <span style={{ color: "#4FD1C5" }}>›</span>
            <span>{currentLabel}</span>
          </div>
        </div>

        {children}
      </main>
    </>
  );
};

/* -------------------- Rotas -------------------- */
const Menu = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });

    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Router>
      <GlobalStyles />
      <Routes>
        <Route path="/login" element={!user ? <TelaLogin /> : <Navigate to="/pedidos" />} />

        {/* ✅ Mantém Dashboard (mas não aparece no menu) */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        <Route
          path="/pedidos"
          element={user ? <Pedidos user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        <Route
          path="/cardapio"
          element={user ? <Cardapio user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        <Route
          path="/pagamentos"
          element={user ? <FormasPagamento user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        <Route
          path="/taxas"
          element={user ? <TaxaEntrega user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        {/* ✅ Mantém Faturamento (mas não aparece no menu) */}
        <Route
          path="/faturamento"
          element={user ? <Faturamento user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        {/* ✅ NOVA ROTA */}
        <Route
          path="/comissao"
          element={user ? <ComissaoPlataforma user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        <Route
          path="/entregadores"
          element={user ? <Entregadores user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        <Route
          path="/perfil"
          element={user ? <MeuPerfil user={user} isMobile={isMobile} /> : <Navigate to="/login" />}
        />

        {/* ✅ padrão: entra logado e vai pra /pedidos */}
        <Route path="/" element={<Navigate to={user ? "/pedidos" : "/login"} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default Menu;
