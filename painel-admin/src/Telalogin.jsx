import React, { useState, useMemo } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from "firebase/auth";

const TelaLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Lista de ícones para o fundo
  const foodIcons = [
    '🍕', 'Burger', '🍟', '🍣', '🥗', '🍝', '🍜', '🥘', '🍛', '🍤', 
    '🍦', '🍰', '🍩', '🍪', '🥨', '🥐', '🥪', '🌮', '🌯', '🥤'
  ];

  // Otimização para os ícones não mudarem de posição ao digitar
  const backgroundIcons = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      icon: foodIcons[Math.floor(Math.random() * foodIcons.length)],
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: `${15 + Math.random() * 10}s`,
      delay: `${Math.random() * -20}s`,
      size: `${20 + Math.random() * 15}px`
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      console.error(err.code);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Usuário não cadastrado.');
          break;
        case 'auth/wrong-password':
          setError('Senha incorreta.');
          break;
        case 'auth/invalid-credential':
          setError('E-mail ou senha inválidos.');
          break;
        case 'auth/too-many-requests':
          setError('Muitas tentativas. Tente mais tarde.');
          break;
        default:
          setError('Erro ao acessar o sistema.');
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    viewPort: {
      margin: 0, padding: 0, width: '100vw', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#001a1d',
      background: 'radial-gradient(ellipse at center, #003d45 0%, #001a1d 100%)',
      position: 'fixed', top: 0, left: 0, overflow: 'hidden',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    foodBackground: {
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      zIndex: 0, pointerEvents: 'none',
    },
    foodIcon: (item) => ({
      position: 'absolute',
      top: item.top,
      left: item.left,
      fontSize: item.size,
      opacity: 0.1,
      animation: `float ${item.duration} infinite linear`,
      animationDelay: item.delay,
    }),
    loginCard: {
      position: 'relative', zIndex: 1,
      background: 'rgba(0, 43, 48, 0.85)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '28px', border: '1px solid rgba(79, 209, 197, 0.2)',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
      width: '90%', maxWidth: '420px', padding: '45px 35px',
      textAlign: 'center', animation: 'fadeIn 0.8s ease-out',
    },
    header: { marginBottom: '35px' },
    logoCircle: {
      width: '70px', height: '70px', background: 'rgba(79, 209, 197, 0.1)',
      borderRadius: '20px', border: '1px solid rgba(79, 209, 197, 0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 15px auto', fontSize: '32px'
    },
    brand: { fontSize: '32px', fontWeight: '900', color: '#4FD1C5', margin: 0, letterSpacing: '1px' },
    subtitle: { color: '#81E6D9', fontSize: '14px', opacity: 0.8, marginTop: '5px' },
    inputGroup: { marginBottom: '22px', textAlign: 'left' },
    label: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: '#4FD1C5', marginBottom: '8px', textTransform: 'uppercase' },
    inputContainer: { position: 'relative' },
    input: {
      width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px',
      border: '1px solid rgba(79, 209, 197, 0.2)', background: 'rgba(0, 20, 25, 0.6)',
      color: '#FFFFFF', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: '0.3s',
    },
    inputIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#4FD1C5', opacity: 0.6 },
    passwordToggle: {
      position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)',
      background: 'none', border: 'none', color: '#4FD1C5', cursor: 'pointer', fontSize: '18px'
    },
    button: {
      width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
      background: 'linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%)',
      color: '#002B30', fontSize: '15px', fontWeight: '800', cursor: 'pointer',
      transition: 'all 0.3s', marginTop: '10px',
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
      opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto'
    },
    error: {
      background: 'rgba(255, 100, 100, 0.1)', color: '#ff8080', padding: '12px',
      borderRadius: '10px', fontSize: '13px', marginBottom: '20px',
      border: '1px solid rgba(255, 100, 100, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
    },
    footerLink: { color: '#81E6D9', fontSize: '13px', textDecoration: 'none', marginTop: '25px', display: 'block', opacity: 0.7 }
  };

  return (
    <div style={styles.viewPort}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(10deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #4FD1C5 !important; box-shadow: 0 0 0 4px rgba(79, 209, 197, 0.1) !important; background: rgba(0, 20, 25, 0.8) !important; }
        button:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 12px 25px rgba(79, 209, 197, 0.3); }
        button:active { transform: translateY(0); }
      `}</style>

      {/* Fundo Animado */}
      <div style={styles.foodBackground}>
        {backgroundIcons.map((item) => (
          <div key={item.id} style={styles.foodIcon(item)}>{item.icon}</div>
        ))}
      </div>

      <div style={styles.loginCard}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>🚚</div>
          <h1 style={styles.brand}>ENTREGAQUI</h1>
          <p style={styles.subtitle}>Logística & Gestão de Pedidos</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}><span>⚠️</span> {error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail de Acesso</label>
            <div style={styles.inputContainer}>
              <span style={styles.inputIcon}>@</span>
              <input
                type="email"
                placeholder="nome@empresa.com"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha Segura</label>
            <div style={styles.inputContainer}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={styles.passwordToggle}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid #002B30', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                CARREGANDO...
              </span>
            ) : 'ENTRAR NO PAINEL'}
          </button>

          <a href="#" style={styles.footerLink}>
            Esqueceu sua senha? <strong style={{color: '#4FD1C5'}}>Recuperar acesso</strong>
          </a>
        </form>
      </div>
    </div>
  );
};

export default TelaLogin;