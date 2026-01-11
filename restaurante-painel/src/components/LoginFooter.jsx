import React from 'react';
import { FaPhone, FaEnvelope, FaShieldAlt } from 'react-icons/fa';
import '../styles/Login.css';

const LoginFooter = () => {
  return (
    <div className="login-footer">
      <div className="footer-content">
        <div className="footer-section">
          <FaShieldAlt className="footer-icon" />
          <p>Sistema 100% seguro e criptografado</p>
        </div>
        
        <div className="footer-section">
          <FaPhone className="footer-icon" />
          <p>Suporte: (11) 9999-9999</p>
        </div>
        
        <div className="footer-section">
          <FaEnvelope className="footer-icon" />
          <p>contato@entreguaqui.com</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© 2024 EntregaAqui. Todos os direitos reservados.</p>
        <div className="footer-links">
          <a href="#">Termos de Uso</a>
          <span className="separator">•</span>
          <a href="#">Política de Privacidade</a>
          <span className="separator">•</span>
          <a href="#">Ajuda</a>
        </div>
      </div>
    </div>
  );
};

export default LoginFooter;