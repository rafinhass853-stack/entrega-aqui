// NotificacaoPedido.jsx
import React, { useMemo } from "react";
import { Clock, MapPin, Phone, Package, CheckCircle, XCircle, Bell, CreditCard } from "lucide-react";
import { formatMoneyBR } from "./StylesPedidos";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.58)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12
};

const cardStyle = (isMobile) => ({
  width: "min(720px, 100%)",
  background: "white",
  borderRadius: 18,
  border: "1px solid #E2E8F0",
  boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
  overflow: "hidden"
});

const headerStyle = {
  background: "linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)",
  color: "white",
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.25)",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap"
};

const sectionStyle = {
  padding: 16,
  borderTop: "1px solid #E2E8F0"
};

const btnBase = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  flex: 1,
  minWidth: 140
};

const NotificacaoPedido = ({ isOpen, pedido, onAceitar, onRecusar, calcularTempo }) => {
  const isMobile = window.innerWidth < 768;

  const itensPreview = useMemo(() => {
    const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
    const top = itens.slice(0, 4);
    const resto = Math.max(0, itens.length - top.length);
    return { top, resto, total: itens.length };
  }, [pedido]);

  if (!isOpen || !pedido) return null;

  const tempo = calcularTempo ? calcularTempo(pedido.dataCriacao) : "";
  const total = pedido.pagamento?.total ?? pedido.total ?? 0;

  const enderecoLinha = `${pedido.cliente?.rua || ""}, ${pedido.cliente?.numero || ""} - ${pedido.cliente?.bairro || ""}`;
  const cidadeLinha = `${pedido.cliente?.cidade || ""}${pedido.cliente?.estado ? " - " + pedido.cliente.estado : ""}`;

  return (
    <div
      style={overlayStyle}
      onMouseDown={(e) => {
        // Fecha clicando fora? (se quiser no futuro, habilita aqui)
        // if (e.target === e.currentTarget) ...
      }}
    >
      <div style={cardStyle(isMobile)}>
        {/* HEADER */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Bell size={18} />
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 1000, letterSpacing: 0.2 }}>Novo Pedido Recebido</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                Pedido <strong>#{pedido.numeroPedido || pedido.id?.slice(-6)?.toUpperCase()}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={badgeStyle}>
              <Clock size={14} /> {tempo || "Agora"}
            </span>
            <span style={badgeStyle}>
              <CreditCard size={14} /> {formatMoneyBR(total)}
            </span>
          </div>
        </div>

        {/* CLIENTE + ENDEREÇO */}
        <div style={sectionStyle}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr", gap: 12 }}>
            <div
              style={{
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                borderRadius: 14,
                padding: 14
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: "#64748B", marginBottom: 8 }}>CLIENTE</div>
              <div style={{ fontSize: 16, fontWeight: 1100, color: "#0F3460" }}>{pedido.cliente?.nomeCompleto || "Cliente"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, color: "#475569", fontWeight: 800, fontSize: 13 }}>
                <Phone size={14} />
                {pedido.cliente?.telefone || "Sem telefone"}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #E2E8F0",
                background: "#FFFFFF",
                borderRadius: 14,
                padding: 14
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: "#64748B", marginBottom: 8 }}>ENDEREÇO</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <MapPin size={16} color="#0F3460" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#0F3460" }}>{enderecoLinha || "-"}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{cidadeLinha || "-"}</div>
                </div>
              </div>

              {pedido.cliente?.complemento ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #FDE68A",
                    background: "#FFFBEB",
                    color: "#92400E",
                    fontWeight: 900,
                    fontSize: 12
                  }}
                >
                  Obs: {pedido.cliente.complemento}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ITENS */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1100, color: "#0F3460" }}>
              <Package size={16} /> Itens ({itensPreview.total})
            </div>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
              Total: <span style={{ color: "#0F3460" }}>{formatMoneyBR(total)}</span>
            </div>
          </div>

          {itensPreview.top.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748B" }}>Sem itens.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {itensPreview.top.map((it, idx) => {
                const qtd = Number(it.quantidade || 1);
                const nome = it.nome || "Item";
                const preco = Number(it.precoTotal || it.preco || 0);
                const totalLinha = it.precoTotal ? preco : preco * qtd;

                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid #E2E8F0",
                      background: "#F8FAFC"
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 1000, color: "#0F3460" }}>
                      {qtd}x {nome}
                      {it.adicionaisTexto ? (
                        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 800, marginTop: 4 }}>
                          + {it.adicionaisTexto}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 1100, color: "#0F3460", whiteSpace: "nowrap" }}>{formatMoneyBR(totalLinha)}</div>
                  </div>
                );
              })}

              {itensPreview.resto > 0 && (
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>+ {itensPreview.resto} item(ns)</div>
              )}
            </div>
          )}

          {pedido.observacoes ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px solid #FDE68A",
                background: "#FFFBEB",
                color: "#92400E",
                fontWeight: 1000,
                fontSize: 13
              }}
            >
              <strong>Observações:</strong> {pedido.observacoes}
            </div>
          ) : null}
        </div>

        {/* AÇÕES */}
        <div
          style={{
            padding: 16,
            borderTop: "1px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            gap: 10,
            flexWrap: "wrap"
          }}
        >
          <button
            onClick={onRecusar}
            style={{
              ...btnBase,
              background: "#FEE2E2",
              color: "#DC2626"
            }}
          >
            <XCircle size={18} />
            Recusar
          </button>

          <button
            onClick={onAceitar}
            style={{
              ...btnBase,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "white"
            }}
          >
            <CheckCircle size={18} />
            Aceitar Pedido
          </button>
        </div>

        {/* Rodapé (dica) */}
        <div style={{ padding: "10px 16px", fontSize: 11, color: "#64748B", fontWeight: 800 }}>
          Dica: ao aceitar, o pedido muda automaticamente para <strong>EM PREPARO</strong>.
        </div>
      </div>
    </div>
  );
};

export default NotificacaoPedido;
