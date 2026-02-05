// ComponentsPedidos.jsx

import React, { useMemo, useState } from "react";
import {
  Package,
  Bell,
  Search,
  Filter,
  Printer,
  RotateCcw,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Calendar,
  CreditCard,
  Star,
  Eye,
  MapPin,
  Phone,
  MessageCircle,
  Shield,
  ListOrdered
} from "lucide-react";

import {
  formatMoneyBR,
  getStatusStyle,
  iconBtnStyle,
  parsePedidoDate,
  pillStyle,
  toNumber,
  getBaseUnit,
  getAdicionalUnit,
  getUnitFinal,
  getTrocoInfo,
  toISODateLocal
} from "./StylesPedidos";

export const Modal = ({ open, title, onClose, children, isMobile }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 10 : 18
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          maxHeight: "88vh",
          overflow: "auto",
          background: "white",
          borderRadius: 16,
          border: "1px solid #E2E8F0",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)"
        }}
      >
        <div
          style={{
            padding: isMobile ? 14 : 18,
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 1
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 900, color: "#0F3460", display: "flex", alignItems: "center", gap: 10 }}>
            <Eye size={18} />
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              color: "#0F3460",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 800
            }}
          >
            Fechar
          </button>
        </div>

        <div style={{ padding: isMobile ? 14 : 18 }}>{children}</div>
      </div>
    </div>
  );
};

export const HeaderPedidos = ({ isMobile, notificacoes, busca, dataInicio, dataFim }) => {
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "18px",
        color: "white",
        boxShadow: "0 10px 25px rgba(15, 52, 96, 0.2)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "900", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
            <Package size={32} /> Gestão de Pedidos
          </h1>
          <p style={{ opacity: 0.9, fontSize: "14px", margin: 0 }}>Gerencie e acompanhe todos os pedidos do seu estabelecimento</p>

          {(dataInicio || dataFim || busca) && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.95 }}>
              <strong>Filtros ativos:</strong>{" "}
              {busca ? `Busca "${busca}"` : "—"}
              {" • "}
              {dataInicio ? `De ${dataInicio}` : "Sem início"}
              {" • "}
              {dataFim ? `Até ${dataFim}` : "Sem fim"}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => {}}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "50%",
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
              position: "relative"
            }}
            title="Notificações"
          >
            <Bell size={22} />
            {naoLidas > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  background: "#EF4444",
                  color: "white",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold"
                }}
              >
                {naoLidas}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StatsGrid = ({ isMobile, stats }) => {
  const cards = [
    { label: "TOTAL FILTRADO", value: stats.totalBase, color: "#38BDF8", icon: <ListOrdered size={20} /> },
    { label: "PENDENTES", value: stats.pendentes, color: "#F59E0B", icon: <Clock size={20} /> },
    { label: "EM PREPARO", value: stats.preparo, color: "#3B82F6", icon: <Package size={20} /> },
    { label: "ENTREGA", value: stats.entrega, color: "#8B5CF6", icon: <Truck size={20} /> },
    { label: "ACEITAS", value: stats.aceitas, color: "#10B981", icon: <CheckCircle size={20} /> },
    { label: "CANCELADAS", value: stats.canceladas, color: "#EF4444", icon: <XCircle size={20} /> }
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)",
        gap: "12px",
        marginBottom: "14px"
      }}
    >
      {cards.map((stat, index) => (
        <div
          key={index}
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "12px",
            padding: "14px",
            textAlign: "center",
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px", color: stat.color }}>
            {stat.icon}
            <div style={{ fontSize: "24px", fontWeight: "900" }}>{stat.value}</div>
          </div>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748B", textTransform: "uppercase" }}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export const FaturamentoGrid = ({ isMobile, faturamento }) => {
  const cards = [
    {
      label: faturamento.hasPeriodo ? "FATURAMENTO NO PERÍODO" : "FATURAMENTO (FILTRADO)",
      value: formatMoneyBR(faturamento.totalPeriodo),
      icon: <CreditCard size={18} />,
      accent: "#22C55E"
    },
    { label: "HOJE", value: formatMoneyBR(faturamento.totalHoje), icon: <Star size={18} />, accent: "#10B981" },
    { label: "ÚLTIMOS 7 DIAS", value: formatMoneyBR(faturamento.total7), icon: <Calendar size={18} />, accent: "#38BDF8" },
    { label: "ÚLTIMOS 15 DIAS", value: formatMoneyBR(faturamento.total15), icon: <Calendar size={18} />, accent: "#A78BFA" },
    { label: "ÚLTIMOS 30 DIAS", value: formatMoneyBR(faturamento.total30), icon: <Calendar size={18} />, accent: "#F59E0B" }
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)",
        gap: 12
      }}
    >
      {cards.map((kpi, idx) => (
        <div
          key={idx}
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: 12,
            padding: 14,
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: kpi.accent }}>
            {kpi.icon}
            <div style={{ fontSize: 11, fontWeight: 900, color: "#64748B", textTransform: "uppercase" }}>{kpi.label}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 1000, color: "#0F3460" }}>{kpi.value}</div>
        </div>
      ))}
    </div>
  );
};

