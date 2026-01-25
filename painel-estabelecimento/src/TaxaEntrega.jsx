import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import { db } from './firebase'; // Verifique se este caminho está correto
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Ajuste do ícone
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TaxaEntrega = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(false);
  const [posicaoLoja, setPosicaoLoja] = useState([-21.7833, -48.1833]); 
  const [raioCerca, setRaioCerca] = useState(10);
  const [faixas, setFaixas] = useState([]);
  const [novaFaixa, setNovaFaixa] = useState({ ate: '', valor: '' });

  // 1. Carregar dados
  useEffect(() => {
    if (user?.uid) {
      const fetchConfig = async () => {
        try {
          // Caminho: estabelecimentos / ID / configuracao / entrega
          const docRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'entrega');
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setPosicaoLoja(data.posicaoLoja || [-21.7833, -48.1833]);
            setRaioCerca(data.raioCerca || 10);
            setFaixas(data.faixas || []);
            console.log("Dados carregados com sucesso!");
          }
        } catch (error) {
          console.error("Erro ao carregar:", error);
        }
      };
      fetchConfig();
    }
  }, [user]);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setPosicaoLoja([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  };

  // 2. SALVAR (Função principal com logs de erro)
  const salvarConfiguracoes = async () => {
    console.log("Iniciando salvamento...");
    
    if (!user?.uid) {
      console.error("Usuário não encontrado!");
      alert("Erro: Usuário não identificado. Tente atualizar a página.");
      return;
    }

    setLoading(true);
    try {
      // DEFININDO O DOCUMENTO NA SUBCOLEÇÃO
      const docRef = doc(db, 'estabelecimentos', user.uid, 'configuracao', 'entrega');
      
      const dadosParaSalvar = {
        posicaoLoja,
        raioCerca: parseFloat(raioCerca),
        faixas: faixas,
        atualizadoEm: serverTimestamp()
      };

      console.log("Salvando dados em:", `estabelecimentos/${user.uid}/configuracao/entrega`);
      console.log("Dados:", dadosParaSalvar);

      await setDoc(docRef, dadosParaSalvar, { merge: true });

      alert("Salvo com sucesso no Firebase!");
    } catch (e) {
      console.error("ERRO AO SALVAR NO FIREBASE:", e);
      alert("Erro técnico: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const adicionarFaixaManual = () => {
    if (!novaFaixa.ate || !novaFaixa.valor) return;
    const de = faixas.length > 0 ? faixas[faixas.length - 1].ate : 0;
    const lista = [...faixas, { 
      de: parseFloat(de), 
      ate: parseFloat(novaFaixa.ate), 
      valor: parseFloat(novaFaixa.valor.toString().replace(',', '.')) 
    }].sort((a, b) => a.ate - b.ate);
    setFaixas(lista);
    setNovaFaixa({ ate: '', valor: '' });
  };

  const styles = {
    container: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' },
    sidebar: { flex: 1, backgroundColor: 'rgba(0, 30, 35, 0.9)', padding: '20px', borderRadius: '12px', border: '1px solid #4FD1C544' },
    mapContainer: { flex: 1.5, height: '550px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #4FD1C533' },
    input: { backgroundColor: '#001a1e', border: '1px solid #4FD1C566', borderRadius: '8px', padding: '12px', color: '#fff', width: '100%', marginBottom: '10px' },
    btnPrimary: { backgroundColor: '#4FD1C5', color: '#00171A', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
    label: { color: '#81E6D9', fontSize: '13px', marginBottom: '5px', display: 'block' }
  };

  return (
    <Layout isMobile={isMobile}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#4FD1C5', fontSize: '24px' }}>📍 Raio de Entrega</h1>
        <p style={{ color: '#81E6D9', opacity: 0.8 }}>O ponto no mapa define a origem do cálculo de KM.</p>
      </header>

      <div style={styles.container}>
        <div style={styles.sidebar}>
          <label style={styles.label}>Cerca Visual: {raioCerca}km</label>
          <input 
            type="range" min="1" max="50" 
            style={{ width: '100%', marginBottom: '25px' }}
            value={raioCerca}
            onChange={(e) => setRaioCerca(e.target.value)}
          />

          <h3 style={{ color: '#4FD1C5', fontSize: '16px' }}>Definir Taxas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '15px' }}>
            <input type="number" style={styles.input} value={novaFaixa.ate} onChange={e => setNovaFaixa({...novaFaixa, ate: e.target.value})} placeholder="Até KM" />
            <input type="text" style={styles.input} value={novaFaixa.valor} onChange={e => setNovaFaixa({...novaFaixa, valor: e.target.value})} placeholder="R$" />
            <button onClick={adicionarFaixaManual} style={{ ...styles.btnPrimary, width: '40px', padding: '5px' }}>+</button>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '20px', minHeight: '100px' }}>
            {faixas.map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#81E6D9', padding: '8px 0', borderBottom: '1px solid #ffffff11' }}>
                <span>{f.de} a {f.ate} km</span>
                <strong>R$ {f.valor.toFixed(2)}</strong>
                <button onClick={() => setFaixas(faixas.filter((_, idx) => idx !== i))} style={{ color: '#F56565', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>

          <button onClick={salvarConfiguracoes} disabled={loading} style={styles.btnPrimary}>
            {loading ? 'Salvando...' : '💾 Salvar Local e Taxas'}
          </button>
        </div>

        <div style={styles.mapContainer}>
          <MapContainer center={posicaoLoja} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
            <MapEvents />
            <Marker position={posicaoLoja} />
            <Circle 
              center={posicaoLoja} 
              radius={raioCerca * 1000} 
              pathOptions={{ fillColor: '#4FD1C5', fillOpacity: 0.1, color: '#4FD1C5', weight: 1, dashArray: '5, 5' }} 
            />
          </MapContainer>
        </div>
      </div>
    </Layout>
  );
};

export default TaxaEntrega;