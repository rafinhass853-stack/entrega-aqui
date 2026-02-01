// ComissaoPlataforma.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "./Menu";
import { auth, db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Wallet,
} from "lucide-react";

const COMISSAO_PERCENTUAL = 0.1;

// ✅ Dados fixos do PIX (como você pediu)
const PIX_INFO = {
  chave: "16988318626",
  banco: "Caixa Econômica Federal",
  titular: "Rafael de Sousa Araujo",
  descricao:
    "Pagamento semanal da Comissão da Plataforma (10% do faturamento do período).",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatBRL(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toDateInputValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ✅ Semana: DOM 00:00 → SAB 23:59:59.999 (local)
function getWeekRangeForDate(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=Dom, 6=Sáb

  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day); // volta pro domingo

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // sábado
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getPreviousWeekRange() {
  const now = new Date();
  const { start } = getWeekRangeForDate(now); // domingo da semana atual
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevEnd.getDate() + 6);
  prevEnd.setHours(23, 59, 59, 999);
  return { start: prevStart, end: prevEnd };
}

function makePeriodId(start, end) {
  // Ex: 2026-02-02_2026-02-08
  return `${toDateInputValue(start)}_${toDateInputValue(end)}`;
}

function isPaid(fatura) {
  return String(fatura?.statusPagamento || "").toLowerCase() === "paga";
}

function normalizeStatus(s) {
  return String(s || "").toLowerCase().trim();
}

function isStatusValido(status) {
  const st = normalizeStatus(status);
  return (
    st === "entregue" ||
    st === "concluido" ||
    st === "concluído" ||
    st === "entregue/concluido" ||
    st === "entregue/concluído"
  );
}

// ✅ pega total do pedido com prioridade no seu modelo: pagamento.total
function getPedidoTotal(p) {
  // seu print mostra: pagamento.total
  const v =
    p?.pagamento?.total ??
    p?.total ??
    p?.pagamentoTotal ??
    0;
  return Number(v || 0);
}

const ComissaoPlataforma = ({ user, isMobile }) => {
  const currentUser = user || auth.currentUser || null;
  const estabelecimentoId = currentUser?.uid || null;

  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });

  const [pedidos, setPedidos] = useState([]);

  const [faturas, setFaturas] = useState([]);
  const [gerando, setGerando] = useState(false);
  const [marcando, setMarcando] = useState(false);

  const showMensagem = (tipo, texto, tempo = 5000) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ tipo: "", texto: "" }), tempo);
  };

  // -----------------------------
  // ✅ 1) Ler pedidos do Firestore
  // -----------------------------
  useEffect(() => {
    if (!estabelecimentoId) return;

    setLoading(true);

    const pedidosRef = collection(db, "Pedidos");

    // ⚠️ Como seus pedidos às vezes salvam id em "estabelecimentoId" e às vezes em "restauranteId",
    // fazemos 2 listeners e juntamos sem duplicar.
    const q1 = query(pedidosRef); // vamos filtrar no client (mais robusto pro seu banco atual)

    const unsub = onSnapshot(
      q1,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // filtra só o que é do estabelecimento logado
        const filtrados = all.filter((p) => {
          const estId = p?.estabelecimentoId || p?.restauranteId || p?.entrega?.estabelecimentoId;
          if (!estId) return false;
          if (String(estId) !== String(estabelecimentoId)) return false;
          if (!isStatusValido(p?.status)) return false;
          return true;
        });

        setPedidos(filtrados);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao ler pedidos:", err);
        setPedidos([]);
        setLoading(false);
        showMensagem("error", "Erro ao carregar pedidos.");
      }
    );

    return () => unsub();
  }, [estabelecimentoId]);

  // ------------------------------------
  // ✅ 2) Ler faturas geradas (subcoleção)
  // ------------------------------------
  useEffect(() => {
    if (!estabelecimentoId) return;

    const faturasRef = collection(db, "estabelecimentos", estabelecimentoId, "faturasComissao");

    const unsub = onSnapshot(
      faturasRef,
      (snap) => {
        const lista = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aS = a?.periodoInicio?.seconds || 0;
            const bS = b?.periodoInicio?.seconds || 0;
            return bS - aS;
          });

        setFaturas(lista);
      },
      (err) => {
        console.error("Erro ao ler faturas:", err);
        setFaturas([]);
      }
    );

    return () => unsub();
  }, [estabelecimentoId]);

  // -----------------------------
  // ✅ Semana atual (preview)
  // -----------------------------
  const semanaAtual = useMemo(() => getWeekRangeForDate(new Date()), []);
  const resumoSemanaAtual = useMemo(() => {
    const inicio = semanaAtual.start;
    const fim = semanaAtual.end;

    const doPeriodo = pedidos.filter((p) => {
      const dt = p?.dataCriacao?.toDate ? p.dataCriacao.toDate() : null;
      if (!dt) return false;
      return dt >= inicio && dt <= fim;
    });

    const faturamento = doPeriodo.reduce((acc, p) => acc + getPedidoTotal(p), 0);
    const comissao = faturamento * COMISSAO_PERCENTUAL;

    return { inicio, fim, faturamento, comissao, qtde: doPeriodo.length };
  }, [pedidos, semanaAtual]);

  // -----------------------------
  // ✅ Gerar fatura da semana anterior
  // -----------------------------
  const gerarFaturaSemanaAnterior = async () => {
    if (!estabelecimentoId) return;

    setGerando(true);
    try {
      const { start, end } = getPreviousWeekRange();
      const periodId = makePeriodId(start, end);

      // já existe?
      const faturaRef = doc(db, "estabelecimentos", estabelecimentoId, "faturasComissao", periodId);
      const snap = await getDoc(faturaRef);
      if (snap.exists()) {
        showMensagem("info", "Essa fatura já foi gerada. Veja em 'Faturas Geradas'.");
        setGerando(false);
        return;
      }

      // calcula faturamento do período
      const doPeriodo = pedidos.filter((p) => {
        const dt = p?.dataCriacao?.toDate ? p.dataCriacao.toDate() : null;
        if (!dt) return false;
        return dt >= start && dt <= end;
      });

      const faturamento = doPeriodo.reduce((acc, p) => acc + getPedidoTotal(p), 0);
      const comissao = faturamento * COMISSAO_PERCENTUAL;

      // status inicial: "vencida" (em aberto) — e você pode marcar como "paga" depois
      await setDoc(
        faturaRef,
        {
          periodId,
          percentual: COMISSAO_PERCENTUAL,
          periodoInicio: start,
          periodoFim: end,
          qtdePedidos: doPeriodo.length,

          faturamentoTotal: Number(faturamento.toFixed(2)),
          comissaoTotal: Number(comissao.toFixed(2)),

          pix: PIX_INFO,

          // ✅ obrigatório: paga ou vencida
          statusPagamento: "vencida",
          pagoEm: null,

          criadoEm: serverTimestamp(),
          criadoPor: currentUser?.email || null,

          // para auditoria, salva ids dos pedidos usados no cálculo
          pedidosIds: doPeriodo.map((p) => p.id),
        },
        { merge: true }
      );

      showMensagem("success", "Fatura da semana anterior gerada com sucesso!");
    } catch (err) {
      console.error(err);
      showMensagem("error", "Erro ao gerar a fatura.");
    } finally {
      setGerando(false);
    }
  };

  // -----------------------------
  // ✅ Marcar fatura como PAGA
  // -----------------------------
  const marcarComoPaga = async (faturaId) => {
    if (!estabelecimentoId || !faturaId) return;

    const ok = window.confirm("Confirmar: marcar esta fatura como PAGA?");
    if (!ok) return;

    setMarcando(true);
    try {
      const ref = doc(db, "estabelecimentos", estabelecimentoId, "faturasComissao", faturaId);
      await updateDoc(ref, {
        statusPagamento: "paga",
        pagoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        atualizadoPor: currentUser?.email || null,
      });

      showMensagem("success", "Fatura marcada como PAGA!");
    } catch (err) {
      console.error(err);
      showMensagem("error", "Erro ao marcar como paga.");
    } finally {
      setMarcando(false);
    }
  };

  // -----------------------------
  // ✅ Marcar fatura como VENCIDA (em aberto)
  // -----------------------------
  const marcarComoVencida = async (faturaId) => {
    if (!estabelecimentoId || !faturaId) return;

    const ok = window.confirm("Confirmar: marcar esta fatura como VENCIDA (em aberto)?");
    if (!ok) return;

    setMarcando(true);
    try {
      const ref = doc(db, "estabelecimentos", estabelecimentoId, "faturasComissao", faturaId);
      await updateDoc(ref, {
        statusPagamento: "vencida",
        pagoEm: null,
        atualizadoEm: serverTimestamp(),
        atualizadoPor: currentUser?.email || null,
      });

      showMensagem("success", "Fatura marcada como VENCIDA!");
    } catch (err) {
      console.error(err);
      showMensagem("error", "Erro ao marcar como vencida.");
    } finally {
      setMarcando(false);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  const styles = {
    container: { maxWidth: "1200px", margin: "0 auto", width: "100%" },
    header: {
      marginBottom: "22px",
      paddingBottom: "16px",
      borderBottom: "1px solid rgba(79, 209, 197, 0.08)",
    },
    title: { color: "#4FD1C5", fontSize: "28px", marginBottom: "6px" },
    subtitle: { color: "#81E6D9", opacity: 0.85, fontSize: "13px" },

    msg: (tipo) => ({
      padding: "14px 16px",
      borderRadius: "10px",
      marginBottom: "16px",
      backgroundColor:
        tipo === "success"
          ? "rgba(16, 185, 129, 0.1)"
          : tipo === "error"
          ? "rgba(245, 101, 101, 0.1)"
          : "rgba(79, 209, 197, 0.08)",
      border:
        tipo === "success"
          ? "1px solid rgba(16, 185, 129, 0.25)"
          : tipo === "error"
          ? "1px solid rgba(245, 101, 101, 0.25)"
          : "1px solid rgba(79, 209, 197, 0.2)",
      color:
        tipo === "success" ? "#10B981" : tipo === "error" ? "#F56565" : "#4FD1C5",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }),

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
      gap: "18px",
      alignItems: "start",
    },
    card: {
      backgroundColor: "rgba(0, 35, 40, 0.6)",
      border: "1px solid rgba(79, 209, 197, 0.12)",
      borderRadius: "14px",
      padding: "18px",
      overflow: "hidden",
    },
    cardTitle: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      color: "#4FD1C5",
      fontSize: "16px",
      fontWeight: 800,
      marginBottom: "14px",
    },
    row: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      padding: "10px 0",
      borderBottom: "1px solid rgba(79, 209, 197, 0.07)",
      color: "#A0AEC0",
      fontSize: "13px",
    },
    strong: { color: "#E6FFFA", fontWeight: 800 },
    btnPrimary: {
      width: "100%",
      marginTop: "14px",
      backgroundColor: "#4FD1C5",
      color: "#00171A",
      border: "none",
      padding: "14px 16px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: 900,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
    },
    btnGhost: {
      backgroundColor: "rgba(79, 209, 197, 0.08)",
      color: "#81E6D9",
      border: "1px solid rgba(79, 209, 197, 0.2)",
      padding: "10px 12px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: 800,
    },
    pill: (paid) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 900,
      color: paid ? "#10B981" : "#F56565",
      backgroundColor: paid ? "rgba(16,185,129,0.12)" : "rgba(245,101,101,0.10)",
      border: paid
        ? "1px solid rgba(16,185,129,0.25)"
        : "1px solid rgba(245,101,101,0.25)",
    }),
    list: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" },
    faturaItem: {
      padding: "14px",
      borderRadius: "12px",
      backgroundColor: "rgba(0, 0, 0, 0.16)",
      border: "1px solid rgba(79, 209, 197, 0.10)",
    },
    faturaTop: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "10px",
    },
    faturaPeriod: { color: "#E6FFFA", fontWeight: 900, fontSize: "13px" },
    faturaMeta: { color: "#A0AEC0", fontSize: "12px", marginTop: "4px" },
    faturaActions: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      marginTop: "10px",
      justifyContent: "flex-end",
    },
    hint: { color: "#A0AEC0", fontSize: "12px", marginTop: "10px" },
  };

  return (
    <Layout isMobile={isMobile} user={currentUser}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>🧾 Comissão da Plataforma</h1>
          <p style={styles.subtitle}>
            Comissão fixa de <b>10%</b> sobre o faturamento semanal (<b>domingo 00:00</b> → <b>sábado 23:59</b>).
            O cálculo é feito somando <b>pagamento.total</b> dos pedidos do seu estabelecimento.
          </p>
        </header>

        {mensagem.texto && (
          <div style={styles.msg(mensagem.tipo)}>
            {mensagem.tipo === "success" ? <CheckCircle /> : <AlertCircle />}
            {mensagem.texto}
          </div>
        )}

        <div style={styles.grid}>
          {/* Resumo semana atual */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Wallet size={18} />
              Resumo da Semana Atual (preview)
            </div>

            <div style={styles.row}>
              <div>Período</div>
              <div style={styles.strong}>
                {toDateInputValue(resumoSemanaAtual.inicio)} → {toDateInputValue(resumoSemanaAtual.fim)}
              </div>
            </div>

            <div style={styles.row}>
              <div>Pedidos considerados</div>
              <div style={styles.strong}>{resumoSemanaAtual.qtde}</div>
            </div>

            <div style={styles.row}>
              <div>Faturamento (entregue/concluído)</div>
              <div style={styles.strong}>{formatBRL(resumoSemanaAtual.faturamento)}</div>
            </div>

            <div style={styles.row}>
              <div>Comissão (10%)</div>
              <div style={styles.strong}>{formatBRL(resumoSemanaAtual.comissao)}</div>
            </div>

            <div style={styles.hint}>
              Esse bloco é apenas para acompanhar a semana atual. Para pagamento, gere a fatura da semana anterior.
            </div>

            <button
              style={styles.btnPrimary}
              onClick={gerarFaturaSemanaAnterior}
              disabled={gerando || loading}
              title="Gera e salva a fatura da semana anterior"
            >
              <FileText size={18} />
              {gerando ? "Gerando..." : "Gerar Fatura da Semana Anterior"}
            </button>

            <div style={styles.hint}>
              ✅ Salva em: <b>estabelecimentos/{`{uid}`}/faturasComissao/{`{periodId}`}</b>
            </div>
          </div>

          {/* PIX */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <CreditCard size={18} />
              Pagamento via PIX (semanal)
            </div>

            <div style={styles.row}>
              <div>Chave PIX</div>
              <div style={styles.strong}>{PIX_INFO.chave}</div>
            </div>
            <div style={styles.row}>
              <div>Banco</div>
              <div style={styles.strong}>{PIX_INFO.banco}</div>
            </div>
            <div style={styles.row}>
              <div>Titular</div>
              <div style={styles.strong}>{PIX_INFO.titular}</div>
            </div>
            <div style={{ ...styles.row, borderBottom: "none" }}>
              <div>Descrição</div>
              <div style={{ ...styles.strong, textAlign: "right", maxWidth: "320px" }}>
                {PIX_INFO.descricao}
              </div>
            </div>

            <div style={styles.cardTitle}>
              <Calendar size={18} />
              Faturas Geradas
            </div>

            {loading ? (
              <div style={{ color: "#A0AEC0" }}>Carregando...</div>
            ) : faturas.length === 0 ? (
              <div style={{ color: "#A0AEC0" }}>
                Nenhuma fatura ainda. Clique em <b>"Gerar Fatura da Semana Anterior"</b>.
              </div>
            ) : (
              <div style={styles.list}>
                {faturas.map((f) => {
                  const paid = isPaid(f);
                  const inicio = f?.periodoInicio?.toDate ? f.periodoInicio.toDate() : null;
                  const fim = f?.periodoFim?.toDate ? f.periodoFim.toDate() : null;

                  return (
                    <div key={f.id} style={styles.faturaItem}>
                      <div style={styles.faturaTop}>
                        <div>
                          <div style={styles.faturaPeriod}>
                            {inicio ? toDateInputValue(inicio) : f.id.split("_")[0]} →{" "}
                            {fim ? toDateInputValue(fim) : f.id.split("_")[1]}
                          </div>
                          <div style={styles.faturaMeta}>
                            Pedidos: <b>{f.qtdePedidos ?? 0}</b> • Faturamento:{" "}
                            <b>{formatBRL(f.faturamentoTotal)}</b> • Comissão (10%):{" "}
                            <b>{formatBRL(f.comissaoTotal)}</b>
                          </div>
                        </div>

                        <div style={styles.pill(paid)}>
                          {paid ? "✅ PAGA" : "⏳ VENCIDA"}
                        </div>
                      </div>

                      <div style={{ color: "#A0AEC0", fontSize: "12px" }}>
                        PIX: <b>{PIX_INFO.chave}</b> • {PIX_INFO.banco} • {PIX_INFO.titular}
                      </div>

                      <div style={styles.faturaActions}>
                        <button
                          style={styles.btnGhost}
                          disabled={marcando}
                          onClick={() => marcarComoPaga(f.id)}
                        >
                          Marcar como PAGA
                        </button>

                        <button
                          style={styles.btnGhost}
                          disabled={marcando}
                          onClick={() => marcarComoVencida(f.id)}
                        >
                          Marcar como VENCIDA
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={styles.hint}>
              ⚠️ Importante: a comissão é sempre <b>10%</b> do <b>pagamento.total</b> somado dos pedidos do período,
              filtrando pelo <b>estabelecimento logado</b>.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ComissaoPlataforma;
