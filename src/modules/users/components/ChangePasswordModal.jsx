import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import Modal from '../../../components/common/Modal';

export const ChangePasswordModal = ({ isOpen, onClose, user, onPasswordChange }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await onPasswordChange(user, password);
      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar Contraseña"
      maxWidth="440px"
    >
      <form onSubmit={handleSubmit} className="user-modal-form">
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
          }}>
            <KeyRound size={22} />
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Actualizar clave de acceso para <strong style={{ color: '#0f172a' }}>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
          }}>
            {error}
          </div>
        )}

        <div className="form-group-custom">
          <label htmlFor="new_password">Nueva Contraseña</label>
          <div className="input-with-icon-wrapper">
            <input
              id="new_password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="pwd-toggle-inside"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="form-group-custom">
          <label htmlFor="confirm_password">Confirmar Contraseña</label>
          <input
            id="confirm_password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Repite la nueva contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <div className="user-modal-actions">
          <button
            type="button"
            className="btn-secondary-custom"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary-custom"
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
