import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBuilding, FaUser, FaLock, FaUtensils } from 'react-icons/fa';
import './../styles/Login.css';

const Login = () => {
  const [empresa, setEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Validações
    if (!empresa.trim()) {
      setError('Por favor, informe o nome da empresa');
      setLoading(false);
      return;
    }
    
    if (!email.trim()) {
      setError('Por favor, informe o email');
      setLoading(false);
      return;
    }
    
    if (!password) {
      setError('Por favor, informe a senha');
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }
    
    // Simulação de login
    setTimeout(() => {
      if (
        empresa.toLowerCase().includes('zé') && 
        email === 'jose@restaurantedoze.com' && 
        password === '123456'
      ) {
        navigate('/dashboard');
      } else {
        setError('Credenciais inválidas. Verifique empresa, email e senha.');
      }
      setLoading(false);
    }, 1000);
  };

  const handleDemoLogin = () => {
    setEmpresa('Restaurante do Zé');
    setEmail('jose@restaurantedoze.com');
    setPassword('123456');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="logo">
            <FaUtensils className="logo-icon" />
            <h1>Entrega<span className="logo-accent">Aqui</span></h1>
          </div>
          <p className="tagline">Sistema de Gestão para Restaurantes</p>
        </div>
        
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">
              <FaBuilding className="label-icon" />
              Empresa
            </label>
            <input
              type="text"
              placeholder="Nome do seu restaurante"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="form-input"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <FaUser className="label-icon" />
              Email
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <FaLock className="label-icon" />
              Senha
            </label>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              onClick={handleDemoLogin}
              className="demo-button"
              disabled={loading}
            >
              Preencher Demo
            </button>
            
            <button 
              type="submit" 
              disabled={loading}
              className="submit-button"
            >
              {loading ? (
                <span className="loading">
                  <span className="spinner"></span>
                  Entrando...
                </span>
              ) : (
                <>
                  <FaUtensils className="button-icon" />
                  Entrar no Painel
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* Informações de Demo */}
        <div className="demo-section">
          <h3 className="demo-title">Credenciais de Demonstração</h3>
          <div className="demo-grid">
            <div className="demo-card">
              <div className="demo-card-header">
                <FaBuilding />
                <span>Empresa</span>
              </div>
              <div className="demo-card-value">Restaurante do Zé</div>
            </div>
            
            <div className="demo-card">
              <div className="demo-card-header">
                <FaUser />
                <span>Login</span>
              </div>
              <div className="demo-card-value">jose@restaurantedoze.com</div>
            </div>
            
            <div className="demo-card">
              <div className="demo-card-header">
                <FaLock />
                <span>Senha</span>
              </div>
              <div className="demo-card-value">123456</div>
            </div>
          </div>
          <p className="demo-note">Clique em "Preencher Demo" para testar rapidamente</p>
        </div>
        
        {/* Footer */}
        <div className="login-footer">
          <p>© 2026 EntregaAqui - Todos os direitos reservados</p>
          <p className="support">Suporte: Rafael Araujo | (16) 98831-8626</p>
        </div>
      </div>
    </div>
  );
};

export default Login;