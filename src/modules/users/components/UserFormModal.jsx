import React, { useState, useRef } from 'react';
import { Camera, Eye, EyeOff, User, Trash2 } from 'lucide-react';
import Modal from '../../../components/common/Modal';

import { compressAvatarImage } from '../../../utils/storageUtils';

export const UserFormModal = ({ isOpen, onClose, onSave, editingUser = null }) => {
  const fileInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getInitialFormData = (u) => ({
    name: u?.name || '',
    email: u?.email || '',
    phone: u?.phone || '',
    password: '',
    role: u?.role || 'CASHIER',
    is_active: u?.is_active !== false,
    avatar_url: u?.avatar_url || null,
  });

  const [formData, setFormData] = useState(() => getInitialFormData(editingUser));
  const [prevEditingUser, setPrevEditingUser] = useState(editingUser);

  if (editingUser !== prevEditingUser) {
    setPrevEditingUser(editingUser);
    setFormData(getInitialFormData(editingUser));
    setError('');
  }

  const roles = [
    { id: 'ADMIN', title: 'Administrador', desc: 'Control total del sistema' },
    { id: 'CASHIER', title: 'Cajero (POS)', desc: 'Facturación y caja chica' },
    { id: 'CHEF', title: 'Chef / Cocina', desc: 'KDS comanda de cocina' },
    { id: 'WAITER', title: 'Mozo / Salón', desc: 'Atención a mesas' },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Subir imagen, redimensionar a 128x128 y comprimir a JPEG ultraligero (~10KB)
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }

    try {
      const compressedDataUrl = await compressAvatarImage(file, 128, 128, 0.8);
      setFormData((prev) => ({ ...prev, avatar_url: compressedDataUrl }));
    } catch {
      setError('No se pudo procesar la imagen seleccionada');
    }
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('El nombre del colaborador es obligatorio');
      return;
    }

    if (!formData.email.trim()) {
      setError('El correo electrónico es obligatorio');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await onSave(formData, editingUser?.id);
      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Error al guardar colaborador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingUser ? `Editar Colaborador: ${editingUser.name}` : 'Crear Nuevo Colaborador'}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} className="user-modal-form">
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

        {/* Sección de Foto de Perfil */}
        <div className="avatar-upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div
            className="avatar-preview-box"
            onClick={() => fileInputRef.current?.click()}
            title="Haz clic para cambiar la foto"
          >
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt="Avatar"
                className="avatar-preview-img"
              />
            ) : (
              <div className="avatar-placeholder-glow">
                <User size={36} />
              </div>
            )}
            <div className="avatar-overlay-hover">
              <Camera size={22} />
            </div>
          </div>

          <div className="avatar-buttons-group">
            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={14} />
              <span>{formData.avatar_url ? 'Cambiar Foto' : 'Subir Foto'}</span>
            </button>
            {formData.avatar_url && (
              <button
                type="button"
                className="avatar-remove-btn"
                onClick={handleRemoveAvatar}
              >
                <Trash2 size={13} style={{ display: 'inline', marginRight: '3px' }} />
                Quitar
              </button>
            )}
          </div>
        </div>

        {/* Grid de Campos */}
        <div className="user-form-grid">
          <div className="form-group-custom form-full-col">
            <label htmlFor="name">Nombre y Apellidos</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ej: Daniel Paredes Gómez"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group-custom">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="daniel@ohanamakis.pe"
              value={formData.email}
              onChange={handleChange}
              disabled={!!editingUser}
              required
            />
          </div>

          <div className="form-group-custom">
            <label htmlFor="phone">Teléfono / WhatsApp</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+51 987 654 321"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {!editingUser && (
            <div className="form-group-custom form-full-col">
              <label htmlFor="password">Contraseña de Acceso</label>
              <div className="input-with-icon-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingUser}
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
          )}

          {/* Selector de Rol */}
          <div className="form-group-custom form-full-col">
            <label>Rol y Permisos</label>
            <div className="roles-selector-grid">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`role-tile-btn ${formData.role === r.id ? 'selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, role: r.id }))}
                >
                  <span className="role-tile-title">{r.title}</span>
                  <span className="role-tile-desc">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estado Activo / Inactivo */}
          <div className="form-group-custom form-full-col">
            <label className="user-checkbox-wrapper">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: '#f97316' }}
              />
              <span>Colaborador activo (habilitado para operar en el sistema)</span>
            </label>
          </div>
        </div>

        {/* Acciones */}
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
            {loading ? 'Guardando...' : editingUser ? 'Actualizar Colaborador' : 'Crear Colaborador'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;
