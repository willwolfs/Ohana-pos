import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import LoginForm from '../components/LoginForm';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/pos', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLoginSuccess = () => {
    navigate('/pos');
  };

  return (
    <div className="ohana-auth-viewport">
      <div className="ohana-auth-card">
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};

export default LoginPage;
