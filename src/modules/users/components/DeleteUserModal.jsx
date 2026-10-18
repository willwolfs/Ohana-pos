import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from '../../../components/common/Modal';

export const DeleteUserModal = ({ isOpen, onClose, user, onConfirmDelete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await onConfirmDelete(user);
      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eliminar Colaborador"
      maxWidth="440px"
    >
      <div className="user-modal-form" style={{ textAlign: 'center' }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 8px',
        }}>
          <AlertTriangle size={26} />
        </div>

        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
          ¿Estás seguro de eliminar a este colaborador?
        </h3>

        <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
          Se eliminará la cuenta y perfil de <strong style={{ color: '#0f172a' }}>{user?.name}</strong> ({user?.email}). Esta acción no se puede deshacer.
        </p>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        <div className="user-modal-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-secondary-custom"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger-custom"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 size={16} />
            <span>{loading ? 'Eliminando...' : 'Sí, Eliminar'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteUserModal;
