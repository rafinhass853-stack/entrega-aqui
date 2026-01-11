import React from 'react';
import { FaUser, FaKey, FaStore } from 'react-icons/fa';
import '../styles/Login.css';

const LoginDemo = () => {
  return (
    <div className="demo-credentials">
      <h3 className="demo-title">
        <FaUser className="demo-icon" />
        Credenciais de Demonstração
      </h3>
      
      <div className="credentials-grid">
        <div className="credential-item">
          <div className="credential-icon">
            <FaStore />
          </div>
          <div className="credential-content">
            <span className="credential-label">Empresa</span>
            <span className="credential-value">Restaurante do Zé</span>
          </div>
        </div>
        
        <div className="credential-item">
          <div className="credential-icon">
            <FaUser />
          </div>
          <div className="credential-content">
            <span className="credential-label">Email</span>
            <span className="credential-value">jose@restaurantedoze.com</span>
          </div>
        </div>
        
        <div className="credential-item">
          <div className="credential-icon">
            <FaKey />
          </div>
          <div className="credential-content">
            <span className="credential-label">Senha</span>
            <span className="credential-value">123456</span>
          </div>
        </div>
      </div>
      
      <div className="demo-note">
        <p>⚠️ Use estas credenciais para testar o painel.</p>
        <p>Recomendamos alterar a senha após o primeiro acesso.</p>
      </div>
    </div>
  );
};

export default LoginDemo;