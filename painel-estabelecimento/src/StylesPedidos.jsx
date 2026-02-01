// StylesPedidos.jsx
// Helpers + estilos reutilizáveis (sem JSX pesado)

import React from "react";
import { Clock, Package, Truck, CheckCircle, XCircle } from "lucide-react";

// ============ Utils ============
export const toNumber = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const formatMoneyBR = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(v));

export const pad2 = (n) => String(n).padStart(2, "0");

export const toISODateLocal = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const parsePedidoDate = (dataCriacao) => {
  try {
    const d = dataCriacao?.toDate
      ? dataCriacao.toDate()
      : dataCriacao
      ? new Date(dataCriacao)
      : null;

    return d instanceof Date && !isNaN(d) ? d : null;
  } catch {
    return null;
  }
};

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
export const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const diffDaysFromNow = (d) => {
  const now = new Date();
  const ms = now - d;
  return ms / (1000 * 60 * 60 * 24);
};

// ============ Helpers itens (base/adicionais/final) ============
export const getBaseUnit = (item) => toNumber(item?.precoBaseUnitario ?? item?.precoBase ?? item?.preco);

export const getAdicionalUnit = (item) => {
  const direto = toNumber(item?.adicionaisTotal);
  if (direto > 0) return direto;

  const base = getBaseUnit(item);
  const unitFinal = toNumber(item?.precoUnitarioFinal ?? item?.preco);
  const diff = unitFinal - base;
  return diff > 0 ? diff : 0;
};

export const getUnitFinal = (item) => {
  const unitFinal = toNumber(item?.precoUnitarioFinal);
  if (unitFinal > 0) return unitFinal;

  const base = getBaseUnit(item);
  const add = getAdicionalUnit(item);
  return base + add;
};

// ============ Status ============
export const getStatusStyle = (status) => {
  const config = {
    pendente: { color: "#F59E0B", bg: "#FEF3C7", icon: <Clock size={16} />, label: "AGUARDANDO" },
    preparo: { color: "#3B82F6", bg: "#DBEAFE", icon: <Package size={16} />, label: "EM PREPARO" },
    entrega: { color: "#8B5CF6", bg: "#EDE9FE", icon: <Truck size={16} />, label: "SAIU PARA ENTREGA" },
    entregue: { color: "#10B981", bg: "#D1FAE5", icon: <CheckCircle size={16} />, label: "ENTREGUE" },
    concluido: { color: "#10B981", bg: "#D1FAE5", icon: <CheckCircle size={16} />, label: "CONCLUÍDO" },
    cancelado: { color: "#EF4444", bg: "#FEE2E2", icon: <XCircle size={16} />, label: "CANCELADO" }
  };
  return config[status] || config.pendente;
};

// ============ Styles helpers ============
export const pillStyle = (statusObj) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  color: statusObj.color,
  background: statusObj.bg,
  width: "fit-content"
});

export const iconBtnStyle = (border, color) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  border: `1px solid ${border}`,
  background: "white",
  color,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center"
});

// ============ Troco (Dinheiro) ============
// Compatível com:
// - pagamento.troco: "100" (seu Firestore atual)
// - (opcional futuro) pagamento.trocoPara / pagamento.trocoEstimado
export const getTrocoInfo = (pedido) => {
  const pag = pedido?.pagamento || {};
  const metodo = String(pag?.metodo || "").toLowerCase();

  if (metodo !== "dinheiro") return null;

  const trocoPara =
    pag?.trocoPara != null && toNumber(pag.trocoPara) > 0
      ? toNumber(pag.trocoPara)
      : (pag?.troco ? toNumber(pag.troco) : 0);

  if (!trocoPara || trocoPara <= 0) return null;

  const total = toNumber(pag?.total ?? 0);
  const trocoEstimado =
    pag?.trocoEstimado != null ? toNumber(pag.trocoEstimado) : (trocoPara - total);

  return { trocoPara, trocoEstimado };
};
