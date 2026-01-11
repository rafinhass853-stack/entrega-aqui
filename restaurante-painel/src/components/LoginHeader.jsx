import React from 'react';
import { FaMotorcycle, FaHeart } from 'react-icons/fa';
import '../styles/Login.css';

const LoginHeader = () => {
  return (
    <div className="login-header">
      <div className="logo-container">
        <div className="logo-icon-wrapper">
          <FaMotorcycle className="logo-icon" />
          <div className="logo-pulse"></div>
        </div>
        <div className="logo-text">
          <h1>Entrega<span className="logo-accent">Aqui</span></h1>
          <p className="tagline">Painel do Restaurante</p>
        </div>
      </div>
      
      <div className="header-tag">
        <FaHeart className="heart-icon" />
        <span>Feito para restaurantes que amam entregar</span>
      </div>
    </div>
  );
};

export default LoginHeader;