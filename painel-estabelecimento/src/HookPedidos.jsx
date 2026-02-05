// HookPedidos.jsx
// Firestore + filtros + stats + faturamento + histórico + modais + notificações

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  doc,
  updateDoc,
  serverTimestamp,
  where,
  getDocs,
  limit
} from "firebase/firestore";

import {
  diffDaysFromNow,
  endOfDay,
  formatMoneyBR,
  parsePedidoDate,
  startOfDay,
  toISODateLocal,
  toNumber
} from "./StylesPedidos";

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);
  return isMobile;
};

export const usePedidos = ({ user }) => {
  const isMobile = useIsMobile();

  // tabs (sem "todos")
  const [tabAtiva, setTabAtiva] = useState("pendente");

  // dados
  const [pedidos, setPedidos] = useState([]);

  // busca/filtros
  const [busca, setBusca] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [dataInicio, setDataInicio] = useState(""); // yyyy-mm-dd
  const [dataFim, setDataFim] = useState(""); // yyyy-mm-dd

  // notificações
  const [notificacoes, setNotificacoes] = useState([]);
  const [configNotificacao, setConfigNotificacao] = useState({
    som: true,
    popup: true,
    desktop: true
  });

  // novo pedido modal
  const [mostrarModalNovoPedido, setMostrarModalNovoPedido] = useState(false);
  const [pedidoParaAceitar, setPedidoParaAceitar] = useState(null);

  // modal detalhes
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [pedidoDetalhe, setPedidoDetalhe] = useState(null);

  // refs
  const pedidosAnterioresRef = useRef([]);
  const notificationSoundRef = useRef(null);

  // WebAudio (sino)
  const audioCtxRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  const unlockAudio = useCallback(() => {
    try {
      if (audioUnlockedRef.current) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();

      // resume no primeiro gesto
      audioCtxRef.current.resume?.().catch(() => {});
      audioUnlockedRef.current = true;
    } catch (_) {}
  }, []);

  const playBell = useCallback(() => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;

      // Osciladores (efeito sino simples)
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();

      o1.type = "sine";
      o2.type = "triangle";
      o1.frequency.setValueAtTime(880, now);
      o2.frequency.setValueAtTime(1320, now);

      // envelope
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      o1.connect(g);
      o2.connect(g);
      g.connect(ctx.destination);

      o1.start(now);
      o2.start(now);
      o1.stop(now + 1.0);
      o2.stop(now + 1.0);
    } catch (_) {}
  }, []);

  const playConfirm = useCallback(() => {
    // som de confirmação quando muda status (mantém mp3)
    notificationSoundRef.current?.play().catch(() => {});
  }, []);

  const abrirDetalhes = useCallback((pedido) => {
    setPedidoDetalhe(pedido);
    setModalDetalhesOpen(true);
  }, []);

  const fecharDetalhes = useCallback(() => {
    setModalDetalhesOpen(false);
    setPedidoDetalhe(null);
  }, []);

  const calcularTempoDecorrido = useCallback((data) => {
    if (!data) return "Agora";
    const d = data.toDate ? data.toDate() : new Date(data);
    const diff = Math.floor((new Date() - d) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }, []);

  const formatHora = useCallback((dataCriacao) => {
    try {
      const d = parsePedidoDate(dataCriacao);
      if (!d) return "";
      return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "";
    }
  }, []);

  // resolve estabelecimentoId real
  const resolverEstabelecimentoId = useCallback(async () => {
    const direct = user?.estabelecimentoId || user?.restauranteId || user?.lojaId || user?.uid;
    let estabId = direct || null;

    const email = String(user?.email || "").trim().toLowerCase();
    if (!email) return estabId;

    const tentar = async (campo) => {
      const q = query(collection(db, "estabelecimentos"), where(campo, "==", email), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].id;
      return null;
    };

    const campos = ["email", "emailUsuario", "usuarioEmail", "loginUsuario"];

    for (const campo of campos) {
      try {
        const found = await tentar(campo);
        if (found) {
          estabId = found;
          break;
        }
      } catch (_) {}
    }

    return estabId;
  }, [user]);

  // config notificação
  useEffect(() => {
    const savedConfig = localStorage.getItem("configNotificacao");
    if (savedConfig) setConfigNotificacao(JSON.parse(savedConfig));

    // confirmação ao mudar status (mp3)
    notificationSoundRef.current = new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3"
    );

    // desbloqueio do áudio no primeiro clique/toque
    const onFirstGesture = () => unlockAudio();
    window.addEventListener("pointerdown", onFirstGesture, { once: true });

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => window.removeEventListener("pointerdown", onFirstGesture);
  }, [unlockAudio]);

  const handleConfigNotificacao = useCallback((tipo) => {
    setConfigNotificacao((prev) => {
      const nova = { ...prev, [tipo]: !prev[tipo] };
      localStorage.setItem("configNotificacao", JSON.stringify(nova));
      return nova;
    });
  }, []);

  // buscar pedidos
  useEffect(() => {
    if (!user) return;

    let unsub1 = null;
    let unsub2 = null;

    const iniciar = async () => {
      const estabId = await resolverEstabelecimentoId();
      if (!estabId) {
        console.warn("Pedidos: não consegui resolver o estabelecimentoId do usuário.", user);
        setPedidos([]);
        return;
      }

      const pedidosRef = collection(db, "Pedidos");

      const qRest = query(pedidosRef, where("restauranteId", "==", estabId));
      const qEstab = query(pedidosRef, where("estabelecimentoId", "==", estabId));

      let s1 = null;
      let s2 = null;

      const mergeAndSet = (snapA, snapB) => {
        const map = new Map();
        const hojeStr = new Date().toDateString();

        const addSnap = (snap) => {
          if (!snap) return;
          snap.docs.forEach((d) => {
            const data = d.data();
            const dataPedido = parsePedidoDate(data.dataCriacao) || new Date();
            const ehHoje = dataPedido.toDateString() === hojeStr;

            map.set(d.id, {
              id: d.id,
              ...data,
              status: data.status || "pendente",
              numeroPedido: data.numeroPedido || d.id.slice(-6).toUpperCase(),
              cliente: data.cliente || {},
              pagamento: data.pagamento || {},
              itens: Array.isArray(data.itens) ? data.itens : [],
              observacoes: data.observacoes || data.obs || data.observacao || "",
              ehHoje,
              tempoDecorrido: calcularTempoDecorrido(data.dataCriacao)
            });
          });
        };

        addSnap(snapA);
        addSnap(snapB);

        const lista = Array.from(map.values()).sort((a, b) => {
          const da = parsePedidoDate(a.dataCriacao) || new Date(0);
          const dbb = parsePedidoDate(b.dataCriacao) || new Date(0);
          return dbb - da;
        });

        // detectar novos pedidos (pendentes novos)
        if (pedidosAnterioresRef.current.length > 0) {
          const novos = lista.filter(
            (p) =>
              p.status === "pendente" &&
              !pedidosAnterioresRef.current.some((old) => old.id === p.id)
          );

          if (novos.length > 0) {
            const novoPedido = novos[0];

            setPedidoParaAceitar(novoPedido);
            setMostrarModalNovoPedido(true);

            if (configNotificacao.som) {
              // sino
              unlockAudio();
              playBell();
            }

            if (
              configNotificacao.desktop &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification(`🔔 Novo Pedido #${novoPedido.numeroPedido}`, {
                body: `${novoPedido.cliente?.nomeCompleto || "Cliente"} - ${formatMoneyBR(
                  novoPedido.pagamento?.total
                )}`,
                icon: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
                tag: `pedido-${novoPedido.id}`
              });
            }

            setNotificacoes((prev) => [
              {
                id: novoPedido.id,
                tipo: "novo_pedido",
                titulo: `Novo Pedido #${novoPedido.numeroPedido}`,
                mensagem: `${novoPedido.cliente?.nomeCompleto || "Cliente"} - ${formatMoneyBR(
                  novoPedido.pagamento?.total
                )}`,
                data: new Date(),
                lida: false
              },
              ...prev.slice(0, 9)
            ]);
          }
        }

        pedidosAnterioresRef.current = lista;
        setPedidos(lista);
      };

      unsub1 = onSnapshot(
        qRest,
        (s) => {
          s1 = s;
          mergeAndSet(s1, s2);
        },
        (err) => console.error("Erro onSnapshot qRest:", err)
      );

      unsub2 = onSnapshot(
        qEstab,
        (s) => {
          s2 = s;
          mergeAndSet(s1, s2);
        },
        (err) => console.error("Erro onSnapshot qEstab:", err)
      );
    };

    iniciar();

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, [user, configNotificacao, calcularTempoDecorrido, resolverEstabelecimentoId, playBell, unlockAudio]);

  const handleStatusChange = useCallback(
    async (id, novoStatus) => {
      try {
        const pedidoRef = doc(db, "Pedidos", id);

        await updateDoc(pedidoRef, {
          status: novoStatus,
          atualizadoEm: serverTimestamp(),
          atualizadoPor: user?.email || "Sistema",
          historico: {
            [new Date().toISOString()]: `Status alterado para ${novoStatus}`
          }
        });

        if (configNotificacao.som) {
          playConfirm();
        }

        setMostrarModalNovoPedido(false);
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Erro ao atualizar status.");
      }
    },
    [user, configNotificacao, playConfirm]
  );

  const enviarMensagemWhatsApp = useCallback((pedido) => {
    const telefone = String(pedido?.cliente?.telefone || "").replace(/\D/g, "");
    const nomeLoja = pedido.restauranteNome || pedido.estabelecimentoNome || "restaurante";
    const mensagem =
      `Olá ${pedido.cliente?.nomeCompleto || "Cliente"}! Aqui é o ${nomeLoja}. ` +
      `Seu pedido #${pedido.numeroPedido} está com status: ${String(pedido.status || "")
        .toUpperCase()}. ` +
      `Valor: ${formatMoneyBR(pedido.pagamento?.total)}.`;

    if (telefone) window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }, []);

  // filtros base (busca + datas)
  const pedidosBaseFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const hasIni = !!dataInicio;
    const hasFim = !!dataFim;

    let ini = null;
    let fim = null;

    if (hasIni) ini = startOfDay(new Date(`${dataInicio}T00:00:00`));
    if (hasFim) fim = endOfDay(new Date(`${dataFim}T00:00:00`));

    return pedidos.filter((p) => {
      const matchBusca =
        !termo ||
        String(p.cliente?.nomeCompleto || "").toLowerCase().includes(termo) ||
        String(p.numeroPedido || "").toLowerCase().includes(termo) ||
        String(p.cliente?.telefone || "").includes(termo);

      if (!matchBusca) return false;

      if (hasIni || hasFim) {
        const d = parsePedidoDate(p.dataCriacao);
        if (!d) return false;
        if (ini && d < ini) return false;
        if (fim && d > fim) return false;
      }

      return true;
    });
  }, [pedidos, busca, dataInicio, dataFim]);

  // tab final (sem "todos")
  const pedidosFiltrados = useMemo(() => {
    return pedidosBaseFiltrados.filter((p) => {
      if (tabAtiva === "historico") return ["entregue", "cancelado", "concluido"].includes(p.status);
      return p.status === tabAtiva;
    });
  }, [pedidosBaseFiltrados, tabAtiva]);

  // stats dinâmicos
  const stats = useMemo(() => {
    const base = pedidosBaseFiltrados;

    const pendentes = base.filter((p) => p.status === "pendente").length;
    const preparo = base.filter((p) => p.status === "preparo").length;
    const entrega = base.filter((p) => p.status === "entrega").length;

    const aceitas = base.filter((p) => ["entregue", "concluido"].includes(p.status));
    const canceladas = base.filter((p) => p.status === "cancelado");
    const historico = base.filter((p) => ["entregue", "concluido", "cancelado"].includes(p.status));

    const hojeStr = new Date().toDateString();
    const hojeLista = base.filter((p) => {
      const d = parsePedidoDate(p.dataCriacao);
      return d ? d.toDateString() === hojeStr : false;
    });

    const valorHoje = hojeLista.reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);
    const valorAceitas = aceitas.reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);
    const valorCanceladasVal = canceladas.reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);

    return {
      totalBase: base.length,
      pendentes,
      preparo,
      entrega,
      historico: historico.length,
      aceitas: aceitas.length,
      canceladas: canceladas.length,
      valorHoje,
      valorAceitas,
      valorCanceladas: valorCanceladasVal
    };
  }, [pedidosBaseFiltrados]);

  // faturamento D/W/15/M (considera entregue/concluido)
  const faturamento = useMemo(() => {
    const base = pedidosBaseFiltrados;
    const concluidos = base.filter((p) => ["entregue", "concluido"].includes(p.status));
    const now = new Date();

    const totalPeriodo = concluidos.reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);

    const totalHoje = concluidos
      .filter((p) => {
        const d = parsePedidoDate(p.dataCriacao);
        return d ? d.toDateString() === now.toDateString() : false;
      })
      .reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);

    const total7 = concluidos
      .filter((p) => {
        const d = parsePedidoDate(p.dataCriacao);
        return d ? diffDaysFromNow(d) <= 7 : false;
      })
      .reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);

    const total15 = concluidos
      .filter((p) => {
        const d = parsePedidoDate(p.dataCriacao);
        return d ? diffDaysFromNow(d) <= 15 : false;
      })
      .reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);

    const total30 = concluidos
      .filter((p) => {
        const d = parsePedidoDate(p.dataCriacao);
        return d ? diffDaysFromNow(d) <= 30 : false;
      })
      .reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);

    const hasPeriodo = !!dataInicio || !!dataFim;

    return { hasPeriodo, totalPeriodo, totalHoje, total7, total15, total30 };
  }, [pedidosBaseFiltrados, dataInicio, dataFim]);

  // histórico
  const historicoAceitas = useMemo(() => {
    if (tabAtiva !== "historico") return [];
    return pedidosFiltrados.filter((p) => ["entregue", "concluido"].includes(p.status));
  }, [tabAtiva, pedidosFiltrados]);

  const historicoCanceladas = useMemo(() => {
    if (tabAtiva !== "historico") return [];
    return pedidosFiltrados.filter((p) => p.status === "cancelado");
  }, [tabAtiva, pedidosFiltrados]);

  const limparFiltros = useCallback(() => {
    setBusca("");
    setDataInicio("");
    setDataFim("");
  }, []);

  const filtrosInvalidos = useMemo(() => {
    if (!dataInicio || !dataFim) return false;
    return new Date(`${dataInicio}T00:00:00`) > new Date(`${dataFim}T00:00:00`);
  }, [dataInicio, dataFim]);

  return {
    // base
    isMobile,
    user,

    // dados
    pedidos,
    pedidosBaseFiltrados,
    pedidosFiltrados,

    // tabs
    tabAtiva,
    setTabAtiva,

    // filtros/busca
    busca,
    setBusca,
    mostrarFiltros,
    setMostrarFiltros,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    limparFiltros,
    filtrosInvalidos,

    // stats/kpis
    stats,
    faturamento,

    // notificações
    notificacoes,
    setNotificacoes,
    configNotificacao,
    handleConfigNotificacao,

    // ações
    handleStatusChange,
    enviarMensagemWhatsApp,
    formatHora,

    // novo pedido modal
    mostrarModalNovoPedido,
    setMostrarModalNovoPedido,
    pedidoParaAceitar,
    setPedidoParaAceitar,
    calcularTempoDecorrido,

    // detalhes modal
    modalDetalhesOpen,
    pedidoDetalhe,
    abrirDetalhes,
    fecharDetalhes,

    // quick-range helpers
    toISODateLocal,

    // histórico
    historicoAceitas,
    historicoCanceladas
  };
};
