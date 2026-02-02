import { useState, useEffect, useMemo } from "react";
import { auth, db, functions } from "./firebase";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  doc,
  setDoc,
  collection,
  query,
  onSnapshot,
  orderBy,
  Timestamp,
  updateDoc
} from "firebase/firestore";

const Lojas = () => {
  const [formData, setFormData] = useState({
    cliente: "",
    cnpj: "",
    telefone: "",
    whatsapp: "",
    responsavel: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    loginEmail: "",
    loginUsuario: "",
    senha: ""
  });

  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // filtros
  const [filtros, setFiltros] = useState({ nome: "", cidade: "", bairro: "" });

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEst, setSelectedEst] = useState(null);

  // auth info (via function)
  const [authInfo, setAuthInfo] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState("");
  const [senhaLoading, setSenhaLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  // Cloud Functions
  const getAuthInfo = httpsCallable(functions, "getAuthInfo");
  const setUserPassword = httpsCallable(functions, "setUserPassword");
  const setUserDisabled = httpsCallable(functions, "setUserDisabled");

  const estados = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO",
    "MA","MT","MS","MG","PA","PB","PR","PE","PI",
    "RJ","RN","RS","RO","RR","SC","SP","SE","TO"
  ];

  useEffect(() => {
    setIsLoadingList(true);
    const q = query(collection(db, "estabelecimentos"), orderBy("dataCadastro", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setEstabelecimentos(data);
      setIsLoadingList(false);
    });

    return () => unsubscribe();
  }, []);

  // máscaras
  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 14) {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 5) return numbers.replace(/^(\d{2})(\d+)/, "$1.$2");
      if (numbers.length <= 8) return numbers.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
      if (numbers.length <= 12) return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
      return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, "$1.$2.$3/$4-$5");
    }
    return numbers.slice(0, 18);
  };

  const formatTelefone = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 6) return numbers.replace(/^(\d{2})(\d+)/, "($1) $2");
      return numbers.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
    }
    return numbers.replace(/^(\d{2})(\d{1})(\d{4})(\d+)/, "($1) $2 $3-$4").slice(0, 16);
  };

  const formatCEP = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 8) {
      if (numbers.length <= 5) return numbers;
      return numbers.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2-$3");
    }
    return numbers.slice(0, 10);
  };

  const formatarData = (data) => {
    if (data?.toDate) return data.toDate().toLocaleDateString("pt-BR");
    if (typeof data === "string") return new Date(data).toLocaleDateString("pt-BR");
    return "-";
  };

  const formatarDataHora = (isoString) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleString("pt-BR");
    } catch {
      return isoString;
    }
  };

  const handleCNPJChange = (e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) });
  const handleTelefoneChange = (e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) });
  const handleWhatsAppChange = (e) => setFormData({ ...formData, whatsapp: formatTelefone(e.target.value) });
  const handleCEPChange = (e) => setFormData({ ...formData, cep: formatCEP(e.target.value) });

  const buscarCEP = async () => {
    const cep = formData.cep.replace(/\D/g, "");
    if (cep.length !== 8) return alert("CEP inválido. Digite 8 números.");

    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          rua: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          uf: (data.uf || "").toUpperCase()
        }));
      } else {
        alert("CEP não encontrado.");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      alert("Erro ao buscar CEP. Tente novamente.");
    } finally {
      setIsLoadingCEP(false);
    }
  };

  const toggleAtivo = async (est) => {
    try {
      await updateDoc(doc(db, "estabelecimentos", est.id), {
        ativo: !est.ativo,
        ultimaAtualizacao: Timestamp.now()
      });
    } catch (e) {
      console.error("Erro ao alterar status:", e);
      alert("Erro ao alterar status.");
    }
  };

  const enviarResetSenha = async (email) => {
    try {
      if (!email) return alert("Este cadastro não possui e-mail.");
      await sendPasswordResetEmail(auth, email);
      alert("✅ Link de redefinição enviado para o e-mail do estabelecimento.");
    } catch (e) {
      console.error("Erro ao enviar reset:", e);
      alert("Erro ao enviar redefinição. Verifique se o e-mail é válido.");
    }
  };

  const abrirModal = async (est) => {
    setSelectedEst(est);
    setModalOpen(true);
    setAuthInfo(null);

    // já tenta buscar auth assim que abre (sem precisar clicar)
    await carregarAuthInfo(est.id);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setSelectedEst(null);
    setAuthInfo(null);
    setNovaSenhaAdmin("");
  };

  const carregarAuthInfo = async (uid) => {
    if (!uid) return;
    setAuthLoading(true);
    try {
      const res = await getAuthInfo({ uid });
      setAuthInfo(res.data || null);
    } catch (e) {
      console.error(e);
      setAuthInfo(null);
      alert("Erro ao buscar dados do Authentication (verifique se as Functions estão implantadas e se você é admin).");
    } finally {
      setAuthLoading(false);
    }
  };

  const definirSenhaAdmin = async (uid) => {
    const s = (novaSenhaAdmin || "").trim();
    if (s.length < 6) return alert("Senha deve ter no mínimo 6 caracteres.");

    setSenhaLoading(true);
    try {
      await setUserPassword({ uid, newPassword: s });
      setNovaSenhaAdmin("");
      alert("✅ Senha definida com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao definir senha. Verifique permissões (admin) e tente de novo.");
    } finally {
      setSenhaLoading(false);
    }
  };

  const toggleDisableAuth = async (uid) => {
    if (!authInfo?.uid) return;
    const novo = !authInfo.disabled;

    setDisableLoading(true);
    try {
      const res = await setUserDisabled({ uid, disabled: novo });
      setAuthInfo((prev) => ({ ...prev, disabled: !!res.data?.disabled }));
      alert(novo ? "⛔ Login BLOQUEADO no Authentication." : "✅ Login DESBLOQUEADO no Authentication.");
    } catch (e) {
      console.error(e);
      alert("Erro ao bloquear/desbloquear. Verifique permissões (admin) e tente de novo.");
    } finally {
      setDisableLoading(false);
    }
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();

    const erros = [];
    if (!formData.cliente) erros.push("Nome do Estabelecimento");
    if (!formData.cnpj.replace(/\D/g, "")) erros.push("CNPJ");
    if (!formData.telefone.replace(/\D/g, "")) erros.push("Telefone");
    if (!formData.responsavel) erros.push("Responsável");
    if (!formData.cep.replace(/\D/g, "")) erros.push("CEP");
    if (!formData.rua) erros.push("Rua");
    if (!formData.numero) erros.push("Número");
    if (!formData.bairro) erros.push("Bairro");
    if (!formData.cidade) erros.push("Cidade");
    if (!formData.uf) erros.push("UF");
    if (!formData.loginEmail) erros.push("E-mail de login");
    if (!formData.senha || formData.senha.length < 6) erros.push("Senha (mínimo 6 caracteres)");

    if (erros.length > 0) {
      alert(`❌ Preencha os seguintes campos:\n\n• ${erros.join("\n• ")}`);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.loginEmail, formData.senha);
      const user = userCredential.user;

      const cnpjNumeros = formData.cnpj.replace(/\D/g, "");
      const telefoneNumeros = formData.telefone.replace(/\D/g, "");
      const whatsappNumeros = formData.whatsapp.replace(/\D/g, "");
      const cepNumeros = formData.cep.replace(/\D/g, "");

      await setDoc(doc(db, "estabelecimentos", user.uid), {
        cliente: formData.cliente,
        responsavel: formData.responsavel,
        cnpj: cnpjNumeros,
        cnpjFormatado: formData.cnpj,
        telefone: telefoneNumeros,
        telefoneFormatado: formData.telefone,
        whatsapp: whatsappNumeros,
        whatsappFormatado: formData.whatsapp,

        endereco: {
          cep: cepNumeros,
          cepFormatado: formData.cep,
          rua: formData.rua,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          uf: formData.uf,
          estado: formData.uf,
          completo: `${formData.rua}, ${formData.numero}${formData.complemento ? " - " + formData.complemento : ""} - ${formData.bairro}, ${formData.cidade} - ${formData.uf}, ${formData.cep}`
        },

        loginEmail: formData.loginEmail,
        loginUsuario: formData.loginUsuario || formData.loginEmail.split("@")[0],

        tipoConta: "loja",
        dataCadastro: Timestamp.now(),
        ativo: true,
        ultimaAtualizacao: Timestamp.now()
      });

      alert("✅ Estabelecimento cadastrado com sucesso!");

      setFormData({
        cliente: "",
        cnpj: "",
        telefone: "",
        whatsapp: "",
        responsavel: "",
        cep: "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        loginEmail: "",
        loginUsuario: "",
        senha: ""
      });
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      let errorMessage = "Erro ao cadastrar: ";
      if (error.code === "auth/email-already-in-use") errorMessage = "❌ Este e-mail já está em uso.";
      else if (error.code === "auth/invalid-email") errorMessage = "❌ E-mail inválido.";
      else if (error.code === "auth/weak-password") errorMessage = "❌ Senha muito fraca.";
      else errorMessage += error.message;
      alert(errorMessage);
    }
  };

  const listaFiltrada = useMemo(() => {
    const nome = (filtros.nome || "").trim().toLowerCase();
    const cidade = (filtros.cidade || "").trim().toLowerCase();
    const bairro = (filtros.bairro || "").trim().toLowerCase();

    return (estabelecimentos || []).filter((e) => {
      const eNome = String(e.cliente || "").toLowerCase();
      const eCidade = String(e.endereco?.cidade || "").toLowerCase();
      const eBairro = String(e.endereco?.bairro || "").toLowerCase();

      const okNome = !nome || eNome.includes(nome);
      const okCidade = !cidade || eCidade.includes(cidade);
      const okBairro = !bairro || eBairro.includes(bairro);

      return okNome && okCidade && okBairro;
    });
  }, [estabelecimentos, filtros]);

  // styles (mantive seu padrão)
  const styles = {
    container: { maxWidth: 1250, margin: "0 auto", padding: 20, fontFamily: "Arial, sans-serif" },
    title: { color: "#4FD1C5", marginBottom: 18, fontSize: 26, fontWeight: "bold" },

    card: {
      backgroundColor: "rgba(0, 35, 40, 0.60)",
      border: "1px solid rgba(79, 209, 197, 0.12)",
      borderRadius: 16,
      padding: 20,
      marginBottom: 18
    },

    sectionTitle: { color: "#81E6D9", fontSize: 14, fontWeight: "bold", marginBottom: 14, opacity: 0.95 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 },

    inputGroup: { display: "flex", flexDirection: "column", gap: 7 },
    label: { color: "#81E6D9", fontSize: 13, fontWeight: 600, opacity: 0.9 },

    input: {
      backgroundColor: "rgba(0, 23, 26, 0.80)",
      border: "1px solid rgba(79, 209, 197, 0.18)",
      borderRadius: 12,
      padding: "12px 12px",
      color: "#fff",
      fontSize: 14,
      outline: "none"
    },

    select: {
      backgroundColor: "rgba(0, 23, 26, 0.80)",
      border: "1px solid rgba(79, 209, 197, 0.18)",
      borderRadius: 12,
      padding: "12px 12px",
      color: "#fff",
      fontSize: 14,
      cursor: "pointer",
      outline: "none"
    },

    hint: { color: "#A0AEC0", fontSize: 12, marginTop: 2 },

    row: { display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" },
    grow: { flex: 1, minWidth: 260 },

    btn: {
      backgroundColor: "#4FD1C5",
      color: "#00171A",
      border: "none",
      padding: "12px 16px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: "bold",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },

    btnSoft: {
      backgroundColor: "rgba(79, 209, 197, 0.12)",
      color: "#81E6D9",
      border: "1px solid rgba(79, 209, 197, 0.20)"
    },

    btnDanger: {
      backgroundColor: "rgba(245, 101, 101, 0.12)",
      color: "#F56565",
      border: "1px solid rgba(245, 101, 101, 0.20)"
    },

    btnMini: {
      padding: "9px 12px",
      borderRadius: 12,
      fontWeight: "bold",
      cursor: "pointer",
      border: "1px solid rgba(79, 209, 197, 0.20)",
      background: "rgba(0, 23, 26, 0.70)",
      color: "#81E6D9",
      fontSize: 13
    },

    loading: {
      display: "inline-block",
      width: 16,
      height: 16,
      border: "2px solid rgba(255,255,255,0.20)",
      borderTopColor: "rgba(255,255,255,0.85)",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    },

    listHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
    badge: {
      backgroundColor: "rgba(79, 209, 197, 0.15)",
      border: "1px solid rgba(79, 209, 197, 0.25)",
      color: "#4FD1C5",
      padding: "6px 12px",
      borderRadius: 999,
      fontWeight: "bold",
      fontSize: 13
    },

    tableWrap: { borderRadius: 16, overflow: "hidden", border: "1px solid rgba(79, 209, 197, 0.12)" },
    table: { width: "100%", borderCollapse: "collapse", background: "rgba(0, 23, 26, 0.55)" },

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

    status: (ativo) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      fontWeight: "bold",
      fontSize: 12,
      color: ativo ? "#10B981" : "#F56565",
      background: ativo ? "rgba(16,185,129,0.12)" : "rgba(245,101,101,0.12)",
      border: ativo ? "1px solid rgba(16,185,129,0.20)" : "1px solid rgba(245,101,101,0.20)"
    }),

    // modal
    modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, padding: 16, display: "flex", justifyContent: "center", alignItems: "center" },
    modal: { width: "100%", maxWidth: 980, background: "rgba(0, 23, 26, 0.98)", border: "1px solid rgba(79, 209, 197, 0.20)", borderRadius: 18, padding: 16 },
    modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 },
    modalTitle: { color: "#4FD1C5", fontSize: 18, fontWeight: "bold" },
    modalGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 },
    modalItem: { borderRadius: 14, padding: 12, background: "rgba(0, 35, 40, 0.60)", border: "1px solid rgba(79, 209, 197, 0.12)" },
    modalKey: { color: "#81E6D9", fontSize: 12, opacity: 0.9, marginBottom: 6 },
    modalVal: { color: "#fff", fontSize: 14, wordBreak: "break-word" },

    pill: (ok) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      fontWeight: "bold",
      fontSize: 12,
      color: ok ? "#10B981" : "#F59E0B",
      background: ok ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
      border: ok ? "1px solid rgba(16,185,129,0.20)" : "1px solid rgba(245,158,11,0.20)"
    })
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏢 Gestão de Lojas</h2>

      {/* FORM */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>📋 Cadastro do Estabelecimento</div>

        <form onSubmit={handleCadastrar}>
          <div style={styles.grid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome do Estabelecimento *</label>
              <input style={styles.input} value={formData.cliente} onChange={(e) => setFormData({ ...formData, cliente: e.target.value })} placeholder="Ex: Chiquinho Sorvetes" required />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>CNPJ *</label>
              <input style={styles.input} value={formData.cnpj} onChange={handleCNPJChange} placeholder="00.000.000/0000-00" required maxLength={18} />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Telefone *</label>
              <input style={styles.input} value={formData.telefone} onChange={handleTelefoneChange} placeholder="(11) 9999-9999" required maxLength={15} />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>WhatsApp</label>
              <input style={styles.input} value={formData.whatsapp} onChange={handleWhatsAppChange} placeholder="(11) 9 9999-9999" maxLength={16} />
              <div style={styles.hint}>Opcional</div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Responsável *</label>
              <input style={styles.input} value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} placeholder="Nome do responsável" required />
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div style={styles.sectionTitle}>📍 Endereço</div>
          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, ...styles.grow }}>
              <label style={styles.label}>CEP *</label>
              <input style={styles.input} value={formData.cep} onChange={handleCEPChange} onBlur={buscarCEP} placeholder="00.000-000" required maxLength={10} />
            </div>

            <button type="button" onClick={buscarCEP} style={{ ...styles.btn, ...styles.btnSoft }} disabled={isLoadingCEP}>
              {isLoadingCEP ? <span style={styles.loading} /> : "🔍 Buscar CEP"}
            </button>
          </div>

          <div style={{ height: 10 }} />

          <div style={styles.grid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Rua *</label>
              <input style={styles.input} value={formData.rua} onChange={(e) => setFormData({ ...formData, rua: e.target.value })} placeholder="Nome da rua" required />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Número *</label>
              <input style={styles.input} value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} placeholder="123" required />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Complemento</label>
              <input style={styles.input} value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} placeholder="Ex: Sala 2 / Fundos" />
              <div style={styles.hint}>Opcional</div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Bairro *</label>
              <input style={styles.input} value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} placeholder="Centro" required />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Cidade *</label>
              <input style={styles.input} value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} placeholder="Araraquara" required />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>UF *</label>
              <select style={styles.select} value={formData.uf} onChange={(e) => setFormData({ ...formData, uf: e.target.value })} required>
                <option value="">Selecione...</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div style={styles.sectionTitle}>🔐 Acesso</div>
          <div style={styles.grid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>E-mail para Login *</label>
              <input style={styles.input} type="email" value={formData.loginEmail} onChange={(e) => setFormData({ ...formData, loginEmail: e.target.value })} placeholder="email@empresa.com" required />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome de Usuário</label>
              <input style={styles.input} value={formData.loginUsuario} onChange={(e) => setFormData({ ...formData, loginUsuario: e.target.value })} placeholder="Opcional (antes do @)" />
              <div style={styles.hint}>Se vazio, usa o antes do @</div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Senha * (mín. 6 caracteres)</label>
              <input style={styles.input} type="password" value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} placeholder="••••••" required minLength={6} />
              <div style={styles.hint}>Senha não pode ser exibida depois (Auth não permite). Use “Reset senha”.</div>
            </div>
          </div>

          <div style={{ height: 14 }} />
          <button type="submit" style={styles.btn}>💾 Salvar estabelecimento</button>
        </form>
      </div>

      {/* LISTA */}
      <div style={styles.card}>
        <div style={styles.listHeader}>
          <div style={{ color: "#4FD1C5", fontSize: 20, fontWeight: "bold" }}>📋 Estabelecimentos cadastrados</div>
          <div style={styles.badge}>{listaFiltrada.length} estabelecimentos</div>
        </div>

        {/* filtros */}
        <div style={{ ...styles.card, padding: 16, marginBottom: 14 }}>
          <div style={{ ...styles.sectionTitle, marginBottom: 10 }}>🔎 Filtros</div>
          <div style={styles.grid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome</label>
              <input style={styles.input} value={filtros.nome} onChange={(e) => setFiltros((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Chiquinho" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Cidade</label>
              <input style={styles.input} value={filtros.cidade} onChange={(e) => setFiltros((p) => ({ ...p, cidade: e.target.value }))} placeholder="Ex: Araraquara" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Bairro</label>
              <input style={styles.input} value={filtros.bairro} onChange={(e) => setFiltros((p) => ({ ...p, bairro: e.target.value }))} placeholder="Ex: Centro" />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button type="button" style={{ ...styles.btn, ...styles.btnSoft }} onClick={() => setFiltros({ nome: "", cidade: "", bairro: "" })}>
              Limpar filtros
            </button>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Estabelecimento</th>
                <th style={styles.th}>Cidade / UF</th>
                <th style={styles.th}>Acesso</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Cadastro</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {isLoadingList ? (
                <tr>
                  <td colSpan="6" style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.loading} /> <span style={{ marginLeft: 10, color: "#4FD1C5", fontWeight: "bold" }}>Carregando...</span>
                  </td>
                </tr>
              ) : listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ ...styles.td, textAlign: "center", color: "#A0AEC0" }}>
                    Nenhum estabelecimento encontrado
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((est) => (
                  <tr key={est.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{est.cliente}</div>
                      <div style={styles.sub}>
                        {est.responsavel ? `Resp.: ${est.responsavel}` : "—"} • {est.telefoneFormatado || "—"}
                      </div>
                      <div style={styles.sub}>{est.cnpjFormatado || "—"}</div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{est.endereco?.cidade || "—"}</div>
                      <div style={styles.sub}>
                        {est.endereco?.uf || est.endereco?.estado || "—"} • {est.endereco?.bairro || "—"}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{est.loginEmail || "—"}</div>
                      <div style={styles.sub}>Usuário: {est.loginUsuario || "—"}</div>
                      <div style={{ marginTop: 10 }}>
                        <button type="button" style={styles.btnMini} onClick={() => enviarResetSenha(est.loginEmail)}>
                          🔐 Reset senha
                        </button>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.status(!!est.ativo)}>
                        {est.ativo ? "✅ Ativo" : "⛔ Inativo"}
                      </span>
                    </td>

                    <td style={styles.td}>{formatarData(est.dataCadastro)}</td>

                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" style={styles.btnMini} onClick={() => abrirModal(est)}>
                          👁 Ver
                        </button>

                        <button
                          type="button"
                          style={{ ...styles.btnMini, ...(est.ativo ? styles.btnDanger : styles.btnSoft) }}
                          onClick={() => toggleAtivo(est)}
                        >
                          {est.ativo ? "⛔ Inativar" : "✅ Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && selectedEst && (
        <div style={styles.modalOverlay} onClick={fecharModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>📄 Cadastro completo — {selectedEst.cliente}</div>
              <button type="button" style={styles.btnMini} onClick={fecharModal}>
                Fechar
              </button>
            </div>

            {/* cadastro (firestore) */}
            <div style={styles.modalGrid}>
              <div style={styles.modalItem}>
                <div style={styles.modalKey}>UID (Auth / Doc)</div>
                <div style={styles.modalVal}>{selectedEst.id}</div>
              </div>

              <div style={styles.modalItem}>
                <div style={styles.modalKey}>E-mail / Usuário</div>
                <div style={styles.modalVal}>
                  {selectedEst.loginEmail || "-"}
                  <div style={{ color: "#A0AEC0", fontSize: 12, marginTop: 6 }}>
                    Usuário: {selectedEst.loginUsuario || "-"}
                  </div>
                </div>
              </div>

              <div style={styles.modalItem}>
                <div style={styles.modalKey}>Responsável</div>
                <div style={styles.modalVal}>{selectedEst.responsavel || "-"}</div>
              </div>

              <div style={styles.modalItem}>
                <div style={styles.modalKey}>CNPJ</div>
                <div style={styles.modalVal}>{selectedEst.cnpjFormatado || "-"}</div>
              </div>

              <div style={styles.modalItem}>
                <div style={styles.modalKey}>Telefone</div>
                <div style={styles.modalVal}>{selectedEst.telefoneFormatado || "-"}</div>
              </div>

              <div style={styles.modalItem}>
                <div style={styles.modalKey}>WhatsApp</div>
                <div style={styles.modalVal}>{selectedEst.whatsappFormatado || "-"}</div>
              </div>

              <div style={styles.modalItem}>
                <div style={styles.modalKey}>Endereço</div>
                <div style={styles.modalVal}>
                  {selectedEst.endereco?.completo ||
                    `${selectedEst.endereco?.rua || ""}, ${selectedEst.endereco?.numero || ""}${
                      selectedEst.endereco?.complemento ? " - " + selectedEst.endereco?.complemento : ""
                    } - ${selectedEst.endereco?.bairro || ""}, ${selectedEst.endereco?.cidade || ""} - ${
                      selectedEst.endereco?.uf || selectedEst.endereco?.estado || ""
                    }, ${selectedEst.endereco?.cepFormatado || selectedEst.endereco?.cep || ""}`}
                </div>
              </div>
            </div>

            {/* auth info */}
            <div style={{ ...styles.card, marginTop: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ color: "#81E6D9", fontWeight: "bold" }}>🔐 Dados do Authentication</div>

                <button
                  type="button"
                  style={{ ...styles.btnMini, borderColor: "rgba(79, 209, 197, 0.35)" }}
                  onClick={() => carregarAuthInfo(selectedEst.id)}
                  disabled={authLoading}
                >
                  {authLoading ? "Carregando..." : "Atualizar"}
                </button>
              </div>

              {authLoading ? (
                <div style={{ marginTop: 10, color: "#A0AEC0" }}>
                  <span style={styles.loading} /> <span style={{ marginLeft: 8 }}>Buscando dados do Auth...</span>
                </div>
              ) : authInfo ? (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                  <div style={styles.modalItem}>
                    <div style={styles.modalKey}>Criado em</div>
                    <div style={styles.modalVal}>{formatarDataHora(authInfo.creationTime)}</div>
                  </div>

                  <div style={styles.modalItem}>
                    <div style={styles.modalKey}>Último login</div>
                    <div style={styles.modalVal}>
                      {authInfo.lastSignInTime ? (
                        formatarDataHora(authInfo.lastSignInTime)
                      ) : (
                        <span style={styles.pill(false)}>⚠️ Nunca logou</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.modalItem}>
                    <div style={styles.modalKey}>Status no Auth</div>
                    <div style={styles.modalVal}>
                      {authInfo.disabled ? <span style={styles.pill(false)}>⛔ Bloqueado</span> : <span style={styles.pill(true)}>✅ Liberado</span>}
                    </div>
                  </div>

                  <div style={styles.modalItem}>
                    <div style={styles.modalKey}>Provedor</div>
                    <div style={styles.modalVal}>
                      {(authInfo.providerData || []).length > 0
                        ? authInfo.providerData.map((p) => p.providerId).join(", ")
                        : "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, color: "#A0AEC0" }}>
                  Não foi possível carregar o Authentication (confira Functions e permissão admin).
                </div>
              )}

              {/* ações auth */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  style={{ ...styles.btnMini }}
                  onClick={() => enviarResetSenha(selectedEst.loginEmail)}
                >
                  🔐 Enviar reset por e-mail
                </button>

                <button
                  type="button"
                  style={{ ...styles.btnMini, ...(authInfo?.disabled ? styles.btnSoft : styles.btnDanger) }}
                  onClick={() => toggleDisableAuth(selectedEst.id)}
                  disabled={disableLoading || !authInfo}
                >
                  {disableLoading ? "Aguarde..." : authInfo?.disabled ? "✅ Desbloquear login" : "⛔ Bloquear login"}
                </button>
              </div>

              {/* definir senha */}
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ color: "#81E6D9", fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>
                    Definir senha (admin)
                  </div>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nova senha (mín. 6)"
                    value={novaSenhaAdmin}
                    onChange={(e) => setNovaSenhaAdmin(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  style={{ ...styles.btn, padding: "12px 14px" }}
                  onClick={() => definirSenhaAdmin(selectedEst.id)}
                  disabled={senhaLoading}
                >
                  {senhaLoading ? "Salvando..." : "✅ Definir senha"}
                </button>
              </div>

              <div style={{ marginTop: 8, color: "#A0AEC0", fontSize: 12 }}>
                * Mostrar senha antiga é impossível no Firebase. O correto é reset por e-mail ou definir uma nova senha via admin.
              </div>
            </div>

            {/* ações firestore */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button
                type="button"
                style={{ ...styles.btn, ...(selectedEst.ativo ? styles.btnDanger : styles.btnSoft) }}
                onClick={async () => {
                  await toggleAtivo(selectedEst);
                  fecharModal();
                }}
              >
                {selectedEst.ativo ? "⛔ Inativar no cadastro" : "✅ Ativar no cadastro"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #4FD1C5 !important; }
        tr:hover { background: rgba(79, 209, 197, 0.05); }
      `}</style>
    </div>
  );
};

export default Lojas;
