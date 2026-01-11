import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaLock, FaUtensils, FaExclamationTriangle } from 'react-icons/fa';
import '../styles/Login.css';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações básicas
    if (!email.trim()) {
      setError('Por favor, insira seu email');
      return;
    }
    
    if (!password) {
      setError('Por favor, insira sua senha');
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-header">
        <h2>Acesse Seu Painel</h2>
        <p>Gerencie seu restaurante de forma simples e eficiente</p>
      </div>

      <div className="input-group">
        <div className="input-icon">
          <FaUser />
        </div>
        <input
          type="email"
          placeholder="Email do restaurante"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="login-input"
          disabled={loading}
        />
      </div>

      <div className="input-group">
        <div className="input-icon">
          <FaLock />
        </div>
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="login-input"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="error-message">
          <FaExclamationTriangle className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      <div className="form-options">
        <label className="remember-me">
          <input type="checkbox" />
          <span>Lembrar-me</span>
        </label>
        <a href="#" className="forgot-password">Esqueci a senha</a>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="login-button"
      >
        {loading ? (
          <span className="loading-spinner"></span>
        ) : (
          <>
            Entrar no Painel
            <FaUtensils className="button-icon" />
          </>
        )}
      </button>

      <div className="form-footer">
        <p>É novo no EntregaAqui? <a href="#">Cadastre seu restaurante</a></p>
      </div>
    </form>
  );
};

export default LoginForm;