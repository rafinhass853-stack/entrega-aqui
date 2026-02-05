// PaginaInicialCliente.jsx
import React, { useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Filter,
  Home,
  ClipboardList,
  User,
  Calendar,
  ShoppingBag,
  Clock,
  Truck,
  Shield,
  X,
  ChevronRight,
  LogOut,
  LogIn,
} from "lucide-react";

import Cardapio from "./Cardapio";
import Carrinho from "./Carrinho";
import Cadastro from "./Cadastro";
import EnviarPedido from "./EnviarPedido";

import { categorias, getStylesPic } from "./Stylespic";
import { EstabelecimentoCard } from "./Componentspic";

import {
  useMediaQuery,
  useClienteStorage,
  useHorarioHelpers,
  useEstabelecimentos,
  useHistoricoPedidos,
} from "./Hookpic";

const PaginaInicialCliente = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const [telaAtual, setTelaAtual] = useState("home");
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState(null);

  const [pesquisa, setPesquisa] = useState("");
  const [cidade, setCidade] = useState("Araraquara");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [categoriasAtivas, setCategoriasAtivas] = useState([]);
  const [filtroFreteGratis, setFiltroFreteGratis] = useState(false);
  const [filtroAbertos, setFiltroAbertos] = useState(false);
  const [carrinho, setCarrinho] = useState([]);
  const [filtroOrdenacao, setFiltroOrdenacao] = useState("relevancia");

  const styles = useMemo(
    () => getStylesPic({ isMobile, isTablet, filtrosAbertos }),
    [isMobile, isTablet, filtrosAbertos]
  );

  // Storage cliente
  const { dadosCliente, setDadosCliente, logout: logoutStorage } = useClienteStorage();

  // Helpers horário
  const { montarTextoHorarioHoje, verificarAbertoAgora } = useHorarioHelpers();

  // Estabelecimentos
  const { estabelecimentos, loading } = useEstabelecimentos({
    montarTextoHorarioHoje,
    verificarAbertoAgora,
  });

  // Histórico pedidos
  const { historicoPedidos } = useHistoricoPedidos(dadosCliente);

  // --- FILTROS ---
  const estabelecimentosOrdenados = useMemo(() => {
    let filtrados = estabelecimentos.filter((est) => {
      const matchCidade =
        String(est?.endereco?.cidade || "").toLowerCase() ===
        String(cidade || "").toLowerCase();

      const matchPesquisa = String(est?.cliente || "")
        .toLowerCase()
        .includes(String(pesquisa || "").toLowerCase());

      const matchCategoria =
        categoriasAtivas.length === 0 || categoriasAtivas.includes(est.categoria);

      const matchFrete = !filtroFreteGratis || Number(est.taxaEntrega) === 0;
      const matchAberto = !filtroAbertos || Boolean(est.aberto);

      return matchCidade && matchPesquisa && matchCategoria && matchFrete && matchAberto;
    });

    switch (filtroOrdenacao) {
      case "tempo":
        return filtrados.sort((a, b) => (a.tempoEntrega || 0) - (b.tempoEntrega || 0));
      case "frete":
        return filtrados.sort((a, b) => (a.taxaEntrega || 0) - (b.taxaEntrega || 0));
      case "avaliacao":
        return filtrados.sort(() => Math.random() - 0.5);
      default:
        return filtrados;
    }
  }, [
    estabelecimentos,
    cidade,
    pesquisa,
    categoriasAtivas,
    filtroFreteGratis,
    filtroAbertos,
    filtroOrdenacao,
  ]);

  // --- FUNÇÕES ---
  const logout = () => {
    logoutStorage();
    setTelaAtual("home");
  };

  const atualizarQuantidade = (idUnico, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      setCarrinho((prev) => prev.filter((item) => item.idUnico !== idUnico));
    } else {
      setCarrinho((prev) =>
        prev.map((item) =>
          item.idUnico === idUnico ? { ...item, quantidade: novaQuantidade } : item
        )
      );
    }
  };

  const removerItem = (idUnico) =>
    setCarrinho((prev) => prev.filter((item) => item.idUnico !== idUnico));

  const navegarParaCheckout = () => {
    if (dadosCliente) setTelaAtual("enviar");
    else setTelaAtual("cadastro");
  };

  const totalItensCarrinho = useMemo(
    () => carrinho.reduce((acc, item) => acc + (item.quantidade || 0), 0),
    [carrinho]
  );

  // ✅ HOME
  const renderTelaHome = () => (
    <div style={{ ...styles.container }}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          {/* ✅ Topo: Logo + Cidade + Olá */}
          <div
            style={{
              ...styles.headerTop,
              flexWrap: isMobile ? "wrap" : "nowrap", // ✅ não quebra no desktop
              gap: isMobile ? "12px" : "16px",
            }}
          >
            {/* ESQUERDA: Logo */}
            <div style={{ ...styles.logoContainer, flexShrink: 0 }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "20px",
                }}
              >
                🏪
              </div>

              <div>
                <h1 style={styles.logo}>
                  <span style={styles.logoBlue}>Food</span>
                  <span style={styles.logoGreen}>Way</span>
                </h1>
                <div
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.7)",
                    marginTop: "2px",
                  }}
                >
                  Economia pra quem vende, vantagem pra quem compra
                </div>
              </div>
            </div>

            {/* DIREITA: Cidade + Olá */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                justifyContent: "flex-end",
                flex: 1,
                minWidth: isMobile ? "100%" : "auto",
              }}
            >
              {/* ✅ Seletor de cidade (sempre visível) */}
              <div
                style={{
                  ...styles.locationSelector,
                  flexShrink: 0,
                  minWidth: isMobile ? "100%" : "220px",
                }}
              >
                <MapPin size={isMobile ? 18 : 20} color="#10B981" />
                <select
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  style={styles.selectCity}
                >
                  <option value="Araraquara">Araraquara, SP</option>
                  <option value="São Carlos">São Carlos, SP</option>
                  <option value="São Simão">São Simão, SP</option>
                  <option value="Ribeirão Preto">Ribeirão Preto, SP</option>
                  <option value="Mogi Guaçu">Mogi Guaçu, SP</option>
                  <option value="Mogi Mirim">Mogi Mirim, SP</option>
                  <option value="Campinas">Campinas, SP</option>
                  <option value="Poços de Caldas">Poços de Caldas, MG</option>
                </select>
              </div>

              {/* ✅ “Olá, Nome” (só quando logado) */}
              {dadosCliente && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(255,255,255,0.15)",
                    padding: "8px 12px",
                    borderRadius: "50px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {String(dadosCliente?.nomeCompleto || "C")[0]}
                  </div>

                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff" }}>
                    Olá, {String(dadosCliente?.nomeCompleto || "").split(" ")[0] || "Cliente"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BUSCA */}
          <div style={styles.searchContainer}>
            <Search size={isMobile ? 20 : 22} color="#10B981" />
            <input
              type="text"
              placeholder="Buscar lojas, restaurantes, lanches..."
              style={styles.searchInput}
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
            <button
              onClick={() => setFiltrosAbertos(!filtrosAbertos)}
              style={styles.filterButton}
            >
              <Filter size={isMobile ? 20 : 22} color="#fff" />
            </button>
          </div>

          {/* ✅ MENU CATEGORIAS (garantido) */}
          <div style={{ ...styles.categoriesContainer, marginTop: "2px" }}>
            {categorias.map((cat) => {
              const isActive = categoriasAtivas.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    setCategoriasAtivas((prev) =>
                      prev.includes(cat.id)
                        ? prev.filter((c) => c !== cat.id)
                        : [...prev, cat.id]
                    )
                  }
                  style={{
                    ...styles.categoryButton,
                    background: isActive
                      ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                      : "rgba(255,255,255,0.15)",
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.2)",
                    transform: isActive ? "translateY(-2px)" : "none",
                    boxShadow: isActive ? "0 4px 15px rgba(16, 185, 129, 0.3)" : "none",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{cat.icon}</span>
                  <span>{cat.nome}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Filtros Sidebar */}
      <div style={styles.filtrosSidebar}>
        <div style={styles.filtroHeader}>
          <h3 style={styles.filtroTitle}>🔍 Filtros e Ordenação</h3>
          <button
            onClick={() => setFiltrosAbertos(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "8px",
            }}
          >
            <X size={24} color="#666" />
          </button>
        </div>

        <div style={styles.ordenacaoContainer}>
          <label
            style={{
              display: "block",
              marginBottom: "12px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#4A5568",
            }}
          >
            Ordenar por:
          </label>
          <select
            value={filtroOrdenacao}
            onChange={(e) => setFiltroOrdenacao(e.target.value)}
            style={styles.ordenacaoSelect}
          >
            <option value="relevancia">🎯 Mais relevantes</option>
            <option value="tempo">🚀 Menor tempo de entrega</option>
            <option value="frete">💰 Menor valor de frete</option>
            <option value="avaliacao">⭐ Melhor avaliação</option>
          </select>
        </div>

        <div style={{ marginTop: "24px" }}>
          <div
            style={styles.filtroOption}
            onClick={() => setFiltroFreteGratis(!filtroFreteGratis)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#D1FAE5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Truck size={20} color="#059669" />
              </div>
              <div>
                <div style={{ fontWeight: "700", color: "#0F3460" }}>Frete Grátis</div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  Mostrar apenas com entrega grátis
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={filtroFreteGratis}
              readOnly
              style={{ transform: "scale(1.4)", accentColor: "#10B981" }}
            />
          </div>

          <div style={styles.filtroOption} onClick={() => setFiltroAbertos(!filtroAbertos)}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#DBEAFE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clock size={20} color="#1D4ED8" />
              </div>
              <div>
                <div style={{ fontWeight: "700", color: "#0F3460" }}>Aberto Agora</div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  Mostrar apenas estabelecimentos abertos
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={filtroAbertos}
              readOnly
              style={{ transform: "scale(1.4)", accentColor: "#10B981" }}
            />
          </div>
        </div>

        <div style={styles.resultadosInfo}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#065F46" }}>
              {estabelecimentosOrdenados.length} estabelecimento(s) encontrado(s)
            </div>
            <button
              onClick={() => {
                setFiltroFreteGratis(false);
                setFiltroAbertos(false);
                setCategoriasAtivas([]);
                setFiltroOrdenacao("relevancia");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#10B981",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              Limpar filtros
            </button>
          </div>
          <div style={{ fontSize: "12px", color: "#047857" }}>
            {cidade} •{" "}
            {categoriasAtivas.length > 0
              ? `${categoriasAtivas.length} categoria(s) selecionada(s)`
              : "Todas as categorias"}
          </div>
        </div>

        <button
          onClick={() => setFiltrosAbertos(false)}
          style={{ ...styles.btnPrincipal, marginTop: "24px" }}
        >
          Aplicar Filtros
        </button>
      </div>

      {filtrosAbertos && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 999,
            backdropFilter: "blur(3px)",
          }}
          onClick={() => setFiltrosAbertos(false)}
        />
      )}

      {/* CONTEÚDO */}
      <main style={styles.content}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              marginTop: "60px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                border: "3px solid #F1F5F9",
                borderTopColor: "#10B981",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <div>
              <h3 style={{ color: "#0F3460", marginBottom: "8px" }}>
                Buscando estabelecimentos...
              </h3>
              <p style={{ color: "#64748B", fontSize: "14px" }}>
                Estamos carregando as melhores opções para você
              </p>
            </div>
          </div>
        ) : estabelecimentosOrdenados.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              marginTop: "60px",
              padding: "40px 20px",
              background: "white",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
            }}
          >
            <Search size={60} color="#CBD5E1" style={{ marginBottom: "20px" }} />
            <h3 style={{ color: "#0F3460", marginBottom: "12px", fontSize: "20px" }}>
              Nenhum estabelecimento encontrado
            </h3>
            <p style={{ color: "#64748B", marginBottom: "30px", fontSize: "15px" }}>
              {pesquisa ? `Nenhum resultado para "${pesquisa}"` : "Tente ajustar os filtros ou buscar em outra cidade"}
            </p>
            <button
              onClick={() => {
                setPesquisa("");
                setCategoriasAtivas([]);
                setFiltroFreteGratis(false);
                setFiltroAbertos(false);
              }}
              style={{ ...styles.btnPrincipal, maxWidth: "200px", margin: "0 auto" }}
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {estabelecimentosOrdenados.map((est) => (
              <EstabelecimentoCard
                key={est.id}
                estabelecimento={est}
                onClick={() => {
                  setEstabelecimentoSelecionado(est);
                  setTelaAtual("cardapio");
                }}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );

  const renderHistorico = () => (
    <div style={styles.containerInterno}>
      <header style={styles.headerSimples}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <ClipboardList size={isMobile ? 24 : 28} />
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? "20px" : "24px", fontWeight: "900" }}>
              Meus Pedidos
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", opacity: 0.9 }}>
              Histórico de todos os seus pedidos
            </p>
          </div>
        </div>
      </header>

      <div style={{ padding: isMobile ? "20px 16px" : "24px 20px" }}>
        {historicoPedidos.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "white",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
            }}
          >
            <ClipboardList size={isMobile ? 48 : 60} color="#CBD5E0" style={{ marginBottom: "20px" }} />
            <h3 style={{ color: "#0F3460", marginBottom: "12px", fontSize: "20px" }}>
              Nenhum pedido ainda
            </h3>
            <p style={{ color: "#718096", marginBottom: "30px", fontSize: "15px" }}>
              Faça seu primeiro pedido e acompanhe seu histórico aqui!
            </p>
            <button
              onClick={() => setTelaAtual("home")}
              style={{ ...styles.btnPrincipal, maxWidth: "300px", margin: "0 auto" }}
            >
              Explorar Estabelecimentos
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {historicoPedidos.map((p) => {
              const statusColors = {
                pendente: { bg: "#FEF3C7", color: "#92400E", icon: "⏳" },
                preparo: { bg: "#DBEAFE", color: "#1E40AF", icon: "👨‍🍳" },
                entrega: { bg: "#EDE9FE", color: "#5B21B6", icon: "🚚" },
                entregue: { bg: "#D1FAE5", color: "#065F46", icon: "✅" },
                concluido: { bg: "#D1FAE5", color: "#065F46", icon: "✅" },
                cancelado: { bg: "#FEE2E2", color: "#991B1B", icon: "❌" },
              };

              const status = statusColors[p.status] || statusColors.pendente;
              const dataPedido = p.dataCriacao?.toDate ? p.dataCriacao.toDate() : new Date();

              return (
                <div
                  key={p.id}
                  style={{
                    background: "white",
                    padding: isMobile ? "20px" : "24px",
                    borderRadius: "20px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                    borderLeft: `6px solid ${status.color}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <strong style={{ fontSize: isMobile ? "16px" : "18px", color: "#0F3460" }}>
                          {p.restauranteNome || p.estabelecimento?.nome || "Loja"}
                        </strong>
                        <span
                          style={{
                            fontSize: "11px",
                            color: status.color,
                            fontWeight: "900",
                            backgroundColor: `${status.bg}`,
                            padding: "6px 12px",
                            borderRadius: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {status.icon} {String(p.status || "pendente").toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "12px" }}>
                        <span style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={12} /> {dataPedido.toLocaleDateString("pt-BR")}
                        </span>
                        <span style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={12} /> {dataPedido.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <span style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: "900", color: "#10B981", whiteSpace: "nowrap" }}>
                      R$ {Number(p.pagamento?.total || 0).toFixed(2)}
                    </span>
                  </div>

                  <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "12px", marginTop: "12px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#4A5568", marginBottom: "8px" }}>
                      Itens do pedido:
                    </div>
                    <div style={{ fontSize: "14px", color: "#64748B", lineHeight: "1.6" }}>
                      {(p.itens || []).slice(0, 3).map((i, idx) => (
                        <div key={idx} style={{ marginBottom: "4px" }}>
                          • {i.quantidade}x {i.nome}
                        </div>
                      ))}
                      {(p.itens || []).length > 3 && (
                        <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
                          + {(p.itens || []).length - 3} item(s)
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "16px",
                      fontSize: "12px",
                      color: "#94A3B8",
                      paddingTop: "16px",
                      borderTop: "1px solid #F1F5F9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Shield size={12} />
                      <span>Pedido #{p.numeroPedido || String(p.id || "").slice(-6).toUpperCase()}</span>
                    </div>
                    <button
                      onClick={() => {
                        setEstabelecimentoSelecionado({ id: p.restauranteId, cliente: p.restauranteNome });
                        setTelaAtual("home");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#10B981",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Pedir novamente <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderPerfil = () => (
    <div style={styles.containerInterno}>
      <header style={styles.headerSimples}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <User size={isMobile ? 24 : 28} />
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? "20px" : "24px", fontWeight: "900" }}>
              Meu Perfil
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", opacity: 0.9 }}>
              Gerencie sua conta e endereço
            </p>
          </div>
        </div>
      </header>

      <div style={{ padding: isMobile ? "20px 16px" : "24px 20px" }}>
        {dadosCliente ? (
          <div style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div style={styles.perfilInfoBox}>
              <div style={styles.avatarLarge}>
                {String(dadosCliente?.nomeCompleto || "C")[0].toUpperCase()}
              </div>
              <h3 style={{ margin: "16px 0 8px 0", fontSize: isMobile ? "22px" : "26px", color: "#0F3460" }}>
                {dadosCliente.nomeCompleto}
              </h3>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#F0FDF4", borderRadius: "20px", marginTop: "8px" }}>
                <Shield size={14} color="#059669" />
                <span style={{ color: "#065F46", fontSize: "13px", fontWeight: "600" }}>
                  Cliente verificado
                </span>
              </div>
            </div>

            <button onClick={() => setTelaAtual("cadastro")} style={styles.btnPrincipal}>
              <User size={20} /> Editar Cadastro
            </button>

            <button onClick={logout} style={styles.btnSecundario}>
              <LogOut size={20} /> Sair da conta
            </button>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "white",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            <div style={styles.avatarLarge}>
              <User size={isMobile ? 40 : 48} />
            </div>
            <h2 style={{ color: "#0F3460", marginBottom: "12px", fontSize: "24px" }}>
              Olá, Visitante!
            </h2>
            <p style={{ color: "#64748B", marginBottom: "30px", fontSize: "16px", lineHeight: "1.6" }}>
              Acesse sua conta para ver seus pedidos, facilitar suas compras e ter uma experiência personalizada.
            </p>

            <button onClick={() => setTelaAtual("cadastro")} style={styles.btnPrincipal}>
              <LogIn size={20} /> Entrar ou Cadastrar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderConteudo = () => {
    switch (telaAtual) {
      case "cardapio":
        return (
          <Cardapio
            estabelecimento={estabelecimentoSelecionado}
            carrinho={carrinho}
            setCarrinho={setCarrinho}
            onVoltar={() => setTelaAtual("home")}
            onAbrirCarrinho={() => setTelaAtual("carrinho")}
          />
        );
      case "carrinho":
        return (
          <Carrinho
            carrinho={carrinho}
            setCarrinho={setCarrinho}
            onAtualizarQuantidade={atualizarQuantidade}
            onRemoverItem={removerItem}
            estabelecimento={estabelecimentoSelecionado}
            onVoltar={() => setTelaAtual("cardapio")}
            onIrParaCadastro={navegarParaCheckout}
          />
        );
      case "cadastro":
        return (
          <Cadastro
            dadosCliente={dadosCliente}
            onContinuar={(d) => {
              setDadosCliente(d);
              setTelaAtual("perfil");
            }}
            onVoltar={() => setTelaAtual("perfil")}
          />
        );
      case "enviar":
        return (
          <EnviarPedido
            carrinho={carrinho}
            estabelecimento={estabelecimentoSelecionado}
            dadosCliente={dadosCliente}
            onVoltar={() => setTelaAtual("carrinho")}
            onSucesso={() => {
              setCarrinho([]);
              setTelaAtual("historico");
            }}
          />
        );
      case "historico":
        return renderHistorico();
      case "perfil":
        return renderPerfil();
      default:
        return renderTelaHome();
    }
  };

  return (
    <div style={styles.wrapper}>
      {renderConteudo()}

      {["home", "historico", "perfil"].includes(telaAtual) && (
        <nav style={styles.bottomNav}>
          <div
            style={{ ...styles.navItem, color: telaAtual === "home" ? "#10B981" : "#94A3B8" }}
            onClick={() => setTelaAtual("home")}
          >
            <Home size={isMobile ? 24 : 26} color={telaAtual === "home" ? "#10B981" : "#94A3B8"} />
            <span style={{ fontWeight: telaAtual === "home" ? "800" : "600" }}>Início</span>
          </div>

          <div
            style={{ ...styles.navItem, color: telaAtual === "historico" ? "#10B981" : "#94A3B8" }}
            onClick={() => setTelaAtual("historico")}
          >
            <ClipboardList size={isMobile ? 24 : 26} color={telaAtual === "historico" ? "#10B981" : "#94A3B8"} />
            <span style={{ fontWeight: telaAtual === "historico" ? "800" : "600" }}>Pedidos</span>
          </div>

          <div style={{ ...styles.navItem, position: "relative" }} onClick={() => setTelaAtual("carrinho")}>
            <ShoppingBag size={isMobile ? 24 : 26} color="#10B981" />
            <span style={{ color: "#10B981", fontWeight: "800" }}>Carrinho</span>
            {totalItensCarrinho > 0 && (
              <div style={styles.carrinhoBadge}>
                {totalItensCarrinho > 9 ? "9+" : totalItensCarrinho}
              </div>
            )}
          </div>

          <div
            style={{ ...styles.navItem, color: telaAtual === "perfil" ? "#10B981" : "#94A3B8" }}
            onClick={() => setTelaAtual("perfil")}
          >
            <User size={isMobile ? 24 : 26} color={telaAtual === "perfil" ? "#10B981" : "#94A3B8"} />
            <span style={{ fontWeight: telaAtual === "perfil" ? "800" : "600" }}>Perfil</span>
          </div>
        </nav>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        select option {
          background: white;
          color: #1E293B;
        }
      `}</style>
    </div>
  );
};

export default PaginaInicialCliente;
