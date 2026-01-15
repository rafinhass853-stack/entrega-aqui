import { useState } from 'react';
import TelaLogin from './TelaLogin';
import Menu from './Menu';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <Menu onLogout={handleLogout} />
      ) : (
        <TelaLogin onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;