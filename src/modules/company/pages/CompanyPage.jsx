import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button';
import {
  Building2,
  FileText,
  MapPin,
  KeyRound,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Save,
  FileCheck,
  Receipt,
  Server,
  Lock,
  ExternalLink,
  Sliders,
  Key,
  LayoutTemplate,
  Globe,
  Radio,
  FileCode,
  Moon,
  Sun,
  Check,
  Image,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import '../../pos/styles/PrintTicketModal.css';

const COMPANY_STORAGE_KEY = 'ohana_company_config';

const DEFAULT_COMPANY_CONFIG = {
  ruc: '20606488506',
  business_name: 'OHANA MAKIS & SUSHI BAR S.A.C.',
  commercial_name: 'Ohana Makis & Sushi Bar',
  ubigeo: '250105',
  address: 'JR. 2 DE MAYO 450 - YARINACOCHA',
  department: 'UCAYALI',
  province: 'CORONEL PORTILLO',
  district: 'YARINACOCHA',
  phone: '987 654 321',
  email: 'facturacion@ohanamakis.com',
  sunat_user: 'MODDATOS',
  sunat_password: 'PasswordSol2026',
  environment: 'production', // 'production' | 'beta'
  cert_file_name: 'certificado_tributario_ohana.pfx',
  cert_password: 'CertPassword2026',
  cert_status: 'VIGENTE',
  cert_expiration: '2027-10-15',
  // Tokens y APIs
  api_dni_ruc_provider: 'apisperu', // 'apisperu' | 'decolecta' | 'custom'
  api_dni_ruc_token: '',
  api_facturacion_provider: 'nubefact', // 'nubefact' | 'ose' | 'custom'
  api_facturacion_url: '',
  api_facturacion_token: '',
};

const DEPARTAMENTOS_PERU = [
  'UCAYALI',
  'LIMA',
  'AREQUIPA',
  'CUSCO',
  'LA LIBERTAD',
  'PIURA',
  'LAMBAYEQUE',
  'ANCASH',
  'JUNIN',
  'SAN MARTIN',
  'LORETO',
  'ICA',
  'TACNA',
  'PUNO',
  'HUANUCO',
  'AYACUCHO',
  'CAJAMARCA',
  'AMAZONAS',
  'MADRE DE DIOS',
  'MOQUEGUA',
  'PASCO',
  'TUMBES',
  'HUANCAVELICA',
  'APURIMAC',
];

export const CompanyPage = () => {
  const {
    theme,
    setTheme,
    appLogo,
    setAppLogo,
    resetAppLogo,
    loaderTheme,
    setLoaderTheme,
  } = useTheme();
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(COMPANY_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_COMPANY_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error cargando configuración de empresa', e);
    }
    return DEFAULT_COMPANY_CONFIG;
  });

  const [activeTab, setActiveTab] = useState('empresa'); // 'empresa' | 'apis' | 'interfaz'
  const [showSunatPass, setShowSunatPass] = useState(false);
  const [showCertPass, setShowCertPass] = useState(false);
  const [showDniToken, setShowDniToken] = useState(false);
  const [showFactToken, setShowFactToken] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [certUploaded, setCertUploaded] = useState(Boolean(formData.cert_file_name));

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        cert_file_name: file.name,
        cert_status: 'VIGENTE',
        cert_expiration: '2027-10-15',
      }));
      setCertUploaded(true);
    }
  };

  const [ticketLogo, setTicketLogo] = useState(() => {
    try {
      return localStorage.getItem('ohana_ticket_logo') || '';
    } catch {
      return '';
    }
  });

  const handleTicketLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setTicketLogo(base64);
        try {
          localStorage.setItem('ohana_ticket_logo', base64);
        } catch (err) {
          console.error('Error guardando logo de ticket:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetTicketLogo = () => {
    setTicketLogo('');
    try {
      localStorage.removeItem('ohana_ticket_logo');
    } catch (err) {
      console.error('Error removiendo logo de ticket:', err);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();

    // Validar RUC 11 dígitos
    if (!/^\d{11}$/.test(formData.ruc.trim())) {
      alert('El RUC debe tener exactamente 11 dígitos numéricos.');
      return;
    }

    try {
      localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(formData));
      window.dispatchEvent(new Event('ohana_company_updated'));
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (e) {
      console.error('Error guardando configuración de empresa', e);
      alert('Ocurrió un error al guardar la configuración.');
    }
  };

  return (
    <div className="module-page">
      {/* Encabezado */}
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title">
            {activeTab === 'empresa' && 'Datos de la Empresa'}
            {activeTab === 'apis' && 'Tokens de API & Servicios'}
            {activeTab === 'interfaz' && 'Personalización de Interfaz'}
          </h1>
          <p className="page-subtitle">
            {activeTab === 'empresa' && 'Razón social, domicilio fiscal, ubigeo y credenciales SUNAT para emisión de boletas y facturas'}
            {activeTab === 'apis' && 'Configuración de llaves de consulta de DNI/RUC y emisión electrónica'}
            {activeTab === 'interfaz' && 'Temas de color (Oscuro/Blanco), logotipo del sistema y pantalla de carga'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'empresa' && (
            <Button variant="primary" icon={Save} onClick={handleSave}>
              Guardar Configuración
            </Button>
          )}
        </div>
      </div>

      {/* Botones de Navegación / Configuración justo debajo del encabezado */}
      <div className="cash-tabs-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`cash-tab-btn ${activeTab === 'empresa' ? 'active' : ''}`}
          onClick={() => setActiveTab('empresa')}
        >
          <Building2 size={15} />
          <span>Datos de la Empresa</span>
        </button>

        <button
          type="button"
          className={`cash-tab-btn ${activeTab === 'apis' ? 'active' : ''}`}
          onClick={() => setActiveTab('apis')}
        >
          <Key size={15} />
          <span>Tokens de API & Servicios</span>
        </button>

        <button
          type="button"
          className={`cash-tab-btn ${activeTab === 'interfaz' ? 'active' : ''}`}
          onClick={() => setActiveTab('interfaz')}
        >
          <LayoutTemplate size={15} />
          <span>Interfaz</span>
        </button>
      </div>

      {/* Banner de Éxito al Guardar */}
      {saveSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#166534',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.88rem',
          }}
        >
          <CheckCircle2 size={18} color="#16a34a" />
          ¡Configuración de empresa y credenciales SUNAT guardadas exitosamente!
        </div>
      )}

      {/* Contenido condicional según pestaña activa */}
      {activeTab === 'empresa' && (
        <form onSubmit={handleSave} className="company-page-layout">
        <div>
          {/* =========================================================================
              SECCIÓN 1: IDENTIFICACIÓN FISCAL (RUC, RAZÓN SOCIAL, NOMBRE COMERCIAL)
              ========================================================================= */}
          <div className="company-card">
            <div className="company-card-header">
              <div className="company-card-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="company-card-title">Identificación Fiscal y Comercial</h3>
                <p className="company-card-subtitle">Datos tributarios registrados ante la SUNAT</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="company-form-grid-3">
                <div className="company-input-group">
                  <label className="company-label">RUC de la Empresa *</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formData.ruc}
                    onChange={(e) => handleChange('ruc', e.target.value.replace(/\D/g, ''))}
                    placeholder="20606488506"
                    required
                    className="company-input"
                    style={{ fontWeight: 700, letterSpacing: '0.5px' }}
                  />
                  <span className="company-input-hint">11 dígitos numéricos</span>
                </div>

                <div className="company-input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="company-label">Razón Social *</label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    placeholder="OHANA MAKIS & SUSHI BAR S.A.C."
                    required
                    className="company-input"
                  />
                  <span className="company-input-hint">Denominación legal registrada</span>
                </div>
              </div>

              <div className="company-form-grid-3">
                <div className="company-input-group">
                  <label className="company-label">Nombre Comercial *</label>
                  <input
                    type="text"
                    value={formData.commercial_name}
                    onChange={(e) => handleChange('commercial_name', e.target.value)}
                    placeholder="Ohana Makis & Sushi Bar"
                    required
                    className="company-input"
                  />
                  <span className="company-input-hint">Nombre de la marca o local</span>
                </div>

                <div className="company-input-group">
                  <label className="company-label">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="987 654 321"
                    className="company-input"
                  />
                  <span className="company-input-hint">Impreso en los comprobantes</span>
                </div>

                <div className="company-input-group">
                  <label className="company-label">Correo de Facturación</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contacto@ohanamakis.com"
                    className="company-input"
                  />
                  <span className="company-input-hint">Para envío de XML y CDR</span>
                </div>
              </div>

              {/* Logo para la Boleta / Comprobante */}
              <div
                style={{
                  marginTop: '0.25rem',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      padding: '2px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <img
                      src={ticketLogo || appLogo || '/assets/logo-ohana.png'}
                      alt="Logo Boleta"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      Logo de la Boleta / Ticket POS
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {ticketLogo ? 'Logo personalizado activo para impresión' : 'Logo predeterminado de Ohana Makis'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label
                    htmlFor="ticket-logo-input-fiscal"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#2563eb',
                      color: '#ffffff',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <Upload size={14} />
                    Cambiar Logo
                  </label>
                  <input
                    id="ticket-logo-input-fiscal"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleTicketLogoUpload}
                  />
                  {ticketLogo && (
                    <button
                      type="button"
                      onClick={handleResetTicketLogo}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Restablecer al logo predeterminado"
                    >
                      <RotateCcw size={13} />
                      Restablecer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECCIÓN 2: DIRECCIÓN FISCAL Y UBIGEO
              ========================================================================= */}
          <div className="company-card">
            <div className="company-card-header">
              <div className="company-card-icon-wrap" style={{ background: '#f8fafc', color: '#475569' }}>
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="company-card-title">Domicilio Fiscal y Ubicación</h3>
                <p className="company-card-subtitle">Dirección declarada en ficha RUC y código de Ubigeo</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="company-input-group">
                <label className="company-label">Dirección Fiscal Completa *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="JR. 2 DE MAYO 450 - YARINACOCHA"
                  required
                  className="company-input"
                />
                <span className="company-input-hint">Avenida, Jirón, Calle, Número o Lote</span>
              </div>

              <div className="company-form-grid-3">
                <div className="company-input-group">
                  <label className="company-label">Departamento *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className="company-input"
                  >
                    {DEPARTAMENTOS_PERU.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="company-input-group">
                  <label className="company-label">Provincia *</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => handleChange('province', e.target.value)}
                    placeholder="CORONEL PORTILLO"
                    required
                    className="company-input"
                  />
                </div>

                <div className="company-input-group">
                  <label className="company-label">Distrito *</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    placeholder="YARINACOCHA"
                    required
                    className="company-input"
                  />
                </div>
              </div>

              <div className="company-form-grid-2">
                <div className="company-input-group">
                  <label className="company-label">Código de Ubigeo (6 dígitos) *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.ubigeo}
                    onChange={(e) => handleChange('ubigeo', e.target.value.replace(/\D/g, ''))}
                    placeholder="250105"
                    required
                    className="company-input"
                    style={{ fontWeight: 600, letterSpacing: '1px' }}
                  />
                  <span className="company-input-hint">Código INEI requerido por SUNAT (ej. 250105)</span>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.78rem',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span>
                    El Ubigeo se incluye automáticamente en los archivos XML de Facturas y Boletas electrónicas.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECCIÓN 3: USUARIO SECUNDARIO SUNAT Y ENTORNO
              ========================================================================= */}
          <div className="company-card">
            <div className="company-card-header">
              <div className="company-card-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="company-card-title">Usuario Secundario SUNAT (Clave SOL)</h3>
                <p className="company-card-subtitle">
                  Credenciales de acceso para el envío de comprobantes al OSE / SUNAT
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="company-form-grid-2">
                <div className="company-input-group">
                  <label className="company-label">Usuario Secundario SOL *</label>
                  <input
                    type="text"
                    value={formData.sunat_user}
                    onChange={(e) => handleChange('sunat_user', e.target.value)}
                    placeholder="MODDATOS"
                    required
                    className="company-input"
                    style={{ fontWeight: 600 }}
                  />
                  <span className="company-input-hint">Usuario creado en Clave SOL con perfil Facturación</span>
                </div>

                <div className="company-input-group">
                  <label className="company-label">Clave Usuario Secundario *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSunatPass ? 'text' : 'password'}
                      value={formData.sunat_password}
                      onChange={(e) => handleChange('sunat_password', e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="company-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSunatPass(!showSunatPass)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {showSunatPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="company-input-hint">Contraseña secreta del usuario secundario</span>
                </div>
              </div>

              <div className="company-form-grid-2">
                <div className="company-input-group">
                  <label className="company-label">Entorno de Emisión *</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => handleChange('environment', e.target.value)}
                    className="company-input"
                    style={{ fontWeight: 600 }}
                  >
                    <option value="production">Producción (Validez Fiscal Real)</option>
                    <option value="beta">Beta / Pruebas (Homologación y Pruebas)</option>
                  </select>
                </div>

                <div
                  style={{
                    background: formData.environment === 'production' ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${formData.environment === 'production' ? '#bbf7d0' : '#fde68a'}`,
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.78rem',
                    color: formData.environment === 'production' ? '#166534' : '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Server size={18} style={{ flexShrink: 0 }} />
                  <span>
                    {formData.environment === 'production'
                      ? 'Emisión conectada a SUNAT Oficial con envío directo de comprobantes.'
                      : 'Modo de prueba activo: los comprobantes no tienen efecto tributario.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECCIÓN 4: ADJUNTAR CERTIFICADO DIGITAL (.PFX / .P12)
              ========================================================================= */}
          <div className="company-card">
            <div className="company-card-header">
              <div className="company-card-icon-wrap" style={{ background: '#ecfdf5', color: '#16a34a' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="company-card-title">Certificado Digital Tributario</h3>
                <p className="company-card-subtitle">Firma digital para validar y sellar los archivos XML</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Dropzone de carga */}
              <label className="company-cert-dropzone">
                <input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={20} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                  Haga clic para adjuntar su Certificado Digital (.pfx o .p12)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Formatos aceptados: PKCS#12 (.pfx, .p12) emitido por entidad acreditada (Llama.pe, Reniec, etc.)
                </div>
              </label>

              {/* Estado del Certificado Actual */}
              {certUploaded && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#ecfdf5',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileCheck size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                        {formData.cert_file_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>
                        ● Estado: {formData.cert_status} (Válido hasta: {formData.cert_expiration})
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#16a34a',
                      border: '1px solid #bbf7d0',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    VIGENTE
                  </span>
                </div>
              )}

              {/* Contraseña del certificado */}
              <div className="company-form-grid-2">
                <div className="company-input-group">
                  <label className="company-label">Contraseña del Certificado Digital *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCertPass ? 'text' : 'password'}
                      value={formData.cert_password}
                      onChange={(e) => handleChange('cert_password', e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="company-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCertPass(!showCertPass)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {showCertPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="company-input-hint">Clave privada para la firma de los comprobantes</span>
                </div>

                <div className="company-input-group">
                  <label className="company-label">Fecha de Caducidad</label>
                  <input
                    type="date"
                    value={formData.cert_expiration}
                    onChange={(e) => handleChange('cert_expiration', e.target.value)}
                    className="company-input"
                  />
                  <span className="company-input-hint">Para alertas preventivas de renovación</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUMNA LATERAL: VISTA PREVIA DEL TICKET / COMPROBANTE
            ========================================================================= */}
        <div>
          <div className="company-card" style={{ position: 'sticky', top: '1rem' }}>
            <div className="company-card-header">
              <div className="company-card-icon-wrap" style={{ background: '#f8fafc', color: '#475569' }}>
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="company-card-title">Boleta de Venta POS</h3>
                <p className="company-card-subtitle">Vista previa con el diseño idéntico al ticket impreso en caja</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                className="dolce-ticket-container"
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  padding: '18px 14px',
                }}
              >
                {/* Cabecera del ticket POS */}
                <div className="dolce-header">
                  <img
                    src={ticketLogo || appLogo || '/assets/logo-ohana.png'}
                    alt="Logo"
                    className="dolce-logo"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', color: '#000', margin: '4px 0 2px' }}>
                    {formData.commercial_name || 'OHANA MAKIS & SUSHI BAR'}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#333', marginBottom: '3px' }}>
                    {formData.business_name || 'OHANA MAKIS & SUSHI BAR S.A.C.'}
                  </div>
                  <div className="dolce-ruc">RUC: {formData.ruc || '20606488506'}</div>
                  <div className="dolce-address">{formData.address || 'JR. 2 DE MAYO 450 - YARINACOCHA'}</div>
                  <div className="dolce-address">
                    {formData.district || 'YARINACOCHA'} - {formData.province || 'CORONEL PORTILLO'} - {formData.department || 'UCAYALI'}
                  </div>
                  {(formData.phone || formData.email) && (
                    <div style={{ fontSize: '8.5px', color: '#444', marginTop: '2px' }}>
                      {formData.phone ? `Tel: ${formData.phone}` : ''} {formData.phone && formData.email ? ' | ' : ''} {formData.email || ''}
                    </div>
                  )}
                </div>

                <div className="dolce-dashed-line" />

                {/* Tipo de Documento y Folio */}
                <div className="dolce-doc-box">
                  <div className="dolce-doc-title">BOLETA DE VENTA ELECTRÓNICA</div>
                  <div className="dolce-folio">FOLIO: B001-00001234</div>
                  <div className="dolce-datetime">
                    {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })} 08:30 PM
                  </div>
                </div>

                <div className="dolce-dashed-line" />

                {/* Datos del Cliente */}
                <div className="dolce-meta-box" style={{ textAlign: 'left', fontSize: '11px' }}>
                  <div className="dolce-meta-row">
                    <span>DNI:</span>
                    <span style={{ fontWeight: 'bold' }}>72849102</span>
                  </div>
                  <div className="dolce-meta-row">
                    <span>CLIENTE:</span>
                    <span style={{ fontWeight: 'bold' }}>CLIENTE GENERAL</span>
                  </div>
                </div>

                <div className="dolce-dashed-line" />

                {/* Tabla de Productos / Consumo */}
                <table className="dolce-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28px', textAlign: 'left' }}>CANT</th>
                      <th style={{ textAlign: 'left' }}>PRODUCTO</th>
                      <th style={{ width: '58px', textAlign: 'right' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>1</td>
                      <td style={{ fontWeight: 600 }}>ACEVICHADO ROLL 10 PZ</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/ 28.00</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>1</td>
                      <td style={{ fontWeight: 600 }}>FURAI ROLL 10 PZ</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/ 26.00</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>1</td>
                      <td style={{ fontWeight: 600 }}>GASEOSA INCA KOLA 500ML</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/ 5.00</td>
                    </tr>
                  </tbody>
                </table>

                <div className="dolce-dashed-line" />

                {/* Subtotales e Impuestos */}
                <div className="dolce-meta-box" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  <div className="dolce-meta-row">
                    <span>OP. GRAVADA:</span>
                    <span>S/ 50.00</span>
                  </div>
                  <div className="dolce-meta-row">
                    <span>I.G.V. (18%):</span>
                    <span>S/ 9.00</span>
                  </div>
                </div>

                {/* Total */}
                <div className="dolce-total-row">
                  <span>TOTAL:</span>
                  <span>S/ 59.00</span>
                </div>

                <div className="dolce-dashed-line" />

                {/* Metadatos de Pago y Atención */}
                <div className="dolce-meta-box">
                  <div className="dolce-meta-row">
                    <span>Forma de Pago:</span>
                    <span style={{ fontWeight: 'bold' }}>EFECTIVO</span>
                  </div>
                  <div className="dolce-meta-row">
                    <span>Modalidad:</span>
                    <span style={{ fontWeight: 'bold' }}>MESA 4</span>
                  </div>
                  <div className="dolce-meta-row">
                    <span>Atendido por:</span>
                    <span style={{ fontWeight: 'bold' }}>ADMIN OHANA</span>
                  </div>
                </div>

                {/* Ticket de Cocina / Turno */}
                <div className="dolce-turn-box" style={{ marginTop: '8px' }}>
                  <div className="dolce-turn-sub">TICKET DE COCINA</div>
                  <div className="dolce-turn-num">TURNO #1</div>
                  <div className="dolce-turn-note">Atento al llamado en pantalla / barra</div>
                </div>

                {/* Pie del Ticket */}
                <div className="dolce-footer">
                  <div>¡Gracias por tu preferencia!</div>
                  <div style={{ fontWeight: 'bold' }}>Ohana POS</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <Button variant="primary" icon={Save} type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                Guardar Configuración
              </Button>
            </div>
          </div>
        </div>
      </form>
      )}

      {/* =========================================================================
          PESTAÑA 2: TOKENS DE API & SERVICIOS EXTERNOS (DNI/RUC Y FACTURACIÓN)
          ========================================================================= */}
      {activeTab === 'apis' && (
        <form onSubmit={handleSave} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: API de Consulta DNI / RUC */}
          <div className="company-card" style={{ marginBottom: 0 }}>
            <div className="company-card-header">
              <div className="company-card-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Key size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 className="company-card-title">Token API - Consulta de DNI y RUC</h3>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: formData.api_dni_ruc_token?.trim() ? '#ecfdf5' : '#f8fafc',
                      color: formData.api_dni_ruc_token?.trim() ? '#166534' : '#64748b',
                      border: '1px solid',
                      borderColor: formData.api_dni_ruc_token?.trim() ? '#bbf7d0' : '#e2e8f0',
                    }}
                  >
                    {formData.api_dni_ruc_token?.trim() ? 'CONECTADO / ACTIVO' : 'SIN CONFIGURAR'}
                  </span>
                </div>
                <p className="company-card-subtitle">
                  Búsqueda automática de datos de clientes con RENIEC y SUNAT al emitir comprobantes en el POS
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="company-form-grid-2">
                <div className="company-input-group">
                  <label className="company-label">Proveedor de Consulta</label>
                  <select
                    value={formData.api_dni_ruc_provider || 'apisperu'}
                    onChange={(e) => handleChange('api_dni_ruc_provider', e.target.value)}
                    className="company-input"
                  >
                    <option value="apisperu">ApisPerú (Recomendado)</option>
                    <option value="decolecta">Decolecta / ApiReniec</option>
                    <option value="sunat_directo">SUNAT / RENIEC Directo</option>
                    <option value="custom">API Personalizada / Servidor Propio</option>
                  </select>
                  <span className="company-input-hint">Selecciona la plataforma con la que tienes tu suscripción</span>
                </div>

                <div className="company-input-group">
                  <label className="company-label">Bearer Token de Autorización</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showDniToken ? 'text' : 'password'}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={formData.api_dni_ruc_token || ''}
                      onChange={(e) => handleChange('api_dni_ruc_token', e.target.value)}
                      className="company-input"
                      style={{ paddingRight: '2.5rem', fontFamily: showDniToken ? 'monospace' : 'inherit' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDniToken(!showDniToken)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '4px',
                      }}
                      title={showDniToken ? 'Ocultar token' : 'Mostrar token'}
                    >
                      {showDniToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="company-input-hint">Pega aquí el Token que te brinda tu proveedor de API</span>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '0.82rem',
                  color: '#475569',
                }}
              >
                <Globe size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                    Autocompletado instantáneo en Caja POS
                  </div>
                  Al digitar un DNI (8 dígitos) o RUC (11 dígitos) en el punto de venta, Ohana buscará el nombre o razón social y dirección fiscal automáticamente.
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: API de Facturación Electrónica */}
          <div className="company-card" style={{ marginBottom: 0 }}>
            <div className="company-card-header">
              <div className="company-card-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Receipt size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 className="company-card-title">Token API - Facturación Electrónica SUNAT</h3>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: formData.api_facturacion_token?.trim() ? '#ecfdf5' : '#f8fafc',
                      color: formData.api_facturacion_token?.trim() ? '#166534' : '#64748b',
                      border: '1px solid',
                      borderColor: formData.api_facturacion_token?.trim() ? '#bbf7d0' : '#e2e8f0',
                    }}
                  >
                    {formData.api_facturacion_token?.trim() ? 'PSE / OSE VINCULADO' : 'PENDIENTE'}
                  </span>
                </div>
                <p className="company-card-subtitle">
                  Conexión con el Proveedor de Servicios Electrónicos (PSE / OSE) para el envío y firmado de comprobantes
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="company-form-grid-3">
                <div className="company-input-group">
                  <label className="company-label">Proveedor / Sistema PSE</label>
                  <select
                    value={formData.api_facturacion_provider || 'nubefact'}
                    onChange={(e) => handleChange('api_facturacion_provider', e.target.value)}
                    className="company-input"
                  >
                    <option value="nubefact">NubeFact (API REST)</option>
                    <option value="ose_bizlinks">Bizlinks OSE</option>
                    <option value="ose_efact">eFact OSE</option>
                    <option value="custom">Webservice SUNAT Directo</option>
                  </select>
                </div>

                <div className="company-input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="company-label">Ruta / Endpoint de Facturación (URL)</label>
                  <input
                    type="text"
                    placeholder="https://api.nubefact.com/api/v1/..."
                    value={formData.api_facturacion_url || ''}
                    onChange={(e) => handleChange('api_facturacion_url', e.target.value)}
                    className="company-input"
                  />
                  <span className="company-input-hint">URL de envío de boletas, facturas y notas de crédito</span>
                </div>
              </div>

              <div className="company-input-group">
                <label className="company-label">Token de Acceso / Auth Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showFactToken ? 'text' : 'password'}
                    placeholder="Pega aquí el Token de Facturación proporcionado por tu PSE..."
                    value={formData.api_facturacion_token || ''}
                    onChange={(e) => handleChange('api_facturacion_token', e.target.value)}
                    className="company-input"
                    style={{ paddingRight: '2.5rem', fontFamily: showFactToken ? 'monospace' : 'inherit' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFactToken(!showFactToken)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: '4px',
                    }}
                    title={showFactToken ? 'Ocultar token' : 'Mostrar token'}
                  >
                    {showFactToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="company-input-hint">Llave segura para autorizar las transacciones XML y generación de CDR</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '0.5rem' }}>
            <Button variant="primary" icon={Save} type="submit">
              Guardar Credenciales de API
            </Button>
          </div>
        </form>
      )}

      {/* =========================================================================
          PESTAÑA 3: CONFIGURACIÓN DE INTERFAZ (MODO OSCURO Y MODO BLANCO)
          ========================================================================= */}
      {activeTab === 'interfaz' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="company-card" style={{ marginBottom: 0 }}>
            <div className="company-card-header">
              <div className="company-card-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <LayoutTemplate size={20} />
              </div>
              <div>
                <h3 className="company-card-title">Tema y Apariencia Visual</h3>
                <p className="company-card-subtitle">
                  Elige el esquema de colores para la barra lateral, cabecera y paneles del sistema
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="theme-selector-grid">
                {/* Opción 1: Modo Oscuro (Imagen 1) */}
                <div
                  className={`theme-option-card ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="theme-preview-box dark">
                    <div className="mockup-sidebar">
                      <div className="mockup-nav-item active" />
                      <div className="mockup-nav-item" />
                      <div className="mockup-nav-item" />
                      <div className="mockup-nav-item" />
                    </div>
                    <div className="mockup-content">
                      <div className="mockup-header">
                        <div className="mockup-circle" />
                        <div className="mockup-circle" />
                      </div>
                      <div className="mockup-body">
                        <div className="mockup-card">
                          <div className="mockup-line" style={{ width: '65%' }} />
                          <div className="mockup-line" style={{ width: '45%' }} />
                          <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                            <div style={{ width: '38px', height: '10px', borderRadius: '3px', background: '#2563eb' }} />
                            <div style={{ width: '32px', height: '10px', borderRadius: '3px', background: 'rgba(255,255,255,0.18)' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#0f172a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Moon size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                          Modo Oscuro
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Sidebar y Header negros (Estilo Ohana original)
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: theme === 'dark' ? '#2563eb' : '#cbd5e1',
                        background: theme === 'dark' ? '#2563eb' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {theme === 'dark' && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>

                {/* Opción 2: Modo Blanco (Imagen 2) */}
                <div
                  className={`theme-option-card ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="theme-preview-box light">
                    <div className="mockup-sidebar">
                      <div className="mockup-nav-item active" />
                      <div className="mockup-nav-item" />
                      <div className="mockup-nav-item" />
                      <div className="mockup-nav-item" />
                    </div>
                    <div className="mockup-content">
                      <div className="mockup-header">
                        <div className="mockup-circle" />
                        <div className="mockup-circle" />
                      </div>
                      <div className="mockup-body">
                        <div className="mockup-card">
                          <div className="mockup-line" style={{ width: '65%' }} />
                          <div className="mockup-line" style={{ width: '45%' }} />
                          <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                            <div style={{ width: '38px', height: '10px', borderRadius: '3px', background: '#2563eb' }} />
                            <div style={{ width: '32px', height: '10px', borderRadius: '3px', background: '#e2e8f0' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          color: '#2563eb',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Sun size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                          Modo Blanco / Claro
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Sidebar y Header blancos (Estilo CharaPOS limpio)
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: theme === 'light' ? '#2563eb' : '#cbd5e1',
                        background: theme === 'light' ? '#2563eb' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {theme === 'light' && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                    Tema activo actualmente: {theme === 'dark' ? 'Modo Oscuro' : 'Modo Blanco / Claro'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    El cambio se aplica instantáneamente en toda la aplicación y se guarda en tu navegador.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  Alternar a {theme === 'dark' ? 'Modo Blanco' : 'Modo Oscuro'}
                </Button>
              </div>
            </div>

            {/* SECCIÓN 2: LOGOTIPO / ICONO DEL SISTEMA */}
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Icono y Logotipo del Sistema
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    Personaliza la imagen del logo circular que se muestra en la barra lateral y en la pantalla de carga.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  padding: '1.25rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Vista previa del logo circular */}
                <div style={{ position: 'relative' }}>
                  <img
                    src={appLogo}
                    alt="Logo del Sistema"
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #2563eb',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                      display: 'block',
                      background: '#000000',
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    Cambiar imagen del Logo
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '12px', lineHeight: 1.4 }}>
                    Sube una imagen cuadrada (PNG, JPG, SVG o WebP). Se adaptará automáticamente al formato circular del sistema.
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label
                      htmlFor="system-logo-upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#2563eb',
                        color: '#ffffff',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <Upload size={15} />
                      Subir Nuevo Icono
                    </label>
                    <input
                      id="system-logo-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result;
                          if (base64) {
                            setAppLogo(base64);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => resetAppLogo()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Restablecer al logo original de Ohana Makis"
                    >
                      <RotateCcw size={14} />
                      Restablecer Original
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: PANTALLA DE CARGA (3 TEMAS DE COLOR) */}
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Palette size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Color de la Pantalla de Carga
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    Selecciona el esquema de colores para la animación de inicio y carga de datos.
                  </p>
                </div>
              </div>

              {/* Grid de 3 opciones de colores para la pantalla de carga */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
              >
                {/* 1. Determinado (Original: Azul Marino Profundo con Naranja Maki) */}
                <div
                  className={`theme-option-card ${loaderTheme === 'default' ? 'active' : ''}`}
                  onClick={() => setLoaderTheme('default')}
                  role="button"
                  tabIndex={0}
                  style={{ padding: '1rem' }}
                >
                  <div
                    style={{
                      height: '100px',
                      borderRadius: '8px',
                      background: 'radial-gradient(circle at center, #172134 0%, #0b0f19 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '2px solid rgba(249, 115, 22, 0.4)',
                        boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)',
                      }}
                    />
                    <img
                      src={appLogo}
                      alt="Logo"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        zIndex: 1,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                        Determinado
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Azul marino con naranja Maki
                      </div>
                    </div>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: loaderTheme === 'default' ? '#2563eb' : '#cbd5e1',
                        background: loaderTheme === 'default' ? '#2563eb' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {loaderTheme === 'default' && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>
                </div>

                {/* 2. Negro con Rojo */}
                <div
                  className={`theme-option-card ${loaderTheme === 'black-red' ? 'active' : ''}`}
                  onClick={() => setLoaderTheme('black-red')}
                  role="button"
                  tabIndex={0}
                  style={{ padding: '1rem' }}
                >
                  <div
                    style={{
                      height: '100px',
                      borderRadius: '8px',
                      background: 'radial-gradient(circle at center, #1a0505 0%, #000000 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid #270707',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '2px solid rgba(239, 68, 68, 0.5)',
                        boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
                      }}
                    />
                    <img
                      src={appLogo}
                      alt="Logo"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        zIndex: 1,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                        Negro con Rojo
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Fondo negro con destellos rojos
                      </div>
                    </div>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: loaderTheme === 'black-red' ? '#2563eb' : '#cbd5e1',
                        background: loaderTheme === 'black-red' ? '#2563eb' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {loaderTheme === 'black-red' && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>
                </div>

                {/* 3. Celeste y Blanco */}
                <div
                  className={`theme-option-card ${loaderTheme === 'cyan-white' ? 'active' : ''}`}
                  onClick={() => setLoaderTheme('cyan-white')}
                  role="button"
                  tabIndex={0}
                  style={{ padding: '1rem' }}
                >
                  <div
                    style={{
                      height: '100px',
                      borderRadius: '8px',
                      background: 'radial-gradient(circle at center, #ffffff 0%, #e0f2fe 55%, #bae6fd 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '2px solid rgba(14, 165, 233, 0.45)',
                        boxShadow: '0 0 20px rgba(14, 165, 233, 0.35)',
                      }}
                    />
                    <img
                      src={appLogo}
                      alt="Logo"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        zIndex: 1,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                        Celeste y Blanco
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Fondo blanco con brillos celestes
                      </div>
                    </div>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: loaderTheme === 'cyan-white' ? '#2563eb' : '#cbd5e1',
                        background: loaderTheme === 'cyan-white' ? '#2563eb' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {loaderTheme === 'cyan-white' && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyPage;
