// Cadastro.jsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  UserCheck,
  MapPin,
  Shield,
  Phone,
  User,
  Navigation,
} from "lucide-react";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const Cadastro = ({
  onVoltar,
  onContinuar,
  dadosCliente: dadosIniciais,
  modoCheckout = false,
}) => {
  const [buscandoTelefone, setBuscandoTelefone] = useState(false);
  const [cadastroEncontrado, setCadastroEncontrado] = useState(false);
  const [autoLogando, setAutoLogando] = useState(false);

  const [clienteIdNoBanco, setClienteIdNoBanco] = useState(null);
  const [etapa, setEtapa] = useState("dados"); // 'dados' | 'endereco'
  const [validandoCEP, setValidandoCEP] = useState(false);
  const [sugestoesEndereco, setSugestoesEndereco] = useState([]);

  const [dados, setDados] = useState({
    nomeCompleto: dadosIniciais?.nomeCompleto || "",
    email: dadosIniciais?.email || "",
    rua: dadosIniciais?.rua || "",
    numero: dadosIniciais?.numero || "",
    bairro: dadosIniciais?.bairro || "",
    cidade: dadosIniciais?.cidade || "Araraquara",
    estado: dadosIniciais?.estado || "SP",
    cep: dadosIniciais?.cep || "",
    telefone: dadosIniciais?.telefone || "",
    complemento: dadosIniciais?.complemento || "",
    referencia: dadosIniciais?.referencia || "",
  });

  // ===== Helpers =====
  const limparTelefone = (v) => String(v || "").replace(/\D/g, "").slice(0, 11);

  const formatarTelefone = (valor) => {
    const limpo = limparTelefone(valor);
    if (limpo.length <= 10) {
      return limpo
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .slice(0, 14);
    }
    return limpo
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  const formatarCEP = (valor) => {
    const limpo = String(valor || "").replace(/\D/g, "").slice(0, 8);
    return limpo.replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
  };

  const handleTelefoneChange = (e) => {
    const valorFormatado = formatarTelefone(e.target.value);
    setDados((prev) => ({ ...prev, telefone: valorFormatado }));
  };

  const handleCEPChange = (e) => {
    const valorFormatado = formatarCEP(e.target.value);
    setDados((prev) => ({ ...prev, cep: valorFormatado }));

    if (valorFormatado.replace(/\D/g, "").length === 8) {
      buscarCEP(valorFormatado);
    }
  };

  const buscarCEP = async (cep) => {
    const cepLimpo = String(cep || "").replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setValidandoCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const endereco = await response.json();

      if (!endereco.erro) {
        setDados((prev) => ({
          ...prev,
          rua: endereco.logradouro || "",
          bairro: endereco.bairro || "",
          cidade: endereco.localidade || "Araraquara",
          estado: endereco.uf || "SP",
        }));

        setSugestoesEndereco([
          `${endereco.logradouro}, ${endereco.bairro}`,
          `Próximo a ${endereco.bairro}`,
          `Centro de ${endereco.localidade}`,
        ]);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setValidandoCEP(false);
    }
  };

  const temEnderecoMinimo = (d) =>
    Boolean(String(d?.rua || "").trim()) &&
    Boolean(String(d?.numero || "").trim()) &&
    Boolean(String(d?.bairro || "").trim());

  const temDadosMinimos = (d) =>
    Boolean(String(d?.nomeCompleto || "").trim()) &&
    /^\d{10,11}$/.test(limparTelefone(d?.telefone));

  const autoLoginSePossivel = (dadosEncontrados) => {
    const tel = limparTelefone(dadosEncontrados?.telefone);
    const pronto =
      temDadosMinimos({ ...dadosEncontrados, telefone: tel }) &&
      (!modoCheckout || temEnderecoMinimo(dadosEncontrados));

    if (pronto) {
      const payloadLocal = { ...dadosEncontrados, telefone: tel };
      localStorage.setItem("dadosCliente", JSON.stringify(payloadLocal));
      setAutoLogando(true);

      onContinuar(payloadLocal);

      setTimeout(() => setAutoLogando(false), 1200);
      return true;
    }

    // Se estiver no checkout e tiver dados mínimos mas faltar endereço, vai para etapa endereço
    if (
      modoCheckout &&
      temDadosMinimos({ ...dadosEncontrados, telefone: tel }) &&
      !temEnderecoMinimo(dadosEncontrados)
    ) {
      setEtapa("endereco");
    }

    return false;
  };

  // ✅ status do telefone
  const telLimpoAtual = limparTelefone(dados.telefone);
  const telefoneValido = /^\d{10,11}$/.test(telLimpoAtual);

  // Busca no banco quando telefone fica válido
  useEffect(() => {
    if (telLimpoAtual.length >= 10) {
      const delay = setTimeout(() => buscarCadastro(telLimpoAtual), 700);
      return () => clearTimeout(delay);
    } else {
      setClienteIdNoBanco(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados.telefone]);

  // ✅ BUSCAR CADASTRO (corrigido)
  const buscarCadastro = async (telLimpo) => {
    if (!/^\d{10,11}$/.test(telLimpo)) return;

    setBuscandoTelefone(true);
    try {
      const q = query(
        collection(db, "clientes"),
        where("telefone", "==", telLimpo),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const dadosDB = docSnap.data() || {};

        // ✅ FIX 1: NÃO sobrescrever dados do banco com campos vazios do state
        // Prioridade: state (o que o usuário já digitou) -> banco por cima (verdade) -> telefone formatado
        const merged = {
          ...dados,
          ...dadosDB,
          telefone: formatarTelefone(telLimpo),
        };

        setClienteIdNoBanco(docSnap.id);
        setDados(merged);

        setCadastroEncontrado(true);
        setTimeout(() => setCadastroEncontrado(false), 4000);

        // ✅ FIX 2: tenta auto-login SEMPRE (checkout ou não)
        const logou = autoLoginSePossivel({ ...merged, telefone: telLimpo });

        // Se não logou, abre pra edição (normalmente endereço)
        if (!logou) {
          setEtapa("endereco");
        }
      } else {
        setClienteIdNoBanco(null);
      }
    } catch (e) {
      console.error("Erro ao buscar cadastro:", e);
    } finally {
      setBuscandoTelefone(false);
    }
  };

  const validarDados = () => {
    const erros = [];
    const telLimpo = limparTelefone(dados.telefone);

    if (!String(dados.nomeCompleto || "").trim())
      erros.push("Nome completo é obrigatório");
    if (!/^\d{10,11}$/.test(telLimpo)) erros.push("Telefone inválido");
    if (!String(dados.rua || "").trim()) erros.push("Rua é obrigatória");
    if (!String(dados.numero || "").trim()) erros.push("Número é obrigatório");
    if (!String(dados.bairro || "").trim()) erros.push("Bairro é obrigatório");

    return erros;
  };

  const handleFinalizar = async () => {
    const erros = validarDados();
    if (erros.length > 0) {
      alert(
        `Por favor, corrija os seguintes erros:\n\n• ${erros.join("\n• ")}`
      );
      return;
    }

    try {
      const telLimpo = limparTelefone(dados.telefone);

      const payloadCliente = {
        ...dados,
        telefone: telLimpo,
        ultimaAtualizacao: serverTimestamp(),
        enderecoCompleto: `${dados.rua}, ${dados.numero} - ${dados.bairro}, ${dados.cidade} - ${dados.estado}`,
        tipoCliente: "consumidor",
        status: "ativo",
      };

      if (clienteIdNoBanco) {
        await updateDoc(doc(db, "clientes", clienteIdNoBanco), payloadCliente);
      } else {
        await addDoc(collection(db, "clientes"), {
          ...payloadCliente,
          dataCriacao: serverTimestamp(),
        });
      }

      localStorage.setItem("dadosCliente", JSON.stringify(payloadCliente));
      onContinuar(payloadCliente);
    } catch (error) {
      console.error("Erro ao processar cadastro:", error);
      alert("Erro ao salvar cadastro. Por favor, tente novamente.");
    }
  };

  // ====== STYLES (mantive os seus) ======
  const styles = {
    container: {
      backgroundColor: "#F8FAFC",
      minHeight: "100vh",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    header: {
      backgroundColor: "#0F3460",
      padding: "20px",
      color: "white",
      display: "flex",
      alignItems: "center",
      gap: "15px",
      borderBottomLeftRadius: "24px",
      borderBottomRightRadius: "24px",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    content: {
      padding: "20px",
      maxWidth: "600px",
      margin: "0 auto",
      paddingBottom: "40px",
    },
    form: {
      backgroundColor: "white",
      padding: "30px",
      borderRadius: "24px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
      border: "1px solid #E2E8F0",
    },
    sectionTitle: {
      fontSize: "15px",
      fontWeight: "800",
      color: "#0F3460",
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      paddingBottom: "10px",
      borderBottom: "2px solid #F1F5F9",
    },
    inputGroup: {
      marginBottom: "20px",
      position: "relative",
    },
    label: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "8px",
      fontSize: "14px",
      fontWeight: "700",
      color: "#4A5568",
    },
    input: {
      width: "100%",
      padding: "16px 20px",
      borderRadius: "14px",
      border: "2px solid #E2E8F0",
      fontSize: "16px",
      outline: "none",
      boxSizing: "border-box",
      transition: "all 0.2s ease",
      backgroundColor: "#F8FAFC",
    },
    btn: {
      width: "100%",
      padding: "18px",
      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      color: "white",
      border: "none",
      borderRadius: "14px",
      fontWeight: "800",
      fontSize: "16px",
      cursor: "pointer",
      marginTop: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
      opacity: 1,
    },
    btnSecundario: {
      width: "100%",
      padding: "16px",
      backgroundColor: "transparent",
      color: "#0F3460",
      border: "2px solid #E2E8F0",
      borderRadius: "14px",
      fontWeight: "700",
      fontSize: "16px",
      cursor: "pointer",
      marginTop: "15px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      transition: "all 0.2s ease",
    },
    stepIndicator: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "30px",
      marginBottom: "30px",
      paddingBottom: "20px",
      borderBottom: "1px solid #E2E8F0",
    },
    step: () => ({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    }),
    stepCircle: (ativo, concluido) => ({
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "900",
      fontSize: "16px",
      transition: "all 0.3s ease",
      background: concluido ? "#10B981" : ativo ? "#0F3460" : "#E2E8F0",
      color: concluido || ativo ? "white" : "#94A3B8",
      border: `2px solid ${
        concluido ? "#10B981" : ativo ? "#0F3460" : "#E2E8F0"
      }`,
    }),
    stepLabel: (ativo, concluido) => ({
      fontSize: "12px",
      fontWeight: "700",
      color: concluido ? "#10B981" : ativo ? "#0F3460" : "#94A3B8",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    }),
    sugestoesContainer: {
      marginTop: "10px",
      padding: "15px",
      background: "#F8FAFC",
      borderRadius: "12px",
      border: "1px solid #E2E8F0",
    },
    sugestaoItem: {
      padding: "8px 12px",
      marginBottom: "6px",
      background: "white",
      borderRadius: "8px",
      border: "1px solid #E2E8F0",
      fontSize: "13px",
      color: "#4A5568",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    infoBox: {
      padding: "15px",
      background: "linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)",
      borderRadius: "12px",
      border: "1px solid #A7F3D0",
      marginBottom: "20px",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
    },
    infoIcon: { flexShrink: 0, color: "#059669" },
    infoContent: { flex: 1 },
    infoTitle: {
      fontWeight: "800",
      color: "#065F46",
      marginBottom: "4px",
      fontSize: "14px",
    },
    infoText: { fontSize: "13px", color: "#047857", lineHeight: "1.5" },
  };

  const renderEtapaDados = () => (
    <>
      <div style={styles.infoBox}>
        <div style={styles.infoIcon}>
          <Shield size={20} />
        </div>
        <div style={styles.infoContent}>
          <div style={styles.infoTitle}>Login por telefone</div>
          <div style={styles.infoText}>
            Digite seu telefone primeiro. Se já existir cadastro, nós preenchemos
            automaticamente.
            {modoCheckout
              ? " No checkout, você entra automaticamente se estiver completo."
              : " Fora do checkout, entra automaticamente se estiver completo; se faltar algo, abrimos para editar."}
          </div>
        </div>
      </div>

      <div style={styles.sectionTitle}>
        <UserCheck size={18} /> SEUS DADOS PESSOAIS
      </div>

      {/* ✅ TELEFONE PRIMEIRO */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>
          <Phone size={16} />
          Telefone Celular *
          {(buscandoTelefone || autoLogando) && (
            <Loader2
              size={16}
              style={{
                animation: "spin 1s linear infinite",
                color: "#10B981",
              }}
            />
          )}
        </label>

        <input
          type="tel"
          value={dados.telefone}
          onChange={handleTelefoneChange}
          placeholder="(16) 99999-9999"
          style={styles.input}
        />

        {cadastroEncontrado && (
          <div
            style={{
              marginTop: "8px",
              padding: "10px",
              backgroundColor: "#F0FDF4",
              color: "#166534",
              borderRadius: "8px",
              fontSize: "13px",
              border: "1px solid #BBF7D0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Shield size={14} />
            Cadastro encontrado!{" "}
            {modoCheckout
              ? "Entrando automaticamente (se estiver completo)..."
              : "Entrando automaticamente (se estiver completo) ou abrindo para edição..."}
          </div>
        )}
      </div>

      {/* ✅ NOME DEPOIS (só habilita com telefone válido) */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>
          <User size={16} /> Nome Completo *
        </label>
        <input
          type="text"
          value={dados.nomeCompleto}
          onChange={(e) =>
            setDados((prev) => ({ ...prev, nomeCompleto: e.target.value }))
          }
          placeholder={telefoneValido ? "Ex: Rafael de Sousa" : "Digite o telefone primeiro"}
          style={{
            ...styles.input,
            opacity: telefoneValido ? 1 : 0.6,
            cursor: telefoneValido ? "text" : "not-allowed",
          }}
          disabled={!telefoneValido || buscandoTelefone || autoLogando}
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>📧 E-mail (opcional)</label>
        <input
          type="email"
          value={dados.email}
          onChange={(e) => setDados((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="seu@email.com"
          style={styles.input}
        />
      </div>

      <button
        onClick={() => setEtapa("endereco")}
        disabled={!telefoneValido || !String(dados.nomeCompleto || "").trim()}
        style={{
          ...styles.btn,
          opacity:
            !telefoneValido || !String(dados.nomeCompleto || "").trim() ? 0.6 : 1,
          cursor:
            !telefoneValido || !String(dados.nomeCompleto || "").trim()
              ? "not-allowed"
              : "pointer",
        }}
      >
        Continuar para Endereço
        <ArrowLeft size={20} style={{ transform: "rotate(180deg)" }} />
      </button>
    </>
  );

  const renderEtapaEndereco = () => (
    <>
      <div style={styles.sectionTitle}>
        <MapPin size={18} /> ENDEREÇO DE ENTREGA
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>
          📍 CEP
          {validandoCEP && (
            <Loader2
              size={14}
              style={{
                animation: "spin 1s linear infinite",
                color: "#10B981",
              }}
            />
          )}
        </label>
        <input
          type="text"
          value={dados.cep}
          onChange={handleCEPChange}
          placeholder="14802-500"
          style={styles.input}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "15px" }}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Navigation size={16} /> Rua/Avenida *
          </label>
          <input
            type="text"
            value={dados.rua}
            onChange={(e) => setDados((prev) => ({ ...prev, rua: e.target.value }))}
            style={styles.input}
            placeholder="Rua..."
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}># Número *</label>
          <input
            type="text"
            value={dados.numero}
            onChange={(e) => setDados((prev) => ({ ...prev, numero: e.target.value }))}
            style={styles.input}
            placeholder="123"
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>🏘️ Bairro *</label>
          <input
            type="text"
            value={dados.bairro}
            onChange={(e) => setDados((prev) => ({ ...prev, bairro: e.target.value }))}
            style={styles.input}
            placeholder="Bairro..."
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>🏙️ Cidade *</label>
          <input
            type="text"
            value={dados.cidade}
            onChange={(e) => setDados((prev) => ({ ...prev, cidade: e.target.value }))}
            style={styles.input}
            placeholder="Cidade..."
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>📍 Estado</label>
          <select
            value={dados.estado}
            onChange={(e) => setDados((prev) => ({ ...prev, estado: e.target.value }))}
            style={styles.input}
          >
            <option value="SP">São Paulo (SP)</option>
            <option value="MG">Minas Gerais (MG)</option>
            <option value="RJ">Rio de Janeiro (RJ)</option>
            <option value="ES">Espírito Santo (ES)</option>
          </select>
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>🏠 Complemento</label>
          <input
            type="text"
            value={dados.complemento}
            onChange={(e) =>
              setDados((prev) => ({ ...prev, complemento: e.target.value }))
            }
            style={styles.input}
            placeholder="Apto, bloco, etc..."
          />
        </div>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>🎯 Ponto de Referência</label>
        <input
          type="text"
          value={dados.referencia}
          onChange={(e) =>
            setDados((prev) => ({ ...prev, referencia: e.target.value }))
          }
          style={styles.input}
          placeholder="Próximo ao mercado, farmácia..."
        />
      </div>

      {sugestoesEndereco.length > 0 && (
        <div style={styles.sugestoesContainer}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#4A5568",
              marginBottom: "10px",
            }}
          >
            Sugestões baseadas no CEP:
          </div>
          {sugestoesEndereco.map((sugestao, index) => (
            <div
              key={index}
              style={styles.sugestaoItem}
              onClick={() => {
                if (index === 0) {
                  const [rua, bairro] = sugestao.split(", ");
                  setDados((prev) => ({
                    ...prev,
                    rua: rua || "",
                    bairro: bairro || "",
                  }));
                }
              }}
            >
              {sugestao}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
        <button onClick={() => setEtapa("dados")} style={styles.btnSecundario}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <button onClick={handleFinalizar} style={styles.btn}>
          <Shield size={18} />
          {modoCheckout ? "Finalizar Cadastro" : "Salvar Cadastro"}
        </button>
      </div>
    </>
  );

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
        select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 15px center;
          background-size: 16px;
          padding-right: 40px;
        }
      `}</style>

      <header style={styles.header}>
        <ArrowLeft onClick={onVoltar} style={{ cursor: "pointer" }} />
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", flex: 1 }}>
          {modoCheckout ? "Checkout - Cadastro" : "Cadastro do Cliente"}
        </h2>
        <div
          style={{
            padding: "6px 12px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "700",
          }}
        >
          {etapa === "dados" ? "1/2" : "2/2"}
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.stepIndicator}>
          <div style={styles.step()} onClick={() => setEtapa("dados")}>
            <div style={styles.stepCircle(true, etapa === "endereco")}>1</div>
            <div style={styles.stepLabel(true, etapa === "endereco")}>Dados</div>
          </div>

          <div
            style={styles.step()}
            onClick={() => {
              if (
                String(dados.nomeCompleto || "").trim() &&
                /^\d{10,11}$/.test(limparTelefone(dados.telefone))
              ) {
                setEtapa("endereco");
              }
            }}
          >
            <div style={styles.stepCircle(etapa === "endereco", false)}>2</div>
            <div style={styles.stepLabel(etapa === "endereco", false)}>
              Endereço
            </div>
          </div>
        </div>

        <div style={styles.form}>
          {etapa === "dados" ? renderEtapaDados() : renderEtapaEndereco()}
        </div>

        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            background: "#F8FAFC",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <Shield size={18} color="#10B981" />
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#0F3460" }}>
              Por que cadastrar?
            </div>
          </div>
          <div style={{ fontSize: "13px", color: "#64748B", lineHeight: "1.6" }}>
            • Entrega mais rápida • Histórico de pedidos • Ofertas exclusivas • Facilidade nas próximas compras
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;
