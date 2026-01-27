// TaxaEntrega.jsx (POR BAIRRO) — cole e substitua o arquivo todo
import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, Save, Search } from 'lucide-react';

// helpers
const normalizeBairro = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos

const moneyToNumber = (v) => {
  const n = Number(String(v ?? '').replace('.', '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TaxaEntrega = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(false);
  const [bairros, setBairros] = useState([]); // [{ nome, valor }]
  const [novoBairro, setNovoBairro] = useState({ nome: '', valor: '' });
  const [busca, setBusca] = useState('');

  // 1) Carregar config do Firebase
  useEffect(() => {
    if (!user?.uid) return;

    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'entrega');
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data() || {};
          // compat: se existir faixas antigas, não usamos mais
          const lista = Array.isArray(data.bairros) ? data.bairros : [];
          setBairros(
            lista
              .filter((b) => b?.nome)
              .map((b) => ({
                nome: String(b.nome).trim(),
                valor: Number(b.valor ?? 0),
              }))
              .sort((a, b) => a.nome.localeCompare(b.nome))
          );
        }
      } catch (e) {
        console.error('Erro ao carregar entrega:', e);
      }
    };

    fetchConfig();
  }, [user]);

  const bairrosFiltrados = useMemo(() => {
    const q = normalizeBairro(busca);
    if (!q) return bairros;
    return bairros.filter((b) => normalizeBairro(b.nome).includes(q));
  }, [bairros, busca]);

  const existeBairro = (nome) => {
    const key = normalizeBairro(nome);
    return bairros.some((b) => normalizeBairro(b.nome) === key);
  };

  const adicionarBairro = () => {
    const nome = String(novoBairro.nome || '').trim();
    const valor = moneyToNumber(novoBairro.valor);

    if (!nome) return alert('Informe o nome do bairro.');
    if (valor < 0) return alert('Valor inválido.');
    if (existeBairro(nome)) return alert('Esse bairro já foi cadastrado.');

    const lista = [...bairros, { nome, valor }].sort((a, b) => a.nome.localeCompare(b.nome));
    setBairros(lista);
    setNovoBairro({ nome: '', valor: '' });
  };

  const removerBairro = (idx) => {
    setBairros((prev) => prev.filter((_, i) => i !== idx));
  };

  const editarValor = (idx, valorStr) => {
    const valor = moneyToNumber(valorStr);
    setBairros((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, valor } : b))
    );
  };

  // 2) Salvar no Firebase
  const salvarConfiguracoes = async () => {
    if (!user?.uid) {
      alert('Erro: Usuário não identificado. Atualize a página e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'entrega');

      const payload = {
        modo: 'bairro',
        bairros: bairros.map((b) => ({
          nome: String(b.nome).trim(),
          valor: Number(b.valor ?? 0),
          chave: normalizeBairro(b.nome), // ajuda na busca do painel-cliente
        })),
        atualizadoEm: serverTimestamp(),
      };

      await setDoc(docRef, payload, { merge: true });
      alert('✅ Taxas por bairro salvas com sucesso!');
    } catch (e) {
      console.error('ERRO AO SALVAR NO FIREBASE:', e);
      alert('Erro técnico: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: { display: 'flex', flexDirection: 'column', gap: 16 },
    header: { marginBottom: 8 },
    card: {
      backgroundColor: 'rgba(0, 30, 35, 0.9)',
      padding: 18,
      borderRadius: 12,
      border: '1px solid #4FD1C544',
    },
    label: { color: '#81E6D9', fontSize: 13, marginBottom: 6, display: 'block' },
    input: {
      backgroundColor: '#001a1e',
      border: '1px solid #4FD1C566',
      borderRadius: 8,
      padding: '12px',
      color: '#fff',
      width: '100%',
      outline: 'none',
    },
    btn: {
      backgroundColor: '#4FD1C5',
      color: '#00171A',
      border: 'none',
      padding: '12px 14px',
      borderRadius: 10,
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
    },
    btnGhost: {
      backgroundColor: 'transparent',
      color: '#81E6D9',
      border: '1px solid #4FD1C544',
      padding: '12px 14px',
      borderRadius: 10,
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
    },
    danger: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: '#F56565',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.6fr auto',
      gap: 10,
      alignItems: 'end',
    },
    tableHeader: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 120px 44px' : '1fr 160px 44px',
      gap: 10,
      padding: '10px 10px',
      color: '#81E6D9',
      opacity: 0.9,
      fontSize: 12,
      borderBottom: '1px solid #ffffff11',
      marginTop: 8,
    },
    row: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 120px 44px' : '1fr 160px 44px',
      gap: 10,
      padding: '10px 10px',
      alignItems: 'center',
      borderBottom: '1px solid #ffffff11',
      color: '#fff',
    },
    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      backgroundColor: 'rgba(79, 209, 197, 0.10)',
      border: '1px solid #4FD1C544',
      color: '#81E6D9',
      fontSize: 12,
      gap: 8,
      width: 'fit-content',
    },
    topActions: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 10,
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
    },
    searchWrap: { position: 'relative', flex: 1 },
    searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.7 },
    searchInput: { paddingLeft: 40 },
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={{ color: '#4FD1C5', fontSize: 24, margin: 0 }}>🚚 Taxa de Entrega por Bairro</h1>
          <p style={{ color: '#81E6D9', opacity: 0.85, marginTop: 6 }}>
            Cadastre os bairros atendidos e o valor. (Mapa/KM removidos)
          </p>
        </header>

        {/* Cadastro */}
        <div style={styles.card}>
          <div style={{ ...styles.topActions, marginBottom: 12 }}>
            <div style={styles.chip}>
              <span>Modo:</span>
              <strong>BAIRRO</strong>
            </div>

            <div style={styles.searchWrap}>
              <Search size={16} style={styles.searchIcon} />
              <input
                style={{ ...styles.input, ...styles.searchInput }}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar bairro..."
              />
            </div>
          </div>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Bairro</label>
              <input
                style={styles.input}
                value={novoBairro.nome}
                onChange={(e) => setNovoBairro((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Centro, Jardim Paulista, Vila Xavier..."
              />
            </div>

            <div>
              <label style={styles.label}>Valor (R$)</label>
              <input
                style={styles.input}
                value={novoBairro.valor}
                onChange={(e) => setNovoBairro((p) => ({ ...p, valor: e.target.value }))}
                placeholder="Ex: 5,00"
              />
            </div>

            <button onClick={adicionarBairro} style={styles.btn} title="Adicionar">
              <Plus size={18} /> {isMobile ? 'Adicionar' : ''}
            </button>
          </div>

          {/* Lista */}
          <div style={styles.tableHeader}>
            <span>Bairro</span>
            <span>Taxa</span>
            <span />
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, overflow: 'hidden' }}>
            {bairrosFiltrados.length === 0 ? (
              <div style={{ padding: 14, color: '#81E6D9', opacity: 0.85 }}>
                Nenhum bairro cadastrado{busca ? ' para essa busca' : ''}.
              </div>
            ) : (
              bairrosFiltrados.map((b, i) => {
                // atenção: como estamos mostrando filtrado, precisamos achar o índice real
                const realIndex = bairros.findIndex((x) => normalizeBairro(x.nome) === normalizeBairro(b.nome));
                return (
                  <div key={b.nome} style={styles.row}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong style={{ color: '#fff' }}>{b.nome}</strong>
                      <span style={{ color: '#81E6D9', opacity: 0.75, fontSize: 12 }}>
                        chave: {normalizeBairro(b.nome)}
                      </span>
                    </div>

                    <input
                      style={styles.input}
                      value={String(bairros[realIndex]?.valor ?? 0).replace('.', ',')}
                      onChange={(e) => editarValor(realIndex, e.target.value)}
                    />

                    <button onClick={() => removerBairro(realIndex)} style={styles.danger} title="Remover">
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexDirection: isMobile ? 'column' : 'row' }}>
            <button onClick={salvarConfiguracoes} disabled={loading} style={styles.btn}>
              <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Taxas'}
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('Tem certeza que deseja limpar todos os bairros?')) setBairros([]);
              }}
              style={styles.btnGhost}
            >
              Limpar lista
            </button>
          </div>

          <div style={{ marginTop: 10, color: '#81E6D9', opacity: 0.75, fontSize: 12 }}>
            Dica: no painel-cliente, você pode comparar o bairro do endereço do cliente com <strong>chave</strong> (sem acento).
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TaxaEntrega;
