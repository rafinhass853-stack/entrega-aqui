// Stylespic.jsx

export const categorias = [
  { id: "lanches", nome: "🍔 Lanches", icon: "🍔" },
  { id: "japonesa", nome: "🍣 Japonesa", icon: "🍣" },
  { id: "churrasco", nome: "🥩 Churrasco", icon: "🥩" },
  { id: "pizza", nome: "🍕 Pizza", icon: "🍕" },
  { id: "brasileira", nome: "🥘 Brasileira", icon: "🥘" },
  { id: "italiana", nome: "🍝 Italiana", icon: "🍝" },
  { id: "saudavel", nome: "🥗 Saudável", icon: "🥗" },
  { id: "doces", nome: "🍰 Doces", icon: "🍰" },
  { id: "sorvetes", nome: "🍦 Sorvetes", icon: "🍦" },
];

export const getStylesPic = ({ isMobile, isTablet, filtrosAbertos }) => {
  const maxW = isMobile ? "100%" : isTablet ? "900px" : "1200px";

  return {
    wrapper: {
      position: "relative",
      minHeight: "100vh",
      width: "100%",
      background: "#F8FAFC",
    },

    container: {
      backgroundColor: "#F8FAFC",
      minHeight: "100vh",
      width: "100%",
      maxWidth: maxW,
      margin: "0 auto",
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingLeft: isMobile ? "0" : "16px",
      paddingRight: isMobile ? "0" : "16px",
      paddingBottom: isMobile ? "100px" : "28px",
    },

    header: {
      background: "linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)",
      padding: "0px",
      borderBottomLeftRadius: "24px",
      borderBottomRightRadius: "24px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 4px 20px rgba(15, 52, 96, 0.15)",
    },

    headerInner: {
      maxWidth: maxW,
      margin: "0 auto",
      padding: isMobile ? "20px 16px" : "24px 20px",
      paddingLeft: isMobile ? "16px" : "20px",
      paddingRight: isMobile ? "16px" : "20px",
    },

    headerTop: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      flexWrap: "wrap",
      gap: "12px",
    },

    logoContainer: { display: "flex", alignItems: "center", gap: "10px" },

    logo: {
      margin: 0,
      fontSize: isMobile ? "22px" : "26px",
      fontWeight: "900",
      letterSpacing: "-0.5px",
    },

    logoBlue: { color: "#fff" },
    logoGreen: { color: "#10B981" },

    locationSelector: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "rgba(255,255,255,0.15)",
      padding: isMobile ? "8px 12px" : "10px 14px",
      borderRadius: "12px",
      minWidth: isMobile ? "180px" : "220px",
      border: "1px solid rgba(255,255,255,0.2)",
      backdropFilter: "blur(10px)",
    },

    selectCity: {
      background: "none",
      border: "none",
      color: "#fff",
      outline: "none",
      fontSize: isMobile ? "13px" : "14px",
      width: "100%",
      fontWeight: "600",
      cursor: "pointer",
    },

    searchContainer: {
      display: "flex",
      gap: "12px",
      backgroundColor: "#fff",
      padding: "12px",
      borderRadius: "14px",
      alignItems: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      marginBottom: "16px",
    },

    searchInput: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: isMobile ? "14px" : "16px",
      padding: "8px",
      fontWeight: "500",
      color: "#1E293B",
      minWidth: 0,
    },

    filterButton: {
      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      border: "none",
      borderRadius: "10px",
      padding: isMobile ? "10px" : "12px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
      flexShrink: 0,
    },

    // ✅ AQUI É A CORREÇÃO DO MENU DE CATEGORIAS
    // - Mobile: scroll horizontal
    // - Desktop/Tablet: quebra em linhas (wrap) e não corta
    categoriesContainer: {
      display: "flex",
      gap: "10px",

      // mobile: scroll
      overflowX: isMobile ? "auto" : "visible",
      overflowY: "visible",

      // desktop/tablet: quebra linha
      flexWrap: isMobile ? "nowrap" : "wrap",
      justifyContent: isMobile ? "flex-start" : "center",

      paddingBottom: isMobile ? "8px" : "0px",
      scrollbarWidth: "none",
      msOverflowStyle: "none",

      // ✅ evita a última categoria ficar “cortada” na borda
      paddingRight: isMobile ? "6px" : "0px",
      rowGap: isMobile ? "0px" : "10px",
    },

    categoryButton: {
      border: "none",
      padding: isMobile ? "10px 16px" : "12px 18px",
      borderRadius: "50px",
      color: "#fff",
      whiteSpace: "nowrap",
      fontSize: isMobile ? "13px" : "14px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: "600",
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.2)",
      backdropFilter: "blur(10px)",
      flexShrink: 0,
    },

    // ✅ reduzimos um pouco o padding pra caber mais cards
    content: {
      width: "100%",
      padding: isMobile ? "18px 16px" : "20px 0px",
      paddingBottom: isMobile ? "120px" : "40px",
    },

    // ✅ 4 COLUNAS NO DESKTOP
    grid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : isTablet
        ? "repeat(2, 1fr)"
        : "repeat(4, minmax(0, 1fr))",
      gap: isMobile ? "18px" : isTablet ? "18px" : "16px",
    },

    bottomNav: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: maxW,
      maxWidth: maxW,
      height: isMobile ? "80px" : "72px",
      backgroundColor: "white",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      boxShadow: "0 -10px 25px rgba(0,0,0,0.08)",
      borderTop: "1px solid #E2E8F0",
      zIndex: 100,
      borderRadius: isMobile ? "24px 24px 0 0" : "20px 20px 0 0",
      padding: isMobile ? "0 10px" : "0 16px",
    },

    navItem: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontSize: isMobile ? "10px" : "12px",
      gap: "6px",
      color: "#94A3B8",
      cursor: "pointer",
      padding: isMobile ? "12px 16px" : "10px",
      borderRadius: "12px",
      transition: "all 0.2s ease",
      flex: 1,
      position: "relative",
    },

    carrinhoBadge: {
      position: "absolute",
      top: "-8px",
      right: "0px",
      backgroundColor: "#EF4444",
      color: "white",
      borderRadius: "50%",
      width: "20px",
      height: "20px",
      fontSize: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      border: "2px solid white",
    },

    headerSimples: {
      background: "linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)",
      padding: isMobile ? "20px 16px" : "24px 20px",
      color: "white",
      textAlign: "center",
      borderBottomLeftRadius: "24px",
      borderBottomRightRadius: "24px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 4px 20px rgba(15, 52, 96, 0.15)",
    },

    containerInterno: {
      backgroundColor: "#F8FAFC",
      minHeight: "100vh",
      width: "100%",
      maxWidth: maxW,
      margin: "0 auto",
      paddingLeft: isMobile ? "0" : "16px",
      paddingRight: isMobile ? "0" : "16px",
      paddingBottom: isMobile ? "100px" : "28px",
    },

    avatarLarge: {
      width: isMobile ? "80px" : "100px",
      height: isMobile ? "80px" : "100px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: isMobile ? "32px" : "40px",
      color: "#fff",
      margin: "0 auto",
      fontWeight: "bold",
      boxShadow: "0 10px 25px rgba(102, 126, 234, 0.3)",
    },

    perfilInfoBox: { textAlign: "center", marginBottom: "30px", padding: "20px" },

    btnPrincipal: {
      width: "100%",
      padding: isMobile ? "16px" : "18px",
      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      color: "white",
      border: "none",
      borderRadius: "14px",
      fontWeight: "800",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      cursor: "pointer",
      fontSize: isMobile ? "15px" : "16px",
      transition: "all 0.3s ease",
      marginTop: "16px",
      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
    },

    btnSecundario: {
      width: "100%",
      padding: isMobile ? "14px" : "16px",
      backgroundColor: "transparent",
      color: "#EF4444",
      border: "2px solid #EF4444",
      borderRadius: "14px",
      fontWeight: "800",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      cursor: "pointer",
      marginTop: "16px",
      fontSize: isMobile ? "15px" : "16px",
      transition: "all 0.3s ease",
    },

    enderecoResumo: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: isMobile ? "16px" : "20px",
      backgroundColor: "#fff",
      borderRadius: "16px",
      color: "#4A5568",
      fontSize: isMobile ? "14px" : "15px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
      marginBottom: "20px",
      border: "1px solid #E2E8F0",
    },

    filtrosSidebar: {
      position: "fixed",
      top: 0,
      right: filtrosAbertos ? "0" : "-100%",
      width: isMobile ? "90%" : "350px",
      height: "100vh",
      backgroundColor: "white",
      boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
      zIndex: 1000,
      transition: "right 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      padding: "24px",
      overflowY: "auto",
    },

    filtroHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      paddingBottom: "16px",
      borderBottom: "2px solid #F1F5F9",
    },

    filtroTitle: {
      margin: 0,
      fontSize: "20px",
      color: "#0F3460",
      fontWeight: "900",
    },

    filtroOption: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px",
      padding: "16px",
      backgroundColor: "#F8FAFC",
      borderRadius: "12px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      border: "1px solid #E2E8F0",
    },

    ordenacaoContainer: {
      marginTop: "24px",
      paddingTop: "20px",
      borderTop: "1px solid #E2E8F0",
    },

    ordenacaoSelect: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: "10px",
      border: "1px solid #E2E8F0",
      backgroundColor: "#F8FAFC",
      fontSize: "14px",
      color: "#4A5568",
      outline: "none",
      cursor: "pointer",
    },

    resultadosInfo: {
      marginTop: "20px",
      padding: "16px",
      backgroundColor: "#F0FDF4",
      borderRadius: "12px",
      border: "1px solid #A7F3D0",
    },
  };
};
