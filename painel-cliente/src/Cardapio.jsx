// Cardapio.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ShoppingCart, Star, Clock as ClockIcon, Search, Filter, Grid, List, ChevronDown, ChevronUp, Package } from "lucide-react";

import { getStylesCardapio } from "./StylesCardapio";
import { ItemCardapio, LoadingCardapio, ModalPersonalizar } from "./ComponentsCardapio";
import {
  useIsMobile,
  useCardapioFirestore,
  toNumber,
  brl,
  normalizarGruposProduto,
  getFotoOpcao,
  criarIdUnico,
  calcularTotalUnitario,
  getCategoriaIcon,
} from "./HookCardapio";

const Cardapio = ({ estabelecimento, onVoltar, onAbrirCarrinho, carrinho, setCarrinho }) => {
  const { isMobile, isTablet } = useIsMobile();

  const [categoriaSelecionada, setCategoriaSelecionada] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modoVisualizacao, setModoVisualizacao] = useState(isMobile ? "grid" : "grid");
  const [showFilters, setShowFilters] = useState(false);
  const [ordem, setOrdem] = useState("nome");
  const [filtroPreco, setFiltroPreco] = useState({ min: "", max: "" });

  const [produtoModal, setProdutoModal] = useState(null);
  const [selecoes, setSelecoes] = useState({});
  const [favoritos, setFavoritos] = useState({});

  const carrinhoRef = useRef(null);
  const searchInputRef = useRef(null);

  const { cardapio, categorias, expandedCategories, setExpandedCategories, loading } = useCardapioFirestore(estabelecimento?.id);

  const styles = useMemo(() => getStylesCardapio({ isMobile, isTablet, showFilters }), [isMobile, isTablet, showFilters]);

  useEffect(() => {
    setModoVisualizacao(isMobile ? "grid" : "grid");
  }, [isMobile]);

  const cardapioFiltrado = useMemo(() => {
    let filtrado = [...cardapio];

    if (categoriaSelecionada !== "todos") {
      filtrado = filtrado.filter((i) => (i.categoria || "sem-categoria") === categoriaSelecionada);
    }

    if (busca.trim()) {
      const t = busca.toLowerCase();
      filtrado = filtrado.filter(
        (i) =>
          i?.nome?.toLowerCase().includes(t) ||
          i?.descricao?.toLowerCase().includes(t) ||
          i?.categoria?.toLowerCase().includes(t)
      );
    }

    if (filtroPreco.min || filtroPreco.max) {
      filtrado = filtrado.filter((item) => {
        const preco = toNumber(item.preco);
        const min = filtroPreco.min ? Number(filtroPreco.min) : 0;
        const max = filtroPreco.max ? Number(filtroPreco.max) : Infinity;
        return preco >= min && preco <= max;
      });
    }

    filtrado.sort((a, b) => {
      if (ordem === "nome") return String(a.nome || "").localeCompare(String(b.nome || ""));
      if (ordem === "preco-asc") return toNumber(a.preco) - toNumber(b.preco);
      if (ordem === "preco-desc") return toNumber(b.preco) - toNumber(a.preco);
      if (ordem === "popular") {
        const favA = favoritos[a.id] ? 1 : 0;
        const favB = favoritos[b.id] ? 1 : 0;
        return favB - favA;
      }
      return 0;
    });

    return filtrado;
  }, [cardapio, categoriaSelecionada, busca, filtroPreco, ordem, favoritos]);

  const itensPorCategoria = useMemo(() => {
    return cardapioFiltrado.reduce((acc, item) => {
      const cat = item.categoria || "sem-categoria";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  }, [cardapioFiltrado]);

  const totalItensCarrinho = useMemo(
    () => carrinho.reduce((acc, i) => acc + Number(i.quantidade || 0), 0),
    [carrinho]
  );

  const calcularTotalCarrinhoSemEntrega = () => carrinho.reduce((total, item) => total + toNumber(item.precoTotalItem || 0), 0);

  const toggleCategoria = (categoria) => {
    setExpandedCategories((prev) => ({ ...prev, [categoria]: !prev[categoria] }));
  };

  const toggleFavorito = (produtoId) => {
    setFavoritos((prev) => ({ ...prev, [produtoId]: !prev[produtoId] }));
  };

  const adicionarNoCarrinho = (produto, escolhas) => {
    const precoBaseUnitario = toNumber(produto.preco);
    const unit = calcularTotalUnitario(precoBaseUnitario, escolhas);

    const idUnico = criarIdUnico(produto, escolhas);

    setCarrinho((prev) => {
      const existente = prev.find((i) => i.idUnico === idUnico);
      if (existente) {
        return prev.map((i) => {
          if (i.idUnico !== idUnico) return i;
          const novaQtd = Number(i.quantidade || 1) + 1;
          return { ...i, quantidade: novaQtd, precoTotalItem: unit * novaQtd };
        });
      }

      const novoItem = {
        id: produto.id,
        idUnico,
        nome: produto.nome,
        foto: produto.foto || null,
        descricao: produto.descricao || "",
        categoria: produto.categoria || "",
        precoBaseUnitario,
        escolhas,
        quantidade: 1,
        precoTotalItem: unit * 1,
      };

      if (carrinhoRef.current) {
        carrinhoRef.current.style.transform = "scale(1.2)";
        carrinhoRef.current.style.color = "#10B981";
        setTimeout(() => {
          if (carrinhoRef.current) {
            carrinhoRef.current.style.transform = "scale(1)";
            carrinhoRef.current.style.color = "";
          }
        }, 300);
      }

      return [...prev, novoItem];
    });
  };

  const handleAdicionarClick = (item) => {
    const grupos = normalizarGruposProduto(item);

    if (grupos.length > 0 && grupos.some((g) => g.opcoes.length > 0)) {
      setProdutoModal(item);
      const init = {};
      grupos.forEach((g) => (init[g.id] = {}));
      setSelecoes(init);
      return;
    }

    adicionarNoCarrinho(item, []);
  };

  const toggleOpcao = (grupo, opcao) => {
    const grupoId = grupo.id;
    const atualGrupo = selecoes[grupoId] || {};
    const nome = opcao.nome || "Opção";
    const preco = toNumber(opcao.preco ?? opcao.precoUnitario ?? 0);

    const jaExiste = !!atualGrupo[nome];
    const selecionadasCount = Object.keys(atualGrupo).length;

    if (jaExiste) {
      const novoGrupo = { ...atualGrupo };
      delete novoGrupo[nome];
      setSelecoes((prev) => ({ ...prev, [grupoId]: novoGrupo }));
      return;
    }

    if (selecionadasCount >= Number(grupo.qtdMaxima || 999)) {
      alert(`Você pode escolher no máximo ${grupo.qtdMaxima} item(ns) em "${grupo.nomeGrupo}".`);
      return;
    }

    const foto = getFotoOpcao(opcao);

    setSelecoes((prev) => ({
      ...prev,
      [grupoId]: {
        ...atualGrupo,
        [nome]: { nome, preco, qtd: 1, foto },
      },
    }));
  };

  const confirmarPersonalizacao = () => {
    if (!produtoModal) return;

    const grupos = normalizarGruposProduto(produtoModal);

    for (const g of grupos) {
      if (g.obrigatorio) {
        const selecionadas = selecoes[g.id] ? Object.keys(selecoes[g.id]).length : 0;
        const min = Number(g.qtdMinima ?? 0);
        if (selecionadas < min) {
          alert(`Escolha pelo menos ${min} item(ns) em "${g.nomeGrupo}".`);
          return;
        }
      }
    }

    const escolhas = grupos.map((g) => {
      const mapa = selecoes[g.id] || {};
      const itens = Object.values(mapa).map((it) => ({
        nome: it.nome,
        preco: toNumber(it.preco),
        qtd: Number(it.qtd || 1),
        foto: it.foto || null,
      }));
      return { grupoNome: g.nomeGrupo, itens };
    });

    adicionarNoCarrinho(produtoModal, escolhas);
    setProdutoModal(null);
  };

  const calcularTotalModal = () => {
    if (!produtoModal) return 0;
    const base = toNumber(produtoModal.preco);
    const grupos = normalizarGruposProduto(produtoModal);
    let extras = 0;

    grupos.forEach((g) => {
      const selecionadas = selecoes[g.id] || {};
      Object.values(selecionadas).forEach((opcao) => {
        extras += toNumber(opcao.preco) * (opcao.qtd || 1);
      });
    });

    return base + extras;
  };

  const podeConfirmar = useMemo(() => {
    if (!produtoModal) return false;

    const grupos = normalizarGruposProduto(produtoModal);
    for (const g of grupos) {
      if (g.obrigatorio) {
        const count = selecoes[g.id] ? Object.keys(selecoes[g.id]).length : 0;
        if (count < Number(g.qtdMinima ?? 0)) return false;
      }
    }
    return true;
  }, [produtoModal, selecoes]);

  if (loading) {
    return (
      <LoadingCardapio
        styles={styles}
        onVoltar={onVoltar}
        estabelecimento={estabelecimento}
        ArrowLeft={ArrowLeft}
      />
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        select { appearance: none; }
      `}</style>

      <header style={styles.header}>
        <button onClick={onVoltar} style={styles.backButton}>
          <ArrowLeft size={isMobile ? 20 : 24} /> Voltar
        </button>

        <button ref={carrinhoRef} onClick={onAbrirCarrinho} style={styles.carrinhoButton}>
          <ShoppingCart size={isMobile ? 20 : 24} />
          <span>Carrinho</span>
          {totalItensCarrinho > 0 && (
            <div style={styles.carrinhoBadge}>{totalItensCarrinho > 9 ? "9+" : totalItensCarrinho}</div>
          )}
        </button>
      </header>

      <div style={styles.storeInfo}>
        <h1 style={styles.storeName}>{estabelecimento?.cliente || "Loja"}</h1>
        <div style={styles.storeBadges}>
          <span style={{ ...styles.badge, ...styles.badgeOpen }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
            Aberto agora
          </span>
          <span style={{ ...styles.badge, ...styles.badgeRating }}>
            <Star size={12} fill="#FBBF24" /> 4.9
          </span>
          <span style={{ ...styles.badge, ...styles.badgeTime }}>
            <ClockIcon size={12} /> 30-45 min
          </span>
        </div>
      </div>

      <div style={styles.filtrosContainer}>
        <div style={styles.buscaContainer}>
          <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "200px" : "300px" }}>
            <Search size={20} color="#64748B" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar no cardápio..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <button onClick={() => setShowFilters(true)} style={styles.filterButton}>
            <Filter size={isMobile ? 20 : 22} />
          </button>

          <div style={styles.viewToggle}>
            <button
              onClick={() => setModoVisualizacao("grid")}
              style={{ ...styles.viewButton, ...(modoVisualizacao === "grid" ? styles.viewButtonAtivo : {}) }}
              title="Grid"
            >
              <Grid size={isMobile ? 18 : 20} />
              {!isMobile && "Grid"}
            </button>
            <button
              onClick={() => setModoVisualizacao("list")}
              style={{ ...styles.viewButton, ...(modoVisualizacao === "list" ? styles.viewButtonAtivo : {}) }}
              title="Lista"
            >
              <List size={isMobile ? 18 : 20} />
              {!isMobile && "Lista"}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Filtros */}
      <div style={styles.filtrosSidebar}>
        <div style={styles.filtroHeader}>
          <h3 style={styles.filtroTitle}>
            <Filter size={24} /> Filtros
          </h3>
          <button onClick={() => setShowFilters(false)} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div style={styles.filtroGroup}>
          <label style={styles.filtroLabel}>Ordenar por:</label>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value)} style={styles.filtroSelect}>
            <option value="nome">📝 Nome (A-Z)</option>
            <option value="preco-asc">💰 Preço (Menor → Maior)</option>
            <option value="preco-desc">💰 Preço (Maior → Menor)</option>
            <option value="popular">🔥 Mais populares</option>
          </select>
        </div>

        <div style={styles.filtroGroup}>
          <label style={styles.filtroLabel}>Faixa de Preço:</label>
          <div style={styles.filtroRange}>
            <input
              type="number"
              placeholder="Mínimo"
              value={filtroPreco.min}
              onChange={(e) => setFiltroPreco((prev) => ({ ...prev, min: e.target.value }))}
              style={styles.filtroInput}
              min="0"
              step="0.01"
            />
            <span style={{ color: "#64748B", fontWeight: "700" }}>até</span>
            <input
              type="number"
              placeholder="Máximo"
              value={filtroPreco.max}
              onChange={(e) => setFiltroPreco((prev) => ({ ...prev, max: e.target.value }))}
              style={styles.filtroInput}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setFiltroPreco({ min: "", max: "" });
            setOrdem("nome");
            setBusca("");
            setShowFilters(false);
          }}
          style={{
            width: "100%",
            padding: "16px",
            background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
            color: "white",
            border: "none",
            borderRadius: "14px",
            fontWeight: "900",
            cursor: "pointer",
            marginTop: "20px",
            fontSize: "16px",
          }}
        >
          🗑️ Limpar Todos os Filtros
        </button>

        <div style={{ marginTop: "30px", padding: "20px", background: "#F0FDF4", borderRadius: "16px", border: "1px solid #A7F3D0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <Package size={20} color="#059669" />
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#065F46" }}>{cardapioFiltrado.length} produtos encontrados</div>
          </div>
          <div style={{ fontSize: "13px", color: "#047857" }}>
            {categoriaSelecionada === "todos" ? "Todas as categorias" : `Categoria: ${categoriaSelecionada}`}
          </div>
        </div>
      </div>

      {showFilters && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1999,
            backdropFilter: "blur(3px)",
          }}
          onClick={() => setShowFilters(false)}
        />
      )}

      <div style={styles.categoriasContainer}>
        {categorias.map((cat) => {
          const isActive = categoriaSelecionada === cat;
          const count =
            cat === "todos" ? cardapio.length : cardapio.filter((i) => (i.categoria || "sem-categoria") === cat).length;

          return (
            <button
              key={cat}
              onClick={() => setCategoriaSelecionada(cat)}
              style={{ ...styles.categoriaButton, ...(isActive ? styles.categoriaButtonAtiva : {}) }}
              title={cat}
            >
              <span style={styles.categoriaIcon}>{cat === "todos" ? "🍽️" : getCategoriaIcon(cat)}</span>
              <span style={{ ...styles.categoriaNome, ...(isActive ? styles.categoriaNomeAtiva : {}) }}>
                {cat === "todos" ? "Todos" : cat}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: isActive ? "#10B981" : "#94A3B8",
                  fontWeight: "700",
                  background: isActive ? "#D1FAE5" : "#F1F5F9",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={styles.shell}>
        {!isMobile && (
          <aside style={styles.desktopSidebar}>
            <p style={styles.sideTitle}>
              <Package size={20} /> Categorias
            </p>

            <button style={styles.sideCatBtn(categoriaSelecionada === "todos")} onClick={() => setCategoriaSelecionada("todos")}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>🍽️</span>
                <span>Todos</span>
              </div>
              <span style={{ color: "#64748B", fontWeight: 900 }}>{cardapio.length}</span>
            </button>

            {Object.keys(itensPorCategoria).map((cat) => (
              <button key={cat} style={styles.sideCatBtn(categoriaSelecionada === cat)} onClick={() => setCategoriaSelecionada(cat)}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>{getCategoriaIcon(cat)}</span>
                  <span style={{ textTransform: "capitalize" }}>{cat}</span>
                </div>
                <span style={{ color: "#64748B", fontWeight: 900 }}>{itensPorCategoria[cat]?.length || 0}</span>
              </button>
            ))}
          </aside>
        )}

        <div style={styles.cardapioContainer}>
          {Object.keys(itensPorCategoria).length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", background: "white", borderRadius: "20px", boxShadow: "0 8px 25px rgba(0,0,0,0.05)" }}>
              <Search size={60} color="#CBD5E1" style={{ marginBottom: "20px" }} />
              <h3 style={{ color: "#0F3460", marginBottom: "12px" }}>Nenhum produto encontrado</h3>
              <p style={{ color: "#64748B", marginBottom: "30px" }}>
                {busca ? `Nenhum resultado para "${busca}"` : "Tente selecionar outra categoria"}
              </p>
              <button onClick={() => { setBusca(""); setCategoriaSelecionada("todos"); }} style={{ ...styles.addButton, maxWidth: "200px", margin: "0 auto" }}>
                Limpar busca
              </button>
            </div>
          ) : (
            Object.entries(itensPorCategoria).map(([categoria, itens]) => (
              <div key={categoria} style={styles.categoriaSection}>
                <div style={styles.categoriaHeader} onClick={() => toggleCategoria(categoria)}>
                  <h3 style={styles.categoriaTitle}>
                    <span style={{ fontSize: "24px" }}>{getCategoriaIcon(categoria)}</span>
                    {categoria}
                    <span style={styles.categoriaCount}>({itens.length})</span>
                  </h3>
                  {expandedCategories[categoria] ? <ChevronUp size={isMobile ? 24 : 28} color="#64748B" /> : <ChevronDown size={isMobile ? 24 : 28} color="#64748B" />}
                </div>

                {expandedCategories[categoria] && (
                  <div style={modoVisualizacao === "grid" ? styles.itensGrid : styles.itensList}>
                    {itens.map((item) => (
                      <ItemCardapio
                        key={item.id}
                        item={item}
                        modo={modoVisualizacao}
                        styles={styles}
                        favoritos={favoritos}
                        toggleFavorito={toggleFavorito}
                        handleAdicionarClick={handleAdicionarClick}
                        brl={brl}
                        toNumber={toNumber}
                        normalizarGruposProduto={normalizarGruposProduto}
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ModalPersonalizar
        styles={styles}
        isMobile={isMobile}
        produtoModal={produtoModal}
        setProdutoModal={setProdutoModal}
        selecoes={selecoes}
        toggleOpcao={toggleOpcao}
        confirmarPersonalizacao={confirmarPersonalizacao}
        podeConfirmar={podeConfirmar}
        calcularTotalModal={calcularTotalModal}
        brl={brl}
        toNumber={toNumber}
        normalizarGruposProduto={normalizarGruposProduto}
        getFotoOpcao={getFotoOpcao}
      />

      {carrinho.length > 0 && (
        <div style={styles.carrinhoFlutuante}>
          <div>
            <div style={{ fontSize: isMobile ? "12px" : "13px", opacity: 0.9, fontWeight: "700" }}>Total sem entrega</div>
            <div style={{ fontSize: isMobile ? "22px" : "24px", fontWeight: "900", marginTop: "4px" }}>
              {brl(calcularTotalCarrinhoSemEntrega())}
            </div>
          </div>
          <button onClick={onAbrirCarrinho} style={styles.carrinhoAction}>
            Ver carrinho ({totalItensCarrinho}) <ShoppingCart size={isMobile ? 20 : 22} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Cardapio;
