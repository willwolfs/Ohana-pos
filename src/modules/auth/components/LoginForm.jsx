import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

const REMEMBER_STORAGE_KEY = 'ohana_remember_creds';

export const LoginForm = ({ onSuccess }) => {
  const { login, register, loading } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem(REMEMBER_STORAGE_KEY) !== null;
  });

  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: '',
          email: parsed.email || '',
          password: parsed.password || '',
          role: 'ADMIN',
        };
      }
    } catch {
      // ignore JSON parse error
    }
    return {
      name: '',
      email: '',
      password: '',
      role: 'ADMIN',
    };
  });

  const [error, setError] = useState(() => {
    if (localStorage.getItem('ohana_session_expired') === 'true') {
      localStorage.removeItem('ohana_session_expired');
      return 'Tu sesión caducó por inactividad, inicia sesión nuevamente para continuar.';
    }
    return '';
  });
  const [isAlertExiting, setIsAlertExiting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Detectar sesión expirada al montar y escuchar eventos entre pestañas
  useEffect(() => {
    const checkExpired = () => {
      if (localStorage.getItem('ohana_session_expired') === 'true') {
        localStorage.removeItem('ohana_session_expired');
        setError('Tu sesión caducó por inactividad, inicia sesión nuevamente para continuar.');
      }
    };
    checkExpired();
    window.addEventListener('storage', checkExpired);
    return () => window.removeEventListener('storage', checkExpired);
  }, []);

  // Temporizador de 3 segundos para que la alerta no quede estática y se desvanezca con animación suave
  useEffect(() => {
    if (!error) {
      setIsAlertExiting(false);
      return;
    }

    setIsAlertExiting(false);

    // Animación de salida después de 3 segundos
    const exitTimer = setTimeout(() => {
      setIsAlertExiting(true);
    }, 3000);

    // Limpieza total del estado tras finalizar la animación de salida (350ms)
    const removeTimer = setTimeout(() => {
      setError('');
      setIsAlertExiting(false);
    }, 3350);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [error]);

  const roles = [
    { id: 'ADMIN', label: 'Administrador' },
    { id: 'CASHIER', label: 'Cajero (POS)' },
    { id: 'CHEF', label: 'Chef Cocina' },
    { id: 'WAITER', label: 'Mozo' },
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRememberToggle = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    if (!checked) {
      localStorage.removeItem(REMEMBER_STORAGE_KEY);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isRegisterMode) {
      if (!formData.name.trim()) {
        setError('Por favor ingresa tu nombre completo');
        return;
      }
      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      const res = await register(formData);
      if (res.success) {
        if (rememberMe) {
          localStorage.setItem(
            REMEMBER_STORAGE_KEY,
            JSON.stringify({
              email: formData.email.trim(),
              password: formData.password,
            })
          );
        }
        if (res.requiresEmailConfirmation) {
          setSuccessMsg('¡Cuenta creada con éxito! Verifica tu correo electrónico o inicia sesión.');
          setIsRegisterMode(false);
        } else {
          setSuccessMsg('¡Administrador creado con éxito! Ingresando al sistema...');
          setTimeout(() => {
            if (onSuccess) onSuccess();
          }, 600);
        }
      } else {
        setError(res.error || 'No se pudo registrar la cuenta en Supabase');
      }
    } else {
      const res = await login({ email: formData.email, password: formData.password });
      if (res.success) {
        if (rememberMe) {
          localStorage.setItem(
            REMEMBER_STORAGE_KEY,
            JSON.stringify({
              email: formData.email.trim(),
              password: formData.password,
            })
          );
        } else {
          localStorage.removeItem(REMEMBER_STORAGE_KEY);
        }
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Correo o contraseña incorrectos');
      }
    }
  };

  return (
    <div className="ohana-login-content">
      {/* Logo Redondo Directo sin fondo cuadrado ni marco blanco */}
      <div className="ohana-logo-center-wrapper">
        <div className="ohana-round-logo-glow">
          <img
            src="/assets/logo-ohana.png"
            alt="Ohana Makis"
            className="ohana-round-logo-img"
          />
        </div>
      </div>

      {/* Título Principal */}
      <h1 className="ohana-auth-title">
        {isRegisterMode ? 'Crear Cuenta' : 'Bienvenido'}
      </h1>

      {error && (
        <div
          key={error}
          className={`ohana-error-alert ${isAlertExiting ? 'is-exiting' : ''}`}
          role="alert"
        >
          <span className="ohana-error-alert-text">{error}</span>
          <div className="ohana-alert-progress" />
        </div>
      )}
      {successMsg && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          {successMsg}
        </div>
      )}

      <form className="ohana-form" onSubmit={handleSubmit}>
        {/* Campo Nombre en Registro */}
        {isRegisterMode && (
          <div className="ohana-field-group">
            <label className="ohana-label" htmlFor="name">
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="ohana-input"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
              required
            />
          </div>
        )}

        {/* Campo Correo electrónico */}
        <div className="ohana-field-group">
          <label className="ohana-label" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="ohana-input"
            value={formData.email}
            onChange={handleChange}
            placeholder="administrador@ohanamakis.pe"
            required
          />
        </div>

        {/* Campo Contraseña */}
        <div className="ohana-field-group">
          <label className="ohana-label" htmlFor="password">
            Contraseña
          </label>
          <div className="ohana-password-wrapper">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="ohana-input with-toggle"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••••••••••"
              required
            />
            <button
              type="button"
              className="ohana-pwd-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Selector de Rol en Registro */}
        {isRegisterMode && (
          <div className="ohana-field-group">
            <label className="ohana-label">Rol / Puesto en restaurante</label>
            <div className="ohana-roles-grid">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`ohana-role-btn ${formData.role === r.id ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, role: r.id }))}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fila Recordarme / Olvidaste tu contraseña */}
        {!isRegisterMode && (
          <div className="ohana-options-row">
            <label className="ohana-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={handleRememberToggle}
                className="ohana-checkbox"
              />
              <span>Recordarme</span>
            </label>

            <button
              type="button"
              className="ohana-forgot-link"
              onClick={() => alert('Se ha enviado un enlace de recuperación a tu correo.')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        {/* Botón Principal Naranja Ohana */}
        <button
          type="submit"
          disabled={loading}
          className="ohana-submit-btn"
        >
          {loading
            ? 'Cargando...'
            : isRegisterMode
            ? 'Crear Cuenta'
            : 'Iniciar Sesión'}
        </button>

        {/* Pie: Enlace Toggle */}
        <div className="ohana-footer-text">
          {isRegisterMode ? (
            <p>
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                className="ohana-action-link"
                onClick={() => {
                  setError('');
                  setIsRegisterMode(false);
                }}
              >
                Inicia sesión aquí.
              </button>
            </p>
          ) : (
            <p>
              ¿No tienes una cuenta?{' '}
              <button
                type="button"
                className="ohana-action-link"
                onClick={() => {
                  setError('');
                  setIsRegisterMode(true);
                }}
              >
                Regístrate ahora.
              </button>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