export const ControlsBar = ({
  busca,
  setBusca,
  mostrarFiltros,
  setMostrarFiltros,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  limparFiltros,
  toISODateLocal,
  configNotificacao,
  handleConfigNotificacao,
  filtrosInvalidos
}) => {
  return (
    <div
      style={{
        background: "white",
        padding: "16px",
        borderRadius: "12px",
        marginBottom: "16px",
        border: "1px solid #E2E8F0",
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center"
      }}
    >
      <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
        <Search style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} size={18} />
        <input
          style={{
            width: "100%",
            padding: "12px 12px 12px 40px",
            borderRadius: "10px",
            border: "1px solid #E2E8F0",
            fontSize: "14px",
            outline: "none"
          }}
          placeholder="Buscar cliente, número do pedido, telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
            color: "#475569",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Filter size={16} /> Filtros
        </button>

        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
            color: "#475569",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Printer size={16} /> Imprimir
        </button>

        <button
          onClick={limparFiltros}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
            color: "#475569",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <RotateCcw size={16} /> Limpar
        </button>
      </div>

      {mostrarFiltros && (
        <div
          style={{
            width: "100%",
            padding: "16px",
            background: "#F8FAFC",
            borderRadius: "8px",
            border: "1px solid #E2E8F0",
            marginTop: "12px"
          }}
        >
          <div style={{ display: "flex", gap: "14px", alignItems: "end", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#64748B", marginBottom: "6px" }}>Data inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "14px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#64748B", marginBottom: "6px" }}>Data final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "14px" }}
              />
            </div>

            <button
              onClick={() => {
                const hoje = new Date();
                setDataInicio(toISODateLocal(hoje));
                setDataFim(toISODateLocal(hoje));
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                color: "#0F3460"
              }}
              title="Hoje"
            >
              Hoje
            </button>

            <button
              onClick={() => {
                const hoje = new Date();
                const ini = new Date();
                ini.setDate(hoje.getDate() - 6);
                setDataInicio(toISODateLocal(ini));
                setDataFim(toISODateLocal(hoje));
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                color: "#0F3460"
              }}
              title="Últimos 7 dias"
            >
              7d
            </button>

            <button
              onClick={() => {
                const hoje = new Date();
                const ini = new Date();
                ini.setDate(hoje.getDate() - 14);
                setDataInicio(toISODateLocal(ini));
                setDataFim(toISODateLocal(hoje));
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                color: "#0F3460"
              }}
              title="Últimos 15 dias"
            >
              15d
            </button>

            <button
              onClick={() => {
                const hoje = new Date();
                const ini = new Date();
                ini.setDate(hoje.getDate() - 29);
                setDataInicio(toISODateLocal(ini));
                setDataFim(toISODateLocal(hoje));
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                color: "#0F3460"
              }}
              title="Últimos 30 dias"
            >
              30d
            </button>

            <div style={{ marginLeft: "auto" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#64748B", marginBottom: "6px" }}>Notificações</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#0F3460" }}>
                  <input type="checkbox" checked={configNotificacao.som} onChange={() => handleConfigNotificacao("som")} />
                  Som
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#0F3460" }}>
                  <input type="checkbox" checked={configNotificacao.popup} onChange={() => handleConfigNotificacao("popup")} />
                  Popup
                </label>
              </div>
            </div>
          </div>

          {filtrosInvalidos && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#FEF3C7", border: "1px solid #F59E0B", color: "#92400E", fontWeight: 800 }}>
              Atenção: a data inicial está maior que a data final.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TabsBar = ({ tabs, tabAtiva, setTabAtiva }) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        marginBottom: "18px",
        padding: "4px",
        background: "#F1F5F9",
        borderRadius: "12px",
        overflowX: "auto"
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setTabAtiva(tab.id)}
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: "none",
            fontWeight: "900",
            cursor: "pointer",
            background: tabAtiva === tab.id ? "#0F3460" : "transparent",
            color: tabAtiva === tab.id ? "white" : "#64748B",
            whiteSpace: "nowrap",
            fontSize: "13px",
            letterSpacing: "0.3px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          {tab.icon}
          {tab.label}
          <span
            style={{
              background: tabAtiva === tab.id ? "rgba(255,255,255,0.2)" : "#CBD5E1",
              color: tabAtiva === tab.id ? "white" : "#475569",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "10px",
              fontWeight: "bold"
            }}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
};

export const EmptyState = ({ tabAtiva, limparFiltros }) => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 20px",
        background: "white",
        borderRadius: "16px",
        border: "2px dashed #E2E8F0"
      }}
    >
      <Package size={48} color="#CBD5E0" style={{ marginBottom: "16px" }} />
      <h3 style={{ color: "#0F3460", marginBottom: "8px" }}>Nenhum pedido encontrado</h3>
      <p style={{ color: "#64748B", marginBottom: "24px" }}>
        {tabAtiva === "pendente"
          ? "Não há pedidos pendentes no momento."
          : tabAtiva === "historico"
          ? "Não há histórico para os filtros selecionados."
          : "Não há pedidos nesta categoria."}
      </p>
      <button
        onClick={limparFiltros}
        style={{
          padding: "12px 24px",
          background: "#0F3460",
          color: "white",
          border: "none",
          borderRadius: "10px",
          fontWeight: "900",
          cursor: "pointer"
        }}
      >
        Limpar filtros
      </button>
    </div>
  );
};

/**
 * ✅ HISTÓRICO EM LINHA/TABELA
 * - Botões: Aceitas / Canceladas
 * - Inputs: Data inicial / Data final fixos no topo do histórico
 */
export const HistoricoCompacto = ({
  isMobile,
  historicoAceitas,
  historicoCanceladas,
  formatHora,
  abrirDetalhes,
  enviarMensagemWhatsApp,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  toISODateLocal
}) => {
  const [tipo, setTipo] = useState("aceitas"); // "aceitas" | "canceladas"

  const lista = tipo === "aceitas" ? historicoAceitas : historicoCanceladas;
  const valorTotal = useMemo(
    () => lista.reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0),
    [lista]
  );

  const headerBg =
    tipo === "aceitas"
      ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
      : "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)";

  return (
    <div style={{ background: "white", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
      {/* Topo do histórico (fixo) */}
      <div
        style={{
          padding: 14,
          background: headerBg,
          color: "white",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 1000 }}>
          {tipo === "aceitas" ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>Histórico</span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setTipo("aceitas")}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.35)",
              background: tipo === "aceitas" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)",
              color: "white",
              cursor: "pointer",
              fontWeight: 1000,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
            title="Aceitas (Entregue/Concluído)"
          >
            <CheckCircle size={16} /> Aceitas ({historicoAceitas.length})
          </button>

          <button
            onClick={() => setTipo("canceladas")}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.35)",
              background: tipo === "canceladas" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)",
              color: "white",
              cursor: "pointer",
              fontWeight: 1000,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
            title="Canceladas"
          >
            <XCircle size={16} /> Canceladas ({historicoCanceladas.length})
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.9 }}>Data inicial</div>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.14)",
                color: "white",
                outline: "none"
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.9 }}>Data final</div>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.14)",
                color: "white",
                outline: "none"
              }}
            />
          </div>

          <button
            onClick={() => {
              const hoje = new Date();
              setDataInicio(toISODateLocal(hoje));
              setDataFim(toISODateLocal(hoje));
            }}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.16)",
              color: "white",
              cursor: "pointer",
              fontWeight: 1000
            }}
            title="Filtrar Hoje"
          >
            Hoje
          </button>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 900 }}>TOTAL</div>
            <div style={{ fontSize: 16, fontWeight: 1100 }}>{formatMoneyBR(valorTotal)}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{lista.length} pedidos</div>
          </div>
        </div>
      </div>

      {/* “Tabela” */}
      {lista.length === 0 ? (
        <div style={{ padding: 14, color: "#64748B", fontSize: 13 }}>
          Nenhum pedido neste filtro.
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          {lista.map((p) => {
            const st = getStatusStyle(p.status);
            const d = parsePedidoDate(p.dataCriacao);
            const enderecoLinha = `${p.cliente?.rua || ""}, ${p.cliente?.numero || ""} - ${p.cliente?.bairro || ""}`;

            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1.4fr 0.7fr 0.9fr auto",
                  gap: 10,
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  marginBottom: 10,
                  background: "#FFFFFF"
                }}
              >
                <div>
                  <div style={{ fontWeight: 1100, color: "#0F3460", fontSize: 13 }}>#{p.numeroPedido}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={12} />
                    {d ? formatHora(p.dataCriacao) : "—"}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 900, color: "#0F3460", fontSize: 13 }}>{p.cliente?.nomeCompleto || "Cliente"}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={12} />
                    {enderecoLinha || "-"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#64748B" }}>TOTAL</div>
                  <div style={{ fontWeight: 1100, color: "#0F3460" }}>{formatMoneyBR(p.pagamento?.total)}</div>
                </div>

                <div>
                  <div style={pillStyle(st)}>
                    {st.icon} {st.label}
                  </div>
                </div>

                {/* Botões com ícones (bonitos) */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                  <button onClick={() => abrirDetalhes(p)} style={iconBtnStyle("#E2E8F0", "#0F3460")} title="Detalhes">
                    <Eye size={18} />
                  </button>
                  <button onClick={() => enviarMensagemWhatsApp(p)} style={iconBtnStyle("#25D366", "#25D366")} title="WhatsApp">
                    <MessageCircle size={18} />
                  </button>
                  <button onClick={() => window.print()} style={iconBtnStyle("#E2E8F0", "#475569")} title="Imprimir">
                    <Printer size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const PedidoCard = ({ isMobile, pedido, formatHora, abrirDetalhes, enviarMensagemWhatsApp, handleStatusChange }) => {
  const status = getStatusStyle(pedido.status);
  const trocoInfo = getTrocoInfo(pedido);

  const itensPreview = useMemo(() => {
    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    const top = itens.slice(0, 4);
    const resto = Math.max(0, itens.length - top.length);
    return { top, resto, totalItens: itens.length };
  }, [pedido.itens]);

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        border: "1px solid #E2E8F0",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.06)"
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid #F1F5F9"
        }}
      >
        <div>
          <div style={{ fontSize: "24px", fontWeight: "1100", color: "#0F3460", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            #{pedido.numeroPedido}
            <div
              style={{
                fontSize: "11px",
                fontWeight: "900",
                padding: "6px 12px",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                letterSpacing: "0.4px",
                color: status.color,
                background: status.bg
              }}
            >
              {status.icon} {status.label}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px", fontSize: "13px", color: "#64748B", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={14} /> {pedido.tempoDecorrido}
            </span>
            {pedido.ehHoje && (
              <span style={{ background: "#10B981", color: "white", fontSize: "10px", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                HOJE
              </span>
            )}
            <span style={{ fontSize: 12, color: "#94A3B8" }}>{formatHora(pedido.dataCriacao)}</span>
          </div>
        </div>

        {/* Botões com ícones (detalhes + whatsapp) */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => abrirDetalhes(pedido)} style={iconBtnStyle("#E2E8F0", "#0F3460")} title="Detalhes">
            <Eye size={18} />
          </button>

          <button onClick={() => enviarMensagemWhatsApp(pedido)} style={iconBtnStyle("#25D366", "#25D366")} title="WhatsApp">
            <MessageCircle size={18} />
          </button>
        </div>
      </div>

      {/* Cliente */}
      <div
        style={{
          background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
          padding: "16px",
          borderRadius: "12px",
          marginBottom: "16px",
          border: "1px solid #E2E8F0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: 16
            }}
          >
            {pedido.cliente?.nomeCompleto?.[0]?.toUpperCase() || "C"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "16px", fontWeight: "900", color: "#0F3460" }}>{pedido.cliente?.nomeCompleto || "Cliente não identificado"}</div>
            <div style={{ fontSize: 13, color: "#64748B", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Phone size={12} /> {pedido.cliente?.telefone || "Sem telefone"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94A3B8", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={12} /> ENDEREÇO
          </div>

          <div style={{ fontSize: 14, color: "#475569" }}>
            {pedido.cliente?.rua}, {pedido.cliente?.numero} - {pedido.cliente?.bairro}
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={12} /> {pedido.cliente?.cidade}
            </div>

            {pedido.cliente?.complemento && (
              <div style={{ fontSize: 13, color: "#D97706", background: "#FFFBEB", padding: 8, borderRadius: 8, marginTop: 8 }}>
                <strong>Observação:</strong> {pedido.cliente.complemento}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Itens do pedido (preview) */}
      <div
        style={{
          background: "white",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: 14,
          marginBottom: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000, color: "#0F3460" }}>
            <Package size={16} /> Itens ({itensPreview.totalItens})
          </div>
          <button
            onClick={() => abrirDetalhes(pedido)}
            style={{
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              color: "#0F3460",
              padding: "8px 10px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12
            }}
            title="Abrir detalhes completos"
          >
            <Eye size={14} /> Ver completo
          </button>
        </div>

        {itensPreview.top.length === 0 ? (
          <div style={{ color: "#64748B", fontSize: 13 }}>Sem itens.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {itensPreview.top.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC"
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0F3460" }}>
                  {(toNumber(it.quantidade) || 1)}x {it.nome}
                  {it.adicionaisTexto ? (
                    <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, marginTop: 4 }}>
                      + {it.adicionaisTexto}
                    </div>
                  ) : null}
                </div>
                <div style={{ fontSize: 13, fontWeight: 1000, color: "#0F3460", whiteSpace: "nowrap" }}>
                  {formatMoneyBR(toNumber(it.precoTotal) || (toNumber(it.preco) * (toNumber(it.quantidade) || 1)))}
                </div>
              </div>
            ))}

            {itensPreview.resto > 0 && (
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>
                + {itensPreview.resto} item(ns)
              </div>
            )}
          </div>
        )}

        {/* Observações */}
        {pedido.observacoes ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#92400E", fontWeight: 900, fontSize: 13 }}>
            <strong>Observações:</strong> {pedido.observacoes}
          </div>
        ) : null}
      </div>

      {/* Resumo */}
      <div
        style={{
          background: "linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)",
          border: "1px solid #A7F3D0",
          padding: "16px",
          borderRadius: "12px",
          marginTop: "auto"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#065F46" }}>RESUMO</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CreditCard size={14} color="#065F46" />
            <span style={{ fontSize: 12, fontWeight: 900, color: "#065F46" }}>{String(pedido.pagamento?.metodo || "").toUpperCase()}</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B", marginBottom: 6 }}>
          <span>Subtotal</span>
          <span>{formatMoneyBR(pedido.pagamento?.subtotal)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B", marginBottom: 6 }}>
          <span>Taxa de Entrega</span>
          <span>{formatMoneyBR(pedido.pagamento?.taxaEntrega)}</span>
        </div>

        {trocoInfo && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#065F46", marginBottom: 6, fontWeight: 900 }}>
              <span>Troco para</span>
              <span>{formatMoneyBR(trocoInfo.trocoPara)}</span>
            </div>
            <div style={{ fontSize: 12, color: "#065F46", fontWeight: 800, marginBottom: 2 }}>
              Troco estimado: {formatMoneyBR(trocoInfo.trocoEstimado)}
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 1100, color: "#065F46", marginTop: 8, paddingTop: 8, borderTop: "2px solid #A7F3D0" }}>
          <span>TOTAL</span>
          <span>{formatMoneyBR(pedido.pagamento?.total)}</span>
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
        {pedido.status === "pendente" && (
          <>
            <button
              onClick={() => handleStatusChange(pedido.id, "cancelado")}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                fontWeight: "900",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "14px",
                background: "#FEE2E2",
                color: "#DC2626",
                flex: 1,
                minWidth: "120px"
              }}
            >
              <XCircle size={16} /> Recusar
            </button>

            <button
              onClick={() => handleStatusChange(pedido.id, "preparo")}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                fontWeight: "900",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "14px",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "white",
                flex: 2,
                minWidth: "180px"
              }}
            >
              <CheckCircle size={16} /> Aceitar Pedido
            </button>
          </>
        )}

        {pedido.status === "preparo" && (
          <button
            onClick={() => handleStatusChange(pedido.id, "entrega")}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              fontWeight: "900",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
              background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
              color: "white",
              width: "100%"
            }}
          >
            <Truck size={16} /> Saiu para Entrega
          </button>
        )}

        {pedido.status === "entrega" && (
          <button
            onClick={() => handleStatusChange(pedido.id, "entregue")}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              fontWeight: "900",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
              background: "linear-gradient(135deg, #10B981 0%, #047857 100%)",
              color: "white",
              width: "100%"
            }}
          >
            <CheckCircle size={16} /> Marcar como Entregue
          </button>
        )}
      </div>
    </div>
  );
};

