import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { User, Building2, FileText, Phone, Mail, MapPin, Tag, Heart, MessageSquare } from 'lucide-react';

export const CustomerModal = ({ isOpen, onClose, onSave, customer = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    doc_type: 'DNI',
    doc_number: '',
    phone: '',
    email: '',
    address: '',
    category: 'Nuevo',
    favorite_roll: 'Acevichado Maki',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        business_name: customer.business_name && customer.business_name !== '-' ? customer.business_name : '',
        doc_type: customer.doc_type || (customer.doc_number?.length === 11 ? 'RUC' : 'DNI'),
        doc_number: customer.doc_number || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        category: customer.category || 'Nuevo',
        favorite_roll: customer.favorite_roll || 'Acevichado Maki',
        notes: customer.notes || '',
      });
    } else {
      setFormData({
        name: '',
        business_name: '',
        doc_type: 'DNI',
        doc_number: '',
        phone: '',
        email: '',
        address: '',
        category: 'Nuevo',
        favorite_roll: 'Acevichado Maki',
        notes: '',
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-switch doc type based on length if user types 11 digits
      if (field === 'doc_number') {
        const clean = value.replace(/\D/g, '');
        updated.doc_number = clean;
        if (clean.length === 11) {
          updated.doc_type = 'RUC';
          if (updated.category === 'Nuevo') updated.category = 'Empresa';
        } else if (clean.length === 8 && updated.doc_type === 'RUC') {
          updated.doc_type = 'DNI';
        }
      }
      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del cliente es obligatorio';
    }

    if (formData.doc_type === 'DNI' && formData.doc_number && formData.doc_number.length !== 8) {
      newErrors.doc_number = 'El DNI debe tener exactamente 8 dígitos';
    }

    if (formData.doc_type === 'RUC' && formData.doc_number && formData.doc_number.length !== 11) {
      newErrors.doc_number = 'El RUC debe tener exactamente 11 dígitos';
    }

    if (formData.doc_type === 'RUC' && !formData.business_name.trim()) {
      newErrors.business_name = 'La Razón Social es obligatoria para clientes con RUC';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...(customer || {}),
      ...formData,
      business_name: formData.business_name.trim() || '-',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente'}
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} className="customer-modal-form">
        {/* Nombre del Cliente */}
        <div className="form-group-custom">
          <label className="input-label-custom">
            <User size={15} />
            <span>Nombre del Cliente / Contacto *</span>
          </label>
          <input
            type="text"
            className={`input-control-custom ${errors.name ? 'is-invalid' : ''}`}
            placeholder="Ej: Carlos Mendoza o Lucía Fernández"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            autoFocus
          />
          {errors.name && <span className="field-error-text">{errors.name}</span>}
        </div>

        {/* Razón Social (Separado) */}
        <div className="form-group-custom">
          <label className="input-label-custom">
            <Building2 size={15} />
            <span>Razón Social {formData.doc_type === 'RUC' ? '*' : '(Opcional para empresas)'}</span>
          </label>
          <input
            type="text"
            className={`input-control-custom ${errors.business_name ? 'is-invalid' : ''}`}
            placeholder="Ej: Innova Solutions S.A.C. o Corporación Gastronómica Lima S.A.C."
            value={formData.business_name}
            onChange={(e) => handleChange('business_name', e.target.value)}
          />
          {errors.business_name && <span className="field-error-text">{errors.business_name}</span>}
        </div>

        {/* Tipo y Número de Documento */}
        <div className="form-row-two-col">
          <div className="form-group-custom">
            <label className="input-label-custom">
              <FileText size={15} />
              <span>Tipo de Documento</span>
            </label>
            <select
              className="input-control-custom"
              value={formData.doc_type}
              onChange={(e) => handleChange('doc_type', e.target.value)}
            >
              <option value="DNI">DNI (8 dígitos)</option>
              <option value="RUC">RUC (11 dígitos - Factura)</option>
              <option value="CE">Carnet de Extranjería</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </div>

          <div className="form-group-custom">
            <label className="input-label-custom">
              <span>N° de Documento</span>
            </label>
            <input
              type="text"
              maxLength={formData.doc_type === 'RUC' ? 11 : formData.doc_type === 'DNI' ? 8 : 15}
              className={`input-control-custom ${errors.doc_number ? 'is-invalid' : ''}`}
              placeholder={formData.doc_type === 'RUC' ? '11 dígitos' : '8 dígitos'}
              value={formData.doc_number}
              onChange={(e) => handleChange('doc_number', e.target.value)}
            />
            {errors.doc_number && <span className="field-error-text">{errors.doc_number}</span>}
          </div>
        </div>

        {/* Teléfono y Correo */}
        <div className="form-row-two-col">
          <div className="form-group-custom">
            <label className="input-label-custom">
              <Phone size={15} />
              <span>Teléfono / WhatsApp</span>
            </label>
            <input
              type="tel"
              className="input-control-custom"
              placeholder="Ej: 987 654 321"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>

          <div className="form-group-custom">
            <label className="input-label-custom">
              <Mail size={15} />
              <span>Correo Electrónico</span>
            </label>
            <input
              type="email"
              className="input-control-custom"
              placeholder="cliente@ejemplo.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
        </div>

        {/* Categoría y Maki Favorito */}
        <div className="form-row-two-col">
          <div className="form-group-custom">
            <label className="input-label-custom">
              <Tag size={15} />
              <span>Categoría</span>
            </label>
            <select
              className="input-control-custom"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              <option value="Nuevo">Nuevo Cliente</option>
              <option value="Frecuente">Cliente Frecuente</option>
              <option value="Empresa">Empresa / Corporativo</option>
            </select>
          </div>

          <div className="form-group-custom">
            <label className="input-label-custom">
              <Heart size={15} />
              <span>Maki / Plato Preferido</span>
            </label>
            <input
              type="text"
              className="input-control-custom"
              placeholder="Ej: Acevichado Maki, Furai..."
              value={formData.favorite_roll}
              onChange={(e) => handleChange('favorite_roll', e.target.value)}
            />
          </div>
        </div>

        {/* Dirección de Entrega */}
        <div className="form-group-custom">
          <label className="input-label-custom">
            <MapPin size={15} />
            <span>Dirección / Referencia para Delivery</span>
          </label>
          <input
            type="text"
            className="input-control-custom"
            placeholder="Calle, Número, Distrito, Ref..."
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>

        {/* Notas y Preferencias */}
        <div className="form-group-custom">
          <label className="input-label-custom">
            <MessageSquare size={15} />
            <span>Preferencias, Alergias u Observaciones</span>
          </label>
          <textarea
            className="input-control-custom textarea-custom"
            rows="2"
            placeholder="Ej: Alergia al ajonjolí, prefiere salsa teriyaki aparte..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </div>

        {/* Botones de acción */}
        <div className="modal-actions-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            {customer ? 'Guardar Cambios' : 'Registrar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerModal;
