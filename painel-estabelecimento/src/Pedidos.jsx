// Pedidos.jsx
// UI usa ComponentsPedidos + lógica via HookPedidos

import React, { useMemo } from "react";
import { Layout } from "./Menu";
import NotificacaoPedido from "./NotificacaoPedido";

import { Clock, Package, Truck, CheckCircle } from "lucide-react";

import { usePedidos } from "./HookPedidos";
import {
  HeaderPedidos,
  StatsGrid,
  FaturamentoGrid,
  ControlsBar,
  TabsBar,
  EmptyState,
  HistoricoCompacto,
  PedidoCard,
  Modal,
  PedidoDetalhes,
  FooterPedidos
} from "./ComponentsPedidos";

const Pedidos = ({ user }) => {
  const p = usePedidos({ user });

  // Tabs (sem "TODOS")
  const tabs = useMemo(() => {
    return [
      { id: "pendente", label: "PENDENTES", count: p.stats.pendentes, icon: <Clock size={16} /> },
      { id: "preparo", label: "EM PREPARO", count: p.stats.preparo, icon: <Package size={16} /> },
      { id: "entrega", label: "ENTREGA", count: p.stats.entrega, icon: <Truck size={16} /> },
      { id: "historico", label: "HISTÓRICO", count: p.stats.historico, icon: <CheckCircle size={16} /> }
    ];
  }, [p.stats]);

  return (
    <Layout isMobile={p.isMobile}>
      <div
        style={{
          padding: p.isMobile ? "10px" : "20px",
          backgroundColor: "#F8FAFC",
          minHeight: "100vh",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        {/* Cabeçalho */}
        <HeaderPedidos
          isMobile={p.isMobile}
          notificacoes={p.notificacoes}
          busca={p.busca}
          dataInicio={p.dataInicio}
          dataFim={p.dataFim}
        />

        {/* Stats + Faturamento */}
        <div
          style={{
            background: "linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)",
            borderRadius: "16px",
            padding: "18px",
            marginTop: "-8px",
            marginBottom: "16px",
            color: "white",
            boxShadow: "0 10px 25px rgba(15, 52, 96, 0.2)"
          }}
        >
          <StatsGrid isMobile={p.isMobile} stats={p.stats} />
          <FaturamentoGrid isMobile={p.isMobile} faturamento={p.faturamento} />
        </div>

        {/* Barra de controles */}
        <ControlsBar
          busca={p.busca}
          setBusca={p.setBusca}
          mostrarFiltros={p.mostrarFiltros}
          setMostrarFiltros={p.setMostrarFiltros}
          dataInicio={p.dataInicio}
          setDataInicio={p.setDataInicio}
          dataFim={p.dataFim}
          setDataFim={p.setDataFim}
          limparFiltros={p.limparFiltros}
          toISODateLocal={p.toISODateLocal}
          configNotificacao={p.configNotificacao}
          handleConfigNotificacao={p.handleConfigNotificacao}
          filtrosInvalidos={p.filtrosInvalidos}
        />

        {/* Tabs */}
        <TabsBar tabs={tabs} tabAtiva={p.tabAtiva} setTabAtiva={p.setTabAtiva} />

        {/* Conteúdo */}
        {p.pedidosFiltrados.length === 0 ? (
          <EmptyState tabAtiva={p.tabAtiva} limparFiltros={p.limparFiltros} />
        ) : (
          <>
            {p.tabAtiva === "historico" ? (
              <HistoricoCompacto
                isMobile={p.isMobile}
                historicoAceitas={p.historicoAceitas}
                historicoCanceladas={p.historicoCanceladas}
                formatHora={p.formatHora}
                abrirDetalhes={p.abrirDetalhes}
                enviarMensagemWhatsApp={p.enviarMensagemWhatsApp}
                dataInicio={p.dataInicio}
                setDataInicio={p.setDataInicio}
                dataFim={p.dataFim}
                setDataFim={p.setDataFim}
                toISODateLocal={p.toISODateLocal}
              />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: p.isMobile ? "1fr" : "repeat(auto-fill, minmax(420px, 1fr))",
                  gap: "20px"
                }}
              >
                {p.pedidosFiltrados.map((pedido) => (
                  <PedidoCard
                    key={pedido.id}
                    isMobile={p.isMobile}
                    pedido={pedido}
                    formatHora={p.formatHora}
                    abrirDetalhes={p.abrirDetalhes}
                    enviarMensagemWhatsApp={p.enviarMensagemWhatsApp}
                    handleStatusChange={p.handleStatusChange}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal Novo Pedido */}
        <NotificacaoPedido
          isOpen={p.mostrarModalNovoPedido}
          pedido={p.pedidoParaAceitar}
          onAceitar={() => p.handleStatusChange(p.pedidoParaAceitar?.id, "preparo")}
          onRecusar={() => p.handleStatusChange(p.pedidoParaAceitar?.id, "cancelado")}
          calcularTempo={p.calcularTempoDecorrido}
        />

        {/* Modal Detalhes */}
        <Modal
          open={p.modalDetalhesOpen}
          title={p.pedidoDetalhe ? `Pedido #${p.pedidoDetalhe.numeroPedido}` : "Detalhes do pedido"}
          onClose={p.fecharDetalhes}
          isMobile={p.isMobile}
        >
          <PedidoDetalhes
            isMobile={p.isMobile}
            pedido={p.pedidoDetalhe}
            formatHora={p.formatHora}
            enviarMensagemWhatsApp={p.enviarMensagemWhatsApp}
          />
        </Modal>

        {/* Rodapé */}
        <FooterPedidos pedidos={p.pedidos} stats={p.stats} />
      </div>
    </Layout>
  );
};

export default Pedidos;
