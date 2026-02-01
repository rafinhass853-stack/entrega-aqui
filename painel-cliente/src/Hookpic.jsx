// Hookpic.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, doc, getDoc, where } from "firebase/firestore";

// Hook para detectar tamanho da tela
export const useMediaQuery = (queryStr) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(queryStr);
    if (media.matches !== matches) setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, queryStr]);

  return matches;
};

export const useClienteStorage = () => {
  const getDadosClienteStorage = () => {
    try {
      const raw = localStorage.getItem("dadosCliente");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
      localStorage.removeItem("dadosCliente");
      return null;
    }
  };

  const [dadosCliente, setDadosCliente] = useState(getDadosClienteStorage);

  const logout = useCallback(() => {
    localStorage.removeItem("dadosCliente");
    setDadosCliente(null);
  }, []);

  return { dadosCliente, setDadosCliente, logout };
};

export const useHorarioHelpers = () => {
  const diasSemana = useMemo(
    () => ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
    []
  );

  const converterHorarioParaMinutos = useCallback((horarioStr) => {
    if (!horarioStr || typeof horarioStr !== "string") return null;
    const [h, m] = horarioStr.split(":").map((v) => Number(v));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }, []);

  const getHojeNome = useCallback(() => {
    return diasSemana[new Date().getDay()];
  }, [diasSemana]);

  const montarTextoHorarioHoje = useCallback(
    (horarioFuncionamento) => {
      const hoje = getHojeNome();
      const diaObj = horarioFuncionamento?.[hoje];
      const abre = diaObj?.abre;
      const fecha = diaObj?.fecha;

      if (!abre || !fecha) return "Horário não definido";
      if (abre === fecha) return "Fechado hoje";
      return `${abre} às ${fecha}`;
    },
    [getHojeNome]
  );

  const verificarAbertoAgora = useCallback(
    (horarioFuncionamento) => {
      const hoje = getHojeNome();
      const diaObj = horarioFuncionamento?.[hoje];
      const abreStr = diaObj?.abre;
      const fechaStr = diaObj?.fecha;

      if (!abreStr || !fechaStr) return false;
      if (abreStr === fechaStr) return false;

      const abertura = converterHorarioParaMinutos(abreStr);
      const fechamento = converterHorarioParaMinutos(fechaStr);
      if (abertura == null || fechamento == null) return false;

      const agora = new Date();
      const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();

      // fecha no dia seguinte (ex: 18:00 -> 02:00)
      if (fechamento < abertura) {
        return minutosAtuais >= abertura || minutosAtuais <= fechamento;
      }
      return minutosAtuais >= abertura && minutosAtuais <= fechamento;
    },
    [converterHorarioParaMinutos, getHojeNome]
  );

  return {
    diasSemana,
    converterHorarioParaMinutos,
    getHojeNome,
    montarTextoHorarioHoje,
    verificarAbertoAgora,
  };
};

export const useEstabelecimentos = ({ montarTextoHorarioHoje, verificarAbertoAgora }) => {
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const estabelecimentosRef = collection(db, "estabelecimentos");
    const q = query(estabelecimentosRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const listaPromises = snapshot.docs.map(async (docRef) => {
          const data = docRef.data();
          const id = docRef.id;

          let horarioFuncionamento = null;
          let textoHorario = "Horário não definido";
          let abertoAgora = false;

          // ✅ tempo agora vem do Firestore (estabelecimentos/{id}.tempoEntrega)
          const tempoEntregaMinRaw = Number(data?.tempoEntrega ?? data?.tempoAtendimento ?? 30);
          const tempoEntregaMin = Number.isFinite(tempoEntregaMinRaw)
            ? Math.max(0, Math.min(999, tempoEntregaMinRaw))
            : 30;

          let taxaEntregaCalculada = data.taxaEntrega ?? 0;

          // buscar horário na subcoleção: estabelecimentos/{id}/config/horario
          try {
            const horarioRef = doc(db, "estabelecimentos", id, "config", "horario");
            const horarioSnap = await getDoc(horarioRef);

            if (horarioSnap.exists()) {
              const hData = horarioSnap.data();
              horarioFuncionamento = hData?.horarioFuncionamento || null;
              textoHorario = montarTextoHorarioHoje(horarioFuncionamento);
              abertoAgora = verificarAbertoAgora(horarioFuncionamento);
            } else {
              abertoAgora = false;
              textoHorario = "Horário não definido";
            }
          } catch (e) {
            console.error("Erro ao ler horário:", e);
            abertoAgora = false;
            textoHorario = "Horário não definido";
          }

          // taxa por faixas (se taxaEntregaCalculada = 0)
          try {
            if (taxaEntregaCalculada === 0) {
              const entregaDocRef = doc(db, "estabelecimentos", id, "configuracao", "entrega");
              const entregaSnap = await getDoc(entregaDocRef);

              if (entregaSnap.exists()) {
                const entregaConfig = entregaSnap.data();
                const faixas = Array.isArray(entregaConfig?.faixas) ? entregaConfig.faixas : [];
                const faixaOrdenada = [...faixas].sort(
                  (a, b) => Number(a.ate || 0) - Number(b.ate || 0)
                );

                taxaEntregaCalculada = Number(faixaOrdenada?.[0]?.valor ?? taxaEntregaCalculada ?? 0);
              }
            }
          } catch (e) {
            console.error("Erro ao calcular taxa:", e);
          }

          const enderecoData =
            data.endereco && typeof data.endereco === "object" ? data.endereco : {};

          return {
            id,
            ...data,
            cliente: data.loginUsuario || data.cliente || "Loja",
            categoria: data.categoria || "lanches",
            endereco: {
              bairro: enderecoData.bairro || data.bairro || "Bairro",
              cidade: enderecoData.cidade || data.cidade || "Araraquara",
              rua: enderecoData.rua || "",
            },
            taxaEntrega: Number(taxaEntregaCalculada) || 0,
            tempoEntrega: tempoEntregaMin, // ✅ agora é o valor do estabelecimento
            horarioFuncionamento,
            textoHorario,
            aberto: abertoAgora,
          };
        });

        const listaCompleta = await Promise.all(listaPromises);
        setEstabelecimentos(listaCompleta);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setEstabelecimentos([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [montarTextoHorarioHoje, verificarAbertoAgora]);

  return { estabelecimentos, loading };
};

export const useHistoricoPedidos = (dadosCliente) => {
  const [historicoPedidos, setHistoricoPedidos] = useState([]);

  useEffect(() => {
    if (!dadosCliente?.telefone) {
      setHistoricoPedidos([]);
      return;
    }
    const telBusca = String(dadosCliente.telefone);
    const q = query(collection(db, "Pedidos"), where("cliente.telefone", "==", telBusca));

    return onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHistoricoPedidos(
        lista.sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0))
      );
    });
  }, [dadosCliente]);

  return { historicoPedidos };
};
