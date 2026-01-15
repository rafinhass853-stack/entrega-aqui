import React, { useState, useMemo } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from 'react-router-dom';

const TelaLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const foodIcons = ['🍕', '🍔', '🌭', '🌮', '🍣', '🥗', '🍝', '🍜', '🥘', '🍛', '🍤', '🍦', '🍰', '🥨', '🥐'];

  const backgroundIcons = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      icon: foodIcons[Math.floor(Math.random() * foodIcons.length)],
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 20}s`,
      size: `${20 + Math.random() * 20}px`
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error("Erro Firebase:", err.code);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Este e-mail não está cadastrado.');
          break;
        case 'auth/wrong-password':
          setError('A senha informada está incorreta.');
          break;
        case 'auth/invalid-credential':
          setError('E-mail ou senha inválidos.');
          break;
        default:
          setError('Falha ao conectar. Verifique seus dados.');
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
      position: 'fixed', top: 0, left: 0, overflowY: 'auto',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    foodBackground: {
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      overflow: 'hidden', zIndex: 0, pointerEvents: 'none'
    },
    foodIcon: {
      position: 'absolute', opacity: 0.1,
      animation: 'float 20s infinite linear',
    },
    loginContainer: {
      position: 'relative', zIndex: 1, width: '100%', maxWidth: '450px', padding: '20px',
    },
    loginCard: {
      background: 'rgba(0, 43, 48, 0.85)', backdropFilter: 'blur(20px)',
      borderRadius: '24px', border: '1px solid rgba(79, 209, 197, 0.2)',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)', width: '100%',
      padding: '40px', textAlign: 'center', animation: 'fadeIn 0.6s ease-out',
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' },
    logoContainer: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '60px', height: '60px', background: 'rgba(79, 209, 197, 0.1)',
      borderRadius: '50%', border: '2px solid rgba(79, 209, 197, 0.3)',
    },
    brand: { fontSize: '28px', fontWeight: '900', color: '#4FD1C5', margin: 0 },
    subtitle: { color: '#81E6D9', fontSize: '14px', marginBottom: '30px', opacity: 0.8 },
    inputGroup: { marginBottom: '20px', textAlign: 'left' },
    label: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#4FD1C5', marginBottom: '8px' },
    inputContainer: { position: 'relative' },
    inputIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#4FD1C5', opacity: 0.7 },
    input: {
      width: '100%', padding: '14px 14px 14px 45px', borderRadius: '12px',
      border: '1px solid rgba(79, 209, 197, 0.3)', background: 'rgba(0, 20, 25, 0.6)',
      color: '#FFFFFF', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
    },
    passwordToggle: {
      position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)',
      background: 'none', border: 'none', color: '#4FD1C5', cursor: 'pointer', fontSize: '18px'
    },
    button: {
      width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
      background: 'linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%)',
      color: '#002B30', fontSize: '16px', fontWeight: '800', cursor: 'pointer',
      marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
    },
    error: {
      background: 'rgba(255, 100, 100, 0.1)', color: '#ff8080', padding: '12px',
      borderRadius: '10px', fontSize: '13px', marginBottom: '20px', border: '1px solid rgba(255, 100, 100, 0.2)'
    },
    footer: { marginTop: '25px' },
    helpLink: { color: '#4FD1C5', fontSize: '12px', textDecoration: 'none', opacity: 0.8, display: 'block', marginBottom: '5px' }
  };

  return (
    <div style={styles.viewPort}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
          100% { transform: translateY(0) rotate(360deg); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #4FD1C5 !important; }
        button:hover { filter: brightness(1.1); transform: translateY(-1px); }
      `}</style>
      
      <div style={styles.foodBackground}>
        {backgroundIcons.map((item) => (
          <div key={item.id} style={{
            ...styles.foodIcon,
            top: item.top,
            left: item.left,
            animationDelay: item.delay,
            fontSize: item.size
          }}>
            {item.icon}
          </div>
        ))}
      </div>

      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.header}>
            <div style={styles.logoContainer}>🏪</div>
            <div>
              <h1 style={styles.brand}>ENTREGAQUI</h1>
              <p style={styles.subtitle}>Painel do Estabelecimento</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div style={styles.error}>⚠️ {error}</div>}

            <div style={styles.inputGroup}>
              <label style={styles.label}>E-MAIL DE ACESSO</label>
              <div style={styles.inputContainer}>
                <span style={styles.inputIcon}>@</span>
                <input
                  type="email"
                  placeholder="ex: E-mail"
                  style={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>SENHA</label>
              <div style={styles.inputContainer}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  style={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? <div style={{ animation: 'spin 1s linear infinite' }}>🔄</div> : '🚀 ACESSAR PAINEL'}
            </button>

            <div style={styles.footer}>
              <a href="#" style={styles.helpLink}>Suporte Técnico</a>
              <a href="#" style={styles.helpLink}>Esqueci minha senha</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TelaLogin;