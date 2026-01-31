// ComponentsCardapio.jsx
import React, { useMemo } from "react";
import {
  Heart,
  Plus,
  Tag,
  Info,
  Check,
  X,
  ShoppingCart,
} from "lucide-react";

export function ItemCardapio({
  item,
  modo,
  styles,
  favoritos,
  toggleFavorito,
  handleAdicionarClick,
  brl,
  toNumber,
  normalizarGruposProduto,
  isMobile,
}) {
  const grupos = normalizarGruposProduto(item);
  const temPersonalizacao = grupos.length > 0 && grupos.some((g) => g.opcoes.length > 0);
  const isFavorito = favoritos[item.id];
  const temPromocao = toNumber(item.preco) < 30;

  if (modo === "list") {
    return (
      <div style={styles.itemCard}>
        <div style={{ display: "flex", padding: "20px", gap: "20px", alignItems: "flex-start" }}>
          {item.foto && (
            <div style={{ width: "100px", height: "100px", borderRadius: "16px", overflow: "hidden", flexShrink: 0 }}>
              <img src={item.foto} alt={item.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <h4 style={styles.itemName}>{item.nome}</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorito(item.id);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
              >
                <Heart size={20} color={isFavorito ? "#EF4444" : "#CBD5E0"} fill={isFavorito ? "#EF4444" : "none"} />
              </button>
            </div>

            <p style={styles.itemDescription}>{item.descricao}</p>

            <div style={styles.itemFooter}>
              <span style={styles.itemPrice}>{brl(item.preco)}</span>
              <button
                onClick={() => handleAdicionarClick(item)}
                style={{
                  ...styles.addButton,
                  background: temPersonalizacao
                    ? "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
                    : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                }}
              >
                {temPersonalizacao ? "Personalizar" : <Plus size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.itemCard}>
      <div style={styles.itemImageContainer}>
        {item.foto ? (
          <img src={item.foto} style={styles.itemImage} alt={item.nome} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontSize: "48px",
            }}
          >
            {String(item.nome || "P")[0]}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorito(item.id);
          }}
          style={styles.favoritoButton}
        >
          <Heart size={20} color={isFavorito ? "#EF4444" : "#CBD5E0"} fill={isFavorito ? "#EF4444" : "none"} />
        </button>

        {temPromocao && (
          <div style={styles.itemPromoBadge}>
            <Tag size={12} /> PROMOÇÃO
          </div>
        )}
      </div>

      <div style={styles.itemContent}>
        <h4 style={styles.itemName}>{item.nome}</h4>
        <p style={styles.itemDescription}>{item.descricao}</p>

        {grupos.length > 0 && (
          <div
            style={{
              marginBottom: "12px",
              fontSize: "12px",
              color: "#8B5CF6",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Info size={12} />
            {grupos.length} opção(ões) disponível(is)
          </div>
        )}

        <div style={styles.itemFooter}>
          <span style={styles.itemPrice}>{brl(item.preco)}</span>
          <button
            onClick={() => handleAdicionarClick(item)}
            style={{
              ...styles.addButton,
              background: temPersonalizacao
                ? "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
                : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            }}
          >
            {temPersonalizacao ? "Personalizar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LoadingCardapio({ styles, onVoltar, estabelecimento, ArrowLeft }) {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onVoltar} style={styles.backButton}>
          <ArrowLeft size={20} /> Voltar
        </button>
        <div style={{ width: "40px" }} />
      </header>

      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <h3 style={{ color: "#0F3460", marginBottom: "8px" }}>Carregando cardápio...</h3>
        <p style={{ color: "#64748B" }}>
          Buscando as delícias de {estabelecimento?.cliente || "o estabelecimento"}
        </p>
      </div>
    </div>
  );
}

export function ModalPersonalizar({
  styles,
  isMobile,
  produtoModal,
  setProdutoModal,
  selecoes,
  toggleOpcao,
  confirmarPersonalizacao,
  podeConfirmar,
  calcularTotalModal,
  brl,
  toNumber,
  normalizarGruposProduto,
  getFotoOpcao,
}) {
  if (!produtoModal) return null;

  const grupos = useMemo(() => normalizarGruposProduto(produtoModal), [produtoModal, normalizarGruposProduto]);

  return (
    <div style={styles.modalOverlay} onClick={() => setProdutoModal(null)}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={{ flex: 1 }}>
            <h2 style={styles.modalTitle}>{produtoModal.nome}</h2>
            <p style={styles.modalSub}>{produtoModal.descricao}</p>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
              <div
                style={{
                  padding: "6px 12px",
                  background: "#F0FDF4",
                  color: "#065F46",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Tag size={14} />
                {brl(produtoModal.preco)} base
              </div>

              <div
                style={{
                  padding: "6px 12px",
                  background: "#FEF3C7",
                  color: "#92400E",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                {produtoModal.categoria}
              </div>
            </div>
          </div>

          <button style={styles.closeBtn} onClick={() => setProdutoModal(null)}>
            <X size={isMobile ? 20 : 24} />
          </button>
        </div>

        {grupos.map((grupo) => {
          const selecionadas = selecoes[grupo.id] ? Object.keys(selecoes[grupo.id]).length : 0;
          const obrigatorioText = grupo.obrigatorio ? " (Obrigatório)" : " (Opcional)";

          return (
            <div key={grupo.id} style={styles.grupoBox}>
              <p style={styles.grupoNome}>
                {grupo.nomeGrupo}
                {obrigatorioText}
              </p>
              <p style={styles.grupoLimites}>
                {grupo.qtdMinima > 0
                  ? `Selecione ${grupo.qtdMinima} a ${grupo.qtdMaxima} opções`
                  : `Selecione até ${grupo.qtdMaxima} opções`}{" "}
                • escolhido: <b style={{ color: "#10B981" }}>{selecionadas}</b>
              </p>

              {grupo.opcoes.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    background: "#F8FAFC",
                    borderRadius: "12px",
                    textAlign: "center",
                    color: "#64748B",
                  }}
                >
                  Nenhuma opção disponível para este grupo.
                </div>
              ) : (
                grupo.opcoes.map((opt, idx) => {
                  const nome = opt.nome || `Opção ${idx + 1}`;
                  const preco = toNumber(opt.preco ?? opt.precoUnitario ?? 0);
                  const foto = getFotoOpcao(opt);
                  const selected = !!(selecoes[grupo.id] && selecoes[grupo.id][nome]);

                  return (
                    <div
                      key={`${grupo.id}_${idx}`}
                      style={styles.opcaoCard(selected)}
                      onClick={() => toggleOpcao(grupo, { ...opt, nome, preco, fotoUrl: foto })}
                    >
                      {foto && <img src={foto} style={styles.opcaoImg} alt={nome} />}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "900", color: "#0F3460", fontSize: isMobile ? "15px" : "16px" }}>
                          {nome}
                        </div>

                        {opt.descricao && (
                          <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                            {opt.descricao}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: "8px",
                            fontWeight: "900",
                            color: preco > 0 ? "#10B981" : "#059669",
                            fontSize: isMobile ? "14px" : "15px",
                          }}
                        >
                          {preco > 0 ? `+ ${brl(preco)}` : "Grátis"}
                        </div>
                      </div>

                      <div style={{ ...styles.checkboxCircle, ...(selected ? styles.checkboxActive : {}) }}>
                        {selected && <Check size={isMobile ? 16 : 18} color="white" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}

        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            background: "#F0FDF4",
            borderRadius: "16px",
            border: "2px solid #A7F3D0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#047857" }}>Total do item</div>
              <div style={{ fontSize: "12px", color: "#059669" }}>Incluindo opções selecionadas</div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "900", color: "#065F46" }}>
              {brl(calcularTotalModal())}
            </div>
          </div>
        </div>

        <button style={styles.btnConfirmar(podeConfirmar)} disabled={!podeConfirmar} onClick={confirmarPersonalizacao}>
          <ShoppingCart size={20} />
          Adicionar ao carrinho • {brl(calcularTotalModal())}
        </button>
      </div>
    </div>
  );
}
