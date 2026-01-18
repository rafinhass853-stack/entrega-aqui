import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, ArrowLeft, Plus, ShoppingBag, ChevronRight, 
  Star, Clock, Bike, Info, MapPin, Menu, Filter
} from 'lucide-react';

// Conexão Firebase
import { db } from './firebase'; 
import { collection, getDocs } from 'firebase/firestore';

const PaginaPremium = () => {
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [lojaAtiva, setLojaAtiva] = useState(null);
  const [cardapio, setCardapio] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [carrinho, setCarrinho] = useState([]);

  useEffect(() => {
    const fetchLojas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "estabelecimentos"));
        setEstabelecimentos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchLojas();
  }, []);

  const selecionarLoja = async (loja) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    setLojaAtiva(loja);
    try {
      const cardSnap = await getDocs(collection(db, `estabelecimentos/${loja.id}/cardapio`));
      setCardapio(cardSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const confSnap = await getDocs(collection(db, `estabelecimentos/${loja.id}/configuracao`));
      if (!confSnap.empty) setConfig(confSnap.docs[0].data());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const totalCarrinho = useMemo(() => {
    const subtotal = carrinho.reduce((acc, i) => acc + (Number(i.preco) * i.qtd), 0);
    return (subtotal + Number(config?.taxaEntrega || 0)).toFixed(2);
  }, [carrinho, config]);

  if (loading && !lojaAtiva) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#072A33', color: '#fff' }}>
      <div className="spinner"></div>
      <style>{`.spinner { width: 40px; height: 40px; border: 4px solid #10B981; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={layout}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
        body { margin: 0; background-color: #F4F7F6; color: #072A33; }
        .hover-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(7, 42, 51, 0.1); }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #10B981; border-radius: 10px; }
      `}</style>

      {/* NAVBAR FULL WIDTH */}
      <nav style={navbar}>
        <div style={navContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={logo}>Entrega<span style={{ color: '#10B981' }}>qui</span></h1>
            <div style={addressPill}>
              <MapPin size={16} color="#10B981" />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Rua Araraquara, SP</span>
              <ChevronDown size={14} />
            </div>
          </div>
          
          <div style={searchContainer}>
            <Search size={18} color="#10B981" />
            <input 
              placeholder="O que vamos saborear hoje?" 
              style={searchInput}
              onChange={e => setPesquisa(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button style={navIconBtn}><Filter size={20} /></button>
            <button style={navIconBtn}><Menu size={20} /></button>
          </div>
        </div>
      </nav>

      <main style={mainContent}>
        {!lojaAtiva ? (
          <div style={{ width: '100%' }}>
            <div style={heroSection}>
              <h2 style={heroTitle}>Descubra sabores <br/> extraordinários perto de você.</h2>
            </div>

            <div style={gridLojas}>
              {estabelecimentos
                .filter(e => e.cliente?.toLowerCase().includes(pesquisa.toLowerCase()))
                .map(loja => (
                  <div key={loja.id} onClick={() => selecionarLoja(loja)} className="hover-card" style={shopCard}>
                    <div style={shopImage}>
                      <span style={{ fontSize: '40px' }}>🏪</span>
                      {loja.ativo && <div style={onlineBadge}>Aberto</div>}
                    </div>
                    <div style={shopBody}>
                      <h3 style={shopTitle}>{loja.cliente}</h3>
                      <p style={shopTags}>{loja.categoria || 'Gourmet'} • Premium</p>
                      <div style={shopFooter}>
                        <div style={ratingBox}><Star size={14} fill="#10B981" color="#10B981" /> 4.9</div>
                        <div style={metaInfo}><Clock size={14} /> 25-35 min</div>
                        <div style={metaInfo}><Bike size={14} /> Grátis</div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        ) : (
          /* TELA DE CARDÁPIO PREMIUM */
          <div style={{ width: '100%', animation: 'fadeIn 0.5s ease' }}>
            <button onClick={() => setLojaAtiva(null)} style={backBtn}>
              <ArrowLeft size={20} /> Voltar para exploração
            </button>

            <div style={headerLoja}>
              <div style={headerLojaInfo}>
                <h2 style={lojaNome}>{lojaAtiva.cliente}</h2>
                <div style={{ display: 'flex', gap: '20px', color: '#10B981', fontWeight: '600' }}>
                  <span>★ 4.9 (500+ avaliações)</span>
                  <span>•</span>
                  <span>Informações da Loja <Info size={14} /></span>
                </div>
              </div>
            </div>

            <div style={menuGrid}>
              {cardapio.map(item => (
                <div key={item.id} style={productCard}>
                  <div style={productInfo}>
                    <h4 style={productTitle}>{item.nome}</h4>
                    <p style={productDescription}>{item.descricao}</p>
                    <div style={productPriceRow}>
                      <span style={priceTag}>R$ {Number(item.preco).toFixed(2)}</span>
                      <button onClick={() => setCarrinho([...carrinho, { ...item, qtd: 1 }])} style={addBtn}>
                        <Plus size={18} /> Adicionar
                      </button>
                    </div>
                  </div>
                  <div style={productImgLarge}>🍽️</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER CARRINHO FLOATING */}
      {carrinho.length > 0 && (
        <div style={cartBar}>
          <div style={cartBarInner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={cartIconContainer}>
                <ShoppingBag size={24} />
                <span style={cartBadge}>{carrinho.length}</span>
              </div>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Total com entrega</div>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>R$ {totalCarrinho}</div>
              </div>
            </div>
            <button style={checkoutBtn}>Finalizar Pedido <ChevronRight size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- ESTILOS PREMIUM ---
const layout = { minHeight: '100vh', display: 'flex', flexDirection: 'column' };
const navbar = { background: '#072A33', color: '#fff', padding: '15px 0', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' };
const navContent = { width: '100%', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const logo = { fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-1px' };
const addressPill = { background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' };
const searchContainer = { flex: 1, maxWidth: '500px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 40px' };
const searchInput = { background: 'transparent', border: 'none', outline: 'none', color: '#fff', width: '100%', fontSize: '14px' };
const navIconBtn = { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7 };

const mainContent = { flex: 1, width: '100%', padding: '40px' };
const heroSection = { marginBottom: '40px' };
const heroTitle = { fontSize: '42px', fontWeight: '800', margin: 0, lineHeight: 1.1, color: '#072A33' };

const gridLojas = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' };
const shopCard = { background: '#fff', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid #E8EEED' };
const shopImage = { height: '180px', background: '#DCE7E5', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' };
const onlineBadge = { position: 'absolute', top: '15px', right: '15px', background: '#10B981', color: '#fff', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700' };
const shopBody = { padding: '20px' };
const shopTitle = { margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700' };
const shopTags = { color: '#6B8E88', fontSize: '13px', margin: '0 0 15px 0' };
const shopFooter = { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F0F4F3', paddingTop: '15px' };
const ratingBox = { display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#072A33' };
const metaInfo = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6B8E88' };

const backBtn = { background: 'none', border: 'none', color: '#6B8E88', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', marginBottom: '20px' };
const headerLoja = { background: '#072A33', padding: '60px 40px', borderRadius: '32px', color: '#fff', marginBottom: '40px' };
const lojaNome = { fontSize: '48px', margin: '0 0 10px 0', fontWeight: '800' };
const menuGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '20px' };
const productCard = { background: '#fff', borderRadius: '24px', padding: '24px', display: 'flex', gap: '20px', border: '1px solid #E8EEED' };
const productInfo = { flex: 1 };
const productTitle = { margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' };
const productDescription = { fontSize: '13px', color: '#6B8E88', lineHeight: 1.5, marginBottom: '20px' };
const productPriceRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const priceTag = { fontSize: '18px', fontWeight: '800', color: '#072A33' };
const addBtn = { background: '#072A33', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const productImgLarge = { width: '100px', height: '100px', background: '#F4F7F6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' };

const cartBar = { position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '800px', zIndex: 2000 };
const cartBarInner = { background: '#072A33', color: '#fff', padding: '15px 30px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 20px 40px rgba(7, 42, 51, 0.3)' };
const cartIconContainer = { position: 'relative', color: '#10B981' };
const cartBadge = { position: 'absolute', top: '-8px', right: '-8px', background: '#fff', color: '#072A33', width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const checkoutBtn = { background: '#10B981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' };

const ChevronDown = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

export default PaginaPremium;