// Componentspic.jsx
import React, { useMemo, useState } from "react";
import { MapPin, Heart, Package, Star, Truck, ChevronRight } from "lucide-react";

export const EstabelecimentoCard = ({ estabelecimento, onClick, isMobile }) => {
  const [favorito, setFavorito] = useState(false);

  const styles = {
    card: {
      backgroundColor: "#fff",
      borderRadius: "18px",
      overflow: "hidden",
      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
      cursor: "pointer",
      transition: "all 0.3s ease",
      position: "relative",
    },
    cardImage: {
      height: isMobile ? "160px" : "135px",
      position: "relative",
      overflow: "hidden",
    },
    imagemEstabelecimento: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transition: "transform 0.5s ease",
    },
    imagePlaceholder: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "48px",
      color: "#E2E8F0",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    statusBadge: {
      position: "absolute",
      top: "10px",
      left: "10px",
      padding: "5px 12px",
      borderRadius: "20px",
      color: "#fff",
      fontSize: "10px",
      fontWeight: "900",
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      gap: "4px",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.2)",
    },
    favoritoButton: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "rgba(255,255,255,0.92)",
      border: "none",
      borderRadius: "50%",
      width: "34px",
      height: "34px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      zIndex: 1,
      transition: "all 0.2s ease",
    },
    overlayInfo: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
      color: "white",
      padding: "10px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardBody: {
      padding: isMobile ? "16px" : "14px",
    },
    estNome: {
      margin: 0,
      fontSize: isMobile ? "16px" : "15px",
      fontWeight: "900",
      color: "#0F3460",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    estCategoria: {
      margin: "6px 0 0 0",
      fontSize: "12px",
      color: "#718096",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flexWrap: "wrap",
    },
    ratingContainer: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      marginTop: "8px",
    },
    estDetails: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "12px",
      color: "#4A5568",
      marginTop: "12px",
      borderTop: "1px solid #EDF2F7",
      paddingTop: "10px",
      gap: "8px",
    },
    infoTag: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 8px",
      background: "#F7FAFC",
      borderRadius: "8px",
      fontSize: "11px",
      fontWeight: "600",
      minWidth: 0,
    },
  };

  const rating = useMemo(() => (Math.random() * 1 + 4).toFixed(1), []);
  const nomeLoja = String(estabelecimento?.cliente || "Loja");
  const primeiraLetra = nomeLoja?.[0] ? nomeLoja[0] : "L";

  // ✅ pega tempo do banco com segurança
  const tempoMinRaw = Number(estabelecimento?.tempoEntrega ?? 30);
  const tempoMin = Number.isFinite(tempoMinRaw) ? Math.max(0, Math.min(999, tempoMinRaw)) : 30;

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.cardImage}>
        {estabelecimento?.fotoUrl ? (
          <img
            src={estabelecimento.fotoUrl}
            style={styles.imagemEstabelecimento}
            alt={nomeLoja}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
        ) : (
          <div style={styles.imagePlaceholder}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
              }}
            >
              {primeiraLetra}
            </div>
          </div>
        )}

        <div
          style={{
            ...styles.statusBadge,
            backgroundColor: estabelecimento?.aberto ? "#10B981" : "#EF4444",
          }}
        >
          {estabelecimento?.aberto ? "🟢 ABERTO" : "🔴 FECHADO"}
        </div>

        <button
          style={styles.favoritoButton}
          onClick={(e) => {
            e.stopPropagation();
            setFavorito(!favorito);
          }}
        >
          <Heart
            size={18}
            color={favorito ? "#EF4444" : "#CBD5E0"}
            fill={favorito ? "#EF4444" : "none"}
          />
        </button>

        <div style={styles.overlayInfo}>
          <div style={{ fontSize: "10px", fontWeight: "600" }}>
            {estabelecimento?.textoHorario || "Horário não definido"}
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "10px",
              fontWeight: "700",
              backdropFilter: "blur(10px)",
              whiteSpace: "nowrap",
            }}
          >
            🚀 {tempoMin} min
          </div>
        </div>
      </div>

      <div style={styles.cardBody}>
        <h3 style={styles.estNome}>
          {nomeLoja}
          <ChevronRight size={16} color="#CBD5E0" />
        </h3>

        <p style={styles.estCategoria}>
          <span
            style={{
              background: "#F1F5F9",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              whiteSpace: "nowrap",
            }}
          >
            {estabelecimento?.categoria || "lanches"}
          </span>
          <span>•</span>
          <MapPin size={12} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {estabelecimento?.endereco?.bairro || "Bairro"}
          </span>
        </p>

        <div style={styles.ratingContainer}>
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                fill={star <= Math.floor(Number(rating)) ? "#FBBF24" : "#E2E8F0"}
                color={star <= Math.floor(Number(rating)) ? "#FBBF24" : "#E2E8F0"}
              />
            ))}
          </div>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#4A5568", marginLeft: "4px" }}>
            {rating}
          </span>
          <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "4px" }}>(150+)</span>
        </div>

        <div style={styles.estDetails}>
          <div style={styles.infoTag}>
            <Package size={12} />
            {estabelecimento?.endereco?.cidade || "Cidade"}
          </div>

          <div
            style={{
              ...styles.infoTag,
              background: Number(estabelecimento?.taxaEntrega) === 0 ? "#D1FAE5" : "#F1F5F9",
              color: Number(estabelecimento?.taxaEntrega) === 0 ? "#065F46" : "#4A5568",
              justifyContent: "center",
              flex: 1,
            }}
          >
            <Truck size={12} />
            {Number(estabelecimento?.taxaEntrega) === 0
              ? "📍 Consulte o frete"
              : `R$ ${Number(estabelecimento?.taxaEntrega || 0).toFixed(2)}`}
          </div>
        </div>
      </div>
    </div>
  );
};
