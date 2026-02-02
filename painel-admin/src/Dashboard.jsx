import { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp
} from "firebase/firestore";

const Dashboard = () => {
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loadingEst, setLoadingEst] = useState(true);
  const [loadingPed, setLoadingPed] = useState(true);

  // ✅ datas (default: últimos 30 dias)
  const toDateInput = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const hoje = new Date();
  const d30 = new Date();
  d30.setDate(hoje.getDate() - 30);

  const [dataIni, setDataIni] = useState(toDateInput(d30));
  const [dataFim, setDataFim] = useState(toDateInput(hoje));

  // ✅ buscar estabelecimentos
  useEffect(() => {
    const qEst = query(collection(db, "estabelecimentos"), orderBy("dataCadastro", "desc"));

    const unsub = onSnapshot(
      qEst,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setEstabelecimentos(arr);
        setLoadingEst(false);
      },
      (err) => {
        console.error("Erro ao carregar estabelecimentos:", err);
        setLoadingEst(false);
      }
    );

    return () => unsub();
  }, []);

  // ✅ buscar pedidos por período (sempre trazer pagamento.total)
  useEffect(() => {
    setLoadingPed(true);

    // monta range do dia inteiro
    const ini = new Date(`${dataIni}T00:00:00`);
    const fim = new Date(`${dataFim}T23:59:59`);

    const iniTs = Timestamp.fromDate(ini);
    const fimTs = Timestamp.fromDate(fim);

    // ✅ tenta filtrar por dataCriacao (que você mostrou no print)
    // obs: pode pedir índice do Firestore
    const qPed = query(
      collection(db, "Pedidos"),
      where("dataCriacao", ">=", iniTs),
      where("dataCriacao", "<=", fimTs),
      orderBy("dataCriacao", "desc")
    );

    const unsub = onSnapshot(
      qPed,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setPedidos(arr);
        setLoadingPed(false);
      },
      (err) => {
        console.error("Erro ao carregar pedidos:", err);
        // Dica: se aparecer erro de índice, o Firebase mostra um link pra criar.
        setPedidos([]);
        setLoadingPed(false);
      }
    );

    return () => unsub();
  }, [dataIni, dataFim]);

  const formatMoeda = (v) => {
    const n = Number(v || 0);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const normalizarTexto = (s) => String(s || "").trim();

  // ✅ agregação por estabelecimento (faturamento + comissão)
  const faturamentoPorEst = useMemo(() => {
    const map = new Map();

    (pedidos || []).forEach((p) => {
      // IDs possíveis (você tem em lugares diferentes no doc)
      const estId =
        p.estabelecimentoId ||
        p.entrega?.estabelecimentoId ||
        p.pagamento?.restauranteId ||
        p.restauranteId;

      const estNome =
        p.estabelecimentoNome ||
        p.entrega?.estabelecimentoNome ||
        p.pagamento?.restauranteNome ||
        p.restauranteNome ||
        "—";

      // ✅ SEMPRE trazer o total:
      // prioridade: pagamento.total (print mostra isso)
      // fallback: total na raiz ou subtotal+taxaEntrega
      const total =
        Number(p.pagamento?.total ?? p.total ?? 0) ||
        Number((p.pagamento?.subtotal || 0) + (p.pagamento?.taxaEntrega || 0));

      if (!estId) return;

      if (!map.has(estId)) {
        map.set(estId, {
          estId,
          estNome: normalizarTexto(estNome),
          pedidos: 0,
          faturamento: 0
        });
      }

      const item = map.get(estId);
      item.pedidos += 1;
      item.faturamento += Number(total || 0);
      map.set(estId, item);
    });

    // junta com dados do cadastro (cidade/bairro/uf)
    const estMap = new Map((estabelecimentos || []).map((e) => [e.id, e]));

    const arr = Array.from(map.values()).map((x) => {
      const est = estMap.get(x.estId);
      const cidade = est?.endereco?.cidade || "—";
      const bairro = est?.endereco?.bairro || "—";
      const uf = est?.endereco?.uf || est?.endereco?.estado || "—";

      const comissao = x.faturamento * 0.1;

      return {
        ...x,
        cidade,
        bairro,
        uf,
        comissao
      };
    });

    // ordena por maior faturamento
    arr.sort((a, b) => (b.faturamento || 0) - (a.faturamento || 0));
    return arr;
  }, [pedidos, estabelecimentos]);

  const totaisPeriodo = useMemo(() => {
    const faturamento = faturamentoPorEst.reduce((s, a) => s + (a.faturamento || 0), 0);
    const comissao = faturamento * 0.1;
    const totalPedidos = faturamentoPorEst.reduce((s, a) => s + (a.pedidos || 0), 0);
    return { faturamento, comissao, totalPedidos };
  }, [faturamentoPorEst]);

  const porCidade = useMemo(() => {
    const m = new Map();
    (estabelecimentos || []).forEach((e) => {
      const cidade = normalizarTexto(e?.endereco?.cidade) || "—";
      m.set(cidade, (m.get(cidade) || 0) + 1);
    });

    const arr = Array.from(m.entries()).map(([cidade, qtd]) => ({ cidade, qtd }));
    arr.sort((a, b) => b.qtd - a.qtd);
    return arr;
  }, [estabelecimentos]);

  // ✅ stats de estabelecimentos
  const statsEst = useMemo(() => {
    const total = estabelecimentos.length;
    const ativos = estabelecimentos.filter((e) => e.ativo).length;
    const inativos = total - ativos;
    return { total, ativos, inativos };
  }, [estabelecimentos]);

  // ✅ estilos padrão
  const styles = {
    wrap: { width: "100%" },

    title: { color: "#4FD1C5", fontSize: 22, margin: 0, marginBottom: 6, fontWeight: "bold" },
    subtitle: { color: "#A0AEC0", margin: 0, marginBottom: 18, fontSize: 13 },

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 14,
      marginBottom: 18
    },

    card: {
      background: "rgba(0, 23, 26, 0.65)",
      border: "1px solid rgba(79, 209, 197, 0.12)",
      borderRadius: 16,
      padding: 16,
      marginBottom: 14
    },

    cardLabel: { color: "#81E6D9", fontSize: 12, marginBottom: 8, opacity: 0.9 },
    cardValue: { color: "#fff", fontSize: 28, fontWeight: "bold", lineHeight: 1.1 },
    cardHint: { color: "#A0AEC0", fontSize: 12, marginTop: 8 },

    inputGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { color: "#81E6D9", fontSize: 12, fontWeight: 600, opacity: 0.9 },

    input: {
      backgroundColor: "rgba(0, 23, 26, 0.80)",
      border: "1px solid rgba(79, 209, 197, 0.18)",
      borderRadius: 12,
      padding: "10px 12px",
      color: "#fff",
      fontSize: 14,
      outline: "none"
    },

    tableWrap: {
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid rgba(79, 209, 197, 0.12)",
      background: "rgba(0, 23, 26, 0.55)"
    },

    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      padding: 14,
      textAlign: "left",
      color: "#4FD1C5",
      background: "rgba(79, 209, 197, 0.08)",
      borderBottom: "1px solid rgba(79, 209, 197, 0.12)",
      fontSize: 13
    },
    td: { padding: 14, color: "#fff", borderBottom: "1px solid rgba(79, 209, 197, 0.08)", verticalAlign: "top" },
    sub: { color: "#A0AEC0", fontSize: 12, marginTop: 4 },

    badge: (ok) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      fontWeight: "bold",
      fontSize: 12,
      color: ok ? "#10B981" : "#F56565",
      background: ok ? "rgba(16,185,129,0.12)" : "rgba(245,101,101,0.12)",
      border: ok ? "1px solid rgba(16,185,129,0.20)" : "1px solid rgba(245,101,101,0.20)"
    }),

    loading: {
      display: "inline-block",
      width: 16,
      height: 16,
      border: "2px solid rgba(255,255,255,0.20)",
      borderTopColor: "rgba(255,255,255,0.85)",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }
  };

  const carregando = loadingEst || loadingPed;

  return (
    <div style={styles.wrap}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        tr:hover { background: rgba(79, 209, 197, 0.05); }
        input:focus { border-color: #4FD1C5 !important; }
      `}</style>

      <h2 style={styles.title}>📊 Dashboard</h2>
      <p style={styles.subtitle}>Resumo do sistema, faturamento por período e cadastros por cidade</p>

      {/* filtros de data */}
      <div style={styles.card}>
        <div style={{ color: "#4FD1C5", fontWeight: "bold", marginBottom: 10 }}>📅 Filtro de período (Pedidos)</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Data inicial</label>
            <input style={styles.input} type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Data final</label>
            <input style={styles.input} type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Status</label>
            <div style={{ color: "#A0AEC0", fontSize: 12, marginTop: 10 }}>
              O filtro usa <b>dataCriacao</b> em <b>Pedidos</b>.
              <br />
              Se pedir índice, crie no link do erro.
            </div>
          </div>
        </div>
      </div>

      {/* cards topo */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Estabelecimentos cadastrados</div>
          <div style={styles.cardValue}>{loadingEst ? "—" : statsEst.total}</div>
          <div style={styles.cardHint}>Total no Firestore</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Faturamento (período)</div>
          <div style={styles.cardValue}>{carregando ? "—" : formatMoeda(totaisPeriodo.faturamento)}</div>
          <div style={styles.cardHint}>
            {carregando ? "Carregando pedidos..." : `${totaisPeriodo.totalPedidos} pedidos no período`}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Comissão da plataforma (10%)</div>
          <div style={styles.cardValue}>{carregando ? "—" : formatMoeda(totaisPeriodo.comissao)}</div>
          <div style={styles.cardHint}>10% em cima do total (pagamento.total)</div>
        </div>
      </div>

      {/* faturamento por estabelecimento */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ color: "#4FD1C5", fontWeight: "bold" }}>💰 Faturamento por estabelecimento</div>

          {carregando ? (
            <span style={{ color: "#A0AEC0", fontSize: 12 }}>
              <span style={styles.loading} /> <span style={{ marginLeft: 8 }}>Carregando...</span>
            </span>
          ) : (
            <span style={{ color: "#A0AEC0", fontSize: 12 }}>
              Período: <b>{dataIni}</b> até <b>{dataFim}</b>
            </span>
          )}
        </div>

        <div style={{ height: 12 }} />

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Estabelecimento</th>
                <th style={styles.th}>Cidade / UF</th>
                <th style={styles.th}>Pedidos</th>
                <th style={styles.th}>Faturamento</th>
                <th style={styles.th}>Comissão (10%)</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan="5" style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.loading} />{" "}
                    <span style={{ marginLeft: 10, color: "#4FD1C5", fontWeight: "bold" }}>Carregando...</span>
                  </td>
                </tr>
              ) : faturamentoPorEst.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ ...styles.td, textAlign: "center", color: "#A0AEC0" }}>
                    Nenhum pedido encontrado nesse período
                  </td>
                </tr>
              ) : (
                faturamentoPorEst.map((e) => (
                  <tr key={e.estId}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{e.estNome}</div>
                      <div style={styles.sub}>UID: {e.estId}</div>
                      <div style={styles.sub}>Bairro: {e.bairro}</div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{e.cidade}</div>
                      <div style={styles.sub}>{e.uf}</div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{e.pedidos}</div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{formatMoeda(e.faturamento)}</div>
                      <div style={styles.sub}>Somando pagamento.total</div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{formatMoeda(e.comissao)}</div>
                      <div style={styles.sub}>10%</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, color: "#A0AEC0", fontSize: 12 }}>
          ✅ Regra usada: <b>comissão = faturamento × 0,10</b>.  
          (Se você quiser taxa diferente por loja depois, a gente coloca um campo “percentualComissao” no cadastro.)
        </div>
      </div>

      {/* estabelecimentos por cidade */}
      <div style={styles.card}>
        <div style={{ color: "#4FD1C5", fontWeight: "bold", marginBottom: 10 }}>🏙️ Estabelecimentos por cidade</div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cidade</th>
                <th style={styles.th}>Quantidade</th>
              </tr>
            </thead>

            <tbody>
              {loadingEst ? (
                <tr>
                  <td colSpan="2" style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.loading} />{" "}
                    <span style={{ marginLeft: 10, color: "#4FD1C5", fontWeight: "bold" }}>Carregando...</span>
                  </td>
                </tr>
              ) : porCidade.length === 0 ? (
                <tr>
                  <td colSpan="2" style={{ ...styles.td, textAlign: "center", color: "#A0AEC0" }}>
                    Nenhum estabelecimento cadastrado
                  </td>
                </tr>
              ) : (
                porCidade.map((c) => (
                  <tr key={c.cidade}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{c.cidade}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge(true)}>{c.qtd}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