export const PedidoDetalhes = ({ isMobile, pedido, formatHora, enviarMensagemWhatsApp }) => {
  if (!pedido) return <div style={{ color: "#64748B" }}>Nenhum pedido selecionado.</div>;

  const st = getStatusStyle(pedido.status);
  const trocoInfo = getTrocoInfo(pedido);

  return (
    <>
      {/* Top info */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#64748B" }}>CLIENTE</div>
          <div style={{ fontSize: 15, fontWeight: 1100, color: "#0F3460", marginTop: 4 }}>{pedido.cliente?.nomeCompleto || "Cliente"}</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <Phone size={14} /> {pedido.cliente?.telefone || "-"}
          </div>
        </div>

        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#64748B" }}>STATUS / DATA</div>
          <div style={{ marginTop: 6 }}>
            <span style={pillStyle(st)}>
              {st.icon} {st.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 8 }}>
            <Clock size={14} style={{ marginRight: 6 }} />
            {formatHora(pedido.dataCriacao)}
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div style={{ padding: 14, borderRadius: 12, border: "1px solid #E2E8F0", background: "white", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748B", display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin size={16} /> ENDEREÇO
        </div>
        <div style={{ fontSize: 14, color: "#0F3460", fontWeight: 900, marginTop: 8 }}>
          {pedido.cliente?.rua}, {pedido.cliente?.numero} - {pedido.cliente?.bairro}
        </div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
          {pedido.cliente?.cidade} - {pedido.cliente?.estado} • CEP {pedido.cliente?.cep || "-"}
        </div>
        {pedido.cliente?.complemento && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontWeight: 800 }}>
            Observação: {pedido.cliente.complemento}
          </div>
        )}
      </div>

      {/* Itens */}
      <div style={{ padding: 14, borderRadius: 12, border: "1px solid #E2E8F0", background: "white" }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748B", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Package size={16} /> ITENS
        </div>

        {(pedido.itens || []).length === 0 ? (
          <div style={{ color: "#64748B", fontSize: 13 }}>Sem itens.</div>
        ) : (
          (pedido.itens || []).map((item, i) => {
            const base = getBaseUnit(item);
            const add = getAdicionalUnit(item);
            const unitFinal = getUnitFinal(item);
            const qtd = toNumber(item?.quantidade) || 1;
            const totalItem = toNumber(item?.precoTotal) || unitFinal * qtd;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  marginBottom: 10,
                  background: "#F8FAFC"
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 1100, color: "#0F3460", fontSize: 14 }}>
                    {qtd}x {item.nome}
                  </div>
                  <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>{formatMoneyBR(base)} lanche</div>
                  {add > 0 && <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>{formatMoneyBR(add)} adicional</div>}
                  {item.adicionaisTexto && <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, fontStyle: "italic" }}>+ {item.adicionaisTexto}</div>}
                  <div style={{ fontSize: 12, color: "#10B981", marginTop: 6, fontWeight: 900 }}>Unit final: {formatMoneyBR(unitFinal)}</div>
                </div>

                <div style={{ fontWeight: 1100, color: "#0F3460", whiteSpace: "nowrap" }}>{formatMoneyBR(totalItem)}</div>
              </div>
            );
          })
        )}

        {pedido.observacoes ? (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#92400E", fontWeight: 900 }}>
            <strong>Observações:</strong> {pedido.observacoes}
          </div>
        ) : null}

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E2E8F0", display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontWeight: 800 }}>
            <span>Subtotal</span>
            <span>{formatMoneyBR(pedido.pagamento?.subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontWeight: 800 }}>
            <span>Taxa de entrega</span>
            <span>{formatMoneyBR(pedido.pagamento?.taxaEntrega)}</span>
          </div>

          {trocoInfo && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#065F46", fontWeight: 1100 }}>
                <span>Troco para</span>
                <span>{formatMoneyBR(trocoInfo.trocoPara)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#065F46", fontWeight: 900, fontSize: 12 }}>
                <span>Troco estimado</span>
                <span>{formatMoneyBR(trocoInfo.trocoEstimado)}</span>
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", color: "#065F46", fontWeight: 1100, fontSize: 16 }}>
            <span>TOTAL</span>
            <span>{formatMoneyBR(pedido.pagamento?.total)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            onClick={() => enviarMensagemWhatsApp(pedido)}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #25D366",
              background: "white",
              color: "#25D366",
              cursor: "pointer",
              fontWeight: 1100,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>

          <button
            onClick={() => window.print()}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              color: "#0F3460",
              cursor: "pointer",
              fontWeight: 1100,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>
    </>
  );
};

export const FooterPedidos = ({ pedidos, stats }) => {
  return (
    <div
      style={{
        marginTop: "30px",
        padding: "16px",
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        fontSize: "12px",
        color: "#64748B",
        textAlign: "center"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
        <Shield size={14} />
        <strong>Sistema de Gestão ENTREGAQUI</strong>
      </div>
      <p style={{ margin: 0 }}>
        Total bruto no Firestore: {pedidos.length} • Total após filtros: {stats.totalBase} • Última atualização:{" "}
        {new Date().toLocaleTimeString("pt-BR")}
      </p>
    </div>
  );
};
