// HookCardapio.jsx
import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
    };
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  return { isMobile, isTablet };
}

export const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const brl = (v) => {
  const num = toNumber(v);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export function normalizarGruposProduto(item) {
  if (!item) return [];

  if (Array.isArray(item.gruposOpcoes) && item.gruposOpcoes.length > 0) {
    return item.gruposOpcoes.map((g, idx) => ({
      id: g.id || `${item.id || "prod"}_grupo_${idx}`,
      nomeGrupo: g.nomeGrupo || g.tituloGrupo || g.grupoNome || "Opções",
      qtdMinima: Number(g.qtdMinima ?? 0),
      qtdMaxima: Number(g.qtdMaxima ?? 999),
      obrigatorio: g.obrigatorio || false,
      opcoes: Array.isArray(g.opcoes) ? g.opcoes : [],
    }));
  }

  if (item.complementos?.ativo) {
    const c = item.complementos;
    return [
      {
        id: `${item.id || "prod"}_complementos`,
        nomeGrupo: c.tituloGrupo || "Sabores / Opções",
        qtdMinima: Number(c.qtdMinima ?? 0),
        qtdMaxima: Number(c.qtdMaxima ?? 999),
        obrigatorio: c.obrigatorio || false,
        opcoes: Array.isArray(c.opcoes) ? c.opcoes : [],
      },
    ];
  }

  return [];
}

export function getFotoOpcao(opt) {
  return opt?.fotoUrl || opt?.foto || opt?.imagem || opt?.imageUrl || null;
}

export function criarIdUnico(produto, escolhas) {
  const base = produto?.id || "produto";
  const escolhasOrdenadas = (escolhas || [])
    .map((g) => ({
      grupoNome: g.grupoNome,
      itens: (g.itens || [])
        .map((i) => ({
          nome: i.nome,
          preco: toNumber(i.preco),
          qtd: Number(i.qtd || 1),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    }))
    .sort((a, b) => a.grupoNome.localeCompare(b.grupoNome));

  return `${base}::${JSON.stringify(escolhasOrdenadas)}`;
}

export function calcularTotalUnitario(precoBaseUnitario, escolhas) {
  const base = toNumber(precoBaseUnitario);
  const add = (escolhas || []).reduce((acc, g) => {
    const somaGrupo = (g.itens || []).reduce(
      (a2, it) => a2 + toNumber(it.preco) * Number(it.qtd || 1),
      0
    );
    return acc + somaGrupo;
  }, 0);
  return base + add;
}

/**
 * Busca cardápio do estabelecimento
 * Retorna: cardapio[], categorias[], expandedCategories{}, setExpandedCategories, loading
 */
export function useCardapioFirestore(estabelecimentoId) {
  const [cardapio, setCardapio] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!estabelecimentoId) return;

    setLoading(true);
    const cardapioRef = collection(db, "estabelecimentos", estabelecimentoId, "cardapio");
    const q = query(cardapioRef, orderBy("nome"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cardapioData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        const cats = [...new Set(cardapioData.map((i) => i.categoria || "sem-categoria"))].filter(Boolean);
        setCategorias(["todos", ...cats]);
        setCardapio(cardapioData);

        const expanded = {};
        cats.forEach((c) => (expanded[c] = true));
        setExpandedCategories(expanded);

        setLoading(false);
      },
      (err) => {
        console.error("Erro ao buscar cardápio:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [estabelecimentoId]);

  return { cardapio, categorias, expandedCategories, setExpandedCategories, loading };
}

export function getCategoriaIcon(categoria) {
  const icons = {
    lanches: "🍔",
    japonesa: "🍣",
    churrasco: "🥩",
    pizza: "🍕",
    brasileira: "🥘",
    italiana: "🍝",
    saudavel: "🥗",
    doces: "🍰",
    sorvetes: "🍦",
    "sem-categoria": "🍽️",
    bebidas: "🥤",
    combos: "🎁",
    promocoes: "🔥",
  };
  return icons[String(categoria || "").toLowerCase()] || "🍽️";
}
