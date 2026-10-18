import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../../components/common/DataTable';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import {
  Plus,
  Truck,
  Building2,
  ShoppingBag,
  UserCheck,
  CheckCircle2,
  Search,
  Trash2,
  Edit2,
  Receipt,
  RotateCcw,
  Phone,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';

const PURCHASES_STORAGE_KEY = 'ohana_purchases_cache';
const SUPPLIERS_STORAGE_KEY = 'ohana_suppliers_cache';

const MOCK_SUPPLIER_IDS = new Set(['SUP-01', 'SUP-02', 'SUP-03', 'SUP-04', 'SUP-05']);
const MOCK_PURCHASE_IDS = new Set([
  'OC-2026-081',
  'OC-2026-080',
  'OC-2026-079',
  'OC-2026-078',
  'OC-2026-075',
  'OC-2026-074',
]);

const DEFAULT_SUPPLIERS = [];
const DEFAULT_PURCHASES = [];

const getSavedSuppliers = () => {
  try {
    const saved = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((s) => !MOCK_SUPPLIER_IDS.has(s.id));
        if (filtered.length !== parsed.length) {
          localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(filtered));
        }
        return filtered;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

const getSavedPurchases = () => {
  try {
    const saved = localStorage.getItem(PURCHASES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p) => !MOCK_PURCHASE_IDS.has(p.id));
        if (filtered.length !== parsed.length) {
          localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(filtered));
        }
        return filtered;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

const isSameMonthAndYear = (dateVal, targetMonth, targetYear) => {
  if (!dateVal) return false;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}/.test(dateVal)) {
    const parts = dateVal.slice(0, 10).split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    return y === targetYear && m === targetMonth;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
};

export const PurchasesPage = () => {
  // Pestaña activa ('purchases' | 'suppliers')
  const [activeTab, setActiveTab] = useState('purchases');

  // Filtro de proveedores activos / todos
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE'

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState('');

  // Navegación por mes (Mes / Año)
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  const monthYearLabel = useMemo(() => {
    const raw = selectedDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [selectedDate]);

  const handlePrevMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Proveedores (inicia vacío sin datos de prueba)
  const [suppliers, setSuppliers] = useState(() => getSavedSuppliers());

  // Compras (inicia vacío sin datos de prueba)
  const [purchases, setPurchases] = useState(() => getSavedPurchases());

  // Guardar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
    } catch (e) {
      console.error(e);
    }
  }, [suppliers]);

  useEffect(() => {
    try {
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchases));
    } catch (e) {
      console.error(e);
    }
  }, [purchases]);

  // Compras pertenecientes al mes seleccionado
  const monthlyPurchases = useMemo(() => {
    return purchases.filter((p) => isSameMonthAndYear(p.date, selectedMonth, selectedYear));
  }, [purchases, selectedMonth, selectedYear]);

  // =========================================================================
  // MÉTRICAS PARA LAS 3 CARDS:
  // 1. Total de Proveedor
  // 2. Total de Compras (del mes seleccionado)
  // 3. Proveedores Activos
  // =========================================================================
  const metrics = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const monthlyTotal = monthlyPurchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const activeSuppliers = suppliers.filter((s) => s.status === 'Activo').length;
    return {
      totalSuppliers,
      totalPurchasesAmount: monthlyTotal,
      totalPurchasesCount: monthlyPurchases.length,
      activeSuppliers,
    };
  }, [suppliers, monthlyPurchases]);

  // Modales
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Formulario Compra
  const [purchaseForm, setPurchaseForm] = useState({
    id: '',
    supplier: '',
    items: '',
    total: '',
    payment_method: 'Efectivo',
    status: 'Recibido',
    date: new Date().toISOString().slice(0, 10),
  });

  // Formulario Proveedor
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    ruc: '',
    contact: '',
    phone: '',
    category: '',
    status: 'Activo',
  });

  // Abrir Modal de Compra
  const handleOpenPurchaseModal = () => {
    const nextNum = purchases.length + 1;
    setPurchaseForm({
      id: `OC-2026-${String(nextNum).padStart(3, '0')}`,
      supplier: suppliers.find((s) => s.status === 'Activo')?.name || '',
      items: '',
      total: '',
      payment_method: 'Efectivo',
      status: 'Recibido',
      date: new Date().toISOString().slice(0, 10),
    });
    setIsPurchaseModalOpen(true);
  };

  // Guardar Compra
  const handleSavePurchase = (e) => {
    e.preventDefault();
    if (!purchaseForm.supplier.trim() || !purchaseForm.total) return;

    const purchaseDate = new Date(purchaseForm.date || Date.now());
    const newPurchase = {
      id: purchaseForm.id.trim() || `OC-${Date.now().toString().slice(-4)}`,
      supplier: purchaseForm.supplier.trim(),
      items: purchaseForm.items.trim() || 'Insumos varios',
      total: parseFloat(purchaseForm.total) || 0,
      payment_method: purchaseForm.payment_method,
      status: purchaseForm.status,
      date: purchaseDate.toISOString(),
      created_at: purchaseDate.toISOString(),
    };

    setPurchases((prev) => [newPurchase, ...prev]);
    setSelectedDate(purchaseDate);
    setIsPurchaseModalOpen(false);
  };

  // Eliminar Compra
  const handleDeletePurchase = (id) => {
    if (window.confirm('¿Deseas eliminar este registro de compra?')) {
      setPurchases((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Abrir Modal de Proveedor (Nuevo)
  const handleOpenSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      ruc: '',
      contact: '',
      phone: '',
      category: 'Insumos Generales',
      status: 'Activo',
    });
    setIsSupplierModalOpen(true);
  };

  // Abrir Modal de Proveedor (Editar)
  const handleOpenEditSupplierModal = (sup) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      ruc: sup.ruc || '',
      contact: sup.contact || '',
      phone: sup.phone || '',
      category: sup.category || '',
      status: sup.status || 'Activo',
    });
    setIsSupplierModalOpen(true);
  };

  // Guardar Proveedor
  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;

    if (editingSupplier) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === editingSupplier.id ? { ...s, ...supplierForm } : s))
      );
    } else {
      const nextId = `SUP-${String(suppliers.length + 1).padStart(2, '0')}`;
      setSuppliers((prev) => [
        ...prev,
        {
          id: nextId,
          ...supplierForm,
        },
      ]);
    }
    setIsSupplierModalOpen(false);
  };

  // Eliminar Proveedor
  const handleDeleteSupplier = (id, name) => {
    if (window.confirm(`¿Eliminar al proveedor "${name}"?`)) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Toggle estado proveedor
  const handleToggleSupplierStatus = (id) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === 'Activo' ? 'Inactivo' : 'Activo' } : s))
    );
  };

  // Compras filtradas por búsqueda dentro del mes seleccionado
  const filteredPurchases = useMemo(() => {
    return monthlyPurchases.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.id.toLowerCase().includes(q) ||
        (p.supplier || '').toLowerCase().includes(q) ||
        (p.items || '').toLowerCase().includes(q)
      );
    });
  }, [monthlyPurchases, searchQuery]);

  // Proveedores filtrados
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (supplierStatusFilter === 'ACTIVE' && s.status !== 'Activo') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.ruc || '').includes(q) ||
        (s.contact || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      );
    });
  }, [suppliers, supplierStatusFilter, searchQuery]);

  // Columnas Compras
  const purchaseColumns = [
    {
      key: 'id',
      header: 'N° Compra',
      width: '120px',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#334155', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: 'Proveedor',
      render: (val) => (
        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>
          {val}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      width: '130px',
      render: (val) => formatDate(val),
    },
    {
      key: 'items',
      header: 'Insumos Comprados',
      render: (val) => <span style={{ color: '#475569', fontSize: '0.84rem' }}>{val}</span>,
    },
    {
      key: 'payment_method',
      header: 'Método Pago',
      width: '110px',
      render: (val) => (
        <span
          style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '6px',
            background: '#f1f5f9',
            color: '#475569',
            fontWeight: 600,
          }}
        >
          {val || 'Efectivo'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total Factura',
      width: '130px',
      render: (val) => (
        <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{formatCurrency(val)}</strong>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '110px',
      render: (val) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 600,
            background: val === 'Recibido' ? '#ecfdf5' : '#fffbeb',
            color: val === 'Recibido' ? '#059669' : '#d97706',
            border: `1px solid ${val === 'Recibido' ? '#a7f3d0' : '#fde68a'}`,
          }}
        >
          {val === 'Recibido' ? <CheckCircle2 size={12} /> : null}
          {val}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '80px',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleDeletePurchase(row.id)}
          title="Eliminar compra"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
          }}
        >
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  // Columnas Proveedores
  const supplierColumns = [
    {
      key: 'ruc',
      header: 'RUC / ID',
      width: '125px',
      render: (val, row) => (
        <span style={{ fontWeight: 600, color: '#475569', fontFamily: 'monospace', fontSize: '0.82rem' }}>
          {val || row.id}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Razón Social / Proveedor',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{val}</div>
          {row.category && (
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{row.category}</span>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', color: '#334155' }}>
          <User size={13} color="#94a3b8" />
          {val || '-'}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      width: '130px',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', color: '#334155' }}>
          <Phone size={13} color="#94a3b8" />
          {val || '-'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '120px',
      render: (val, row) => {
        const isActive = val === 'Activo';
        return (
          <button
            type="button"
            onClick={() => handleToggleSupplierStatus(row.id)}
            title="Clic para cambiar estado"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: isActive ? '#ecfdf5' : '#f1f5f9',
              color: isActive ? '#059669' : '#64748b',
              border: `1px solid ${isActive ? '#a7f3d0' : '#cbd5e1'}`,
              cursor: 'pointer',
            }}
          >
            {isActive ? <CheckCircle2 size={12} /> : null}
            {val}
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '90px',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleOpenEditSupplierModal(row)}
            title="Editar proveedor"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteSupplier(row.id, row.name)}
            title="Eliminar proveedor"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const renderPurchasesEmptyState = () => {
    if (searchQuery) {
      return (
        <div style={{ padding: '3.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.9rem',
              color: '#94a3b8',
            }}
          >
            <Search size={26} />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
            No se encontraron compras
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem', maxWidth: '380px' }}>
            No hay compras registradas que coincidan con "{searchQuery}".
          </div>
          <Button variant="secondary" onClick={() => setSearchQuery('')}>
            Limpiar búsqueda
          </Button>
        </div>
      );
    }

    return (
      <div style={{ padding: '3.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.9rem',
            color: '#94a3b8',
          }}
        >
          <ShoppingBag size={28} />
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
          No hay compras registradas en {monthYearLabel}
        </div>
        <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem', maxWidth: '400px', lineHeight: 1.5 }}>
          Registra las adquisiciones de insumos y mercadería realizadas a tus proveedores para llevar el control de tus costos y egresos.
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenPurchaseModal}>
          Registrar Compra
        </Button>
      </div>
    );
  };

  const renderSuppliersEmptyState = () => {
    if (searchQuery) {
      return (
        <div style={{ padding: '3.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.9rem',
              color: '#94a3b8',
            }}
          >
            <Search size={26} />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
            No se encontraron proveedores
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem', maxWidth: '380px' }}>
            No hay proveedores registrados que coincidan con "{searchQuery}".
          </div>
          <Button variant="secondary" onClick={() => setSearchQuery('')}>
            Limpiar búsqueda
          </Button>
        </div>
      );
    }

    return (
      <div style={{ padding: '3.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.9rem',
            color: '#94a3b8',
          }}
        >
          <Truck size={28} />
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
          No hay proveedores registrados aún
        </div>
        <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem', maxWidth: '400px', lineHeight: 1.5 }}>
          Crea tu cartera de proveedores habituales para agilizar el registro de compras, contacto y abastecimiento de insumos.
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenSupplierModal}>
          Nuevo Proveedor
        </Button>
      </div>
    );
  };

  return (
    <div className="module-page">
      {/* Encabezado */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Compras y Proveedores</h1>
          <p className="page-subtitle">Registro de compras, abastecimiento y directorio de proveedores</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {activeTab === 'purchases' && (
            <div className="month-stepper-box">
              <button
                type="button"
                className="month-stepper-btn"
                onClick={handlePrevMonth}
                title="Mes anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="month-stepper-label">{monthYearLabel}</span>
              <button
                type="button"
                className="month-stepper-btn"
                onClick={handleNextMonth}
                title="Mes siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {activeTab === 'purchases' ? (
            <Button variant="primary" icon={Plus} onClick={handleOpenPurchaseModal}>
              Registrar Compra
            </Button>
          ) : (
            <Button variant="primary" icon={Plus} onClick={handleOpenSupplierModal}>
              Nuevo Proveedor
            </Button>
          )}
        </div>
      </div>

      {/* =========================================================================
          3 CARDS PRINCIPALES:
          1. TOTAL DE PROVEEDOR
          2. TOTAL DE COMPRAS
          3. PROVEEDORES ACTIVOS
          ========================================================================= */}
      <div className="purchases-kpi-grid">
        {/* Card 1: Total de Proveedor */}
        <div
          className={`purchases-kpi-card kpi-suppliers ${
            activeTab === 'suppliers' && supplierStatusFilter === 'ALL' ? 'active' : ''
          }`}
          onClick={() => {
            setActiveTab('suppliers');
            setSupplierStatusFilter('ALL');
          }}
          title="Ver directorio completo de proveedores"
        >
          <div className="purchases-kpi-top">
            <span className="purchases-kpi-title">Total de Proveedor</span>
            <div className="purchases-kpi-badge">
              <Building2 size={16} />
            </div>
          </div>
          <div>
            <div className="purchases-kpi-val">{metrics.totalSuppliers}</div>
            <div className="purchases-kpi-sub">
              {metrics.totalSuppliers} proveedores registrados en cartera
            </div>
          </div>
        </div>

        {/* Card 2: Total de Compras */}
        <div
          className={`purchases-kpi-card kpi-purchases ${activeTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setActiveTab('purchases')}
          title="Ver registro de compras realizadas"
        >
          <div className="purchases-kpi-top">
            <span className="purchases-kpi-title">Total de Compras ({monthYearLabel})</span>
            <div className="purchases-kpi-badge">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div>
            <div className="purchases-kpi-val">{formatCurrency(metrics.totalPurchasesAmount)}</div>
            <div className="purchases-kpi-sub">
              {metrics.totalPurchasesCount} compras registradas en {monthYearLabel.toLowerCase()}
            </div>
          </div>
        </div>

        {/* Card 3: Proveedores Activos */}
        <div
          className={`purchases-kpi-card kpi-active-suppliers ${
            activeTab === 'suppliers' && supplierStatusFilter === 'ACTIVE' ? 'active' : ''
          }`}
          onClick={() => {
            setActiveTab('suppliers');
            setSupplierStatusFilter('ACTIVE');
          }}
          title="Ver proveedores activos"
        >
          <div className="purchases-kpi-top">
            <span className="purchases-kpi-title">Proveedores Activos</span>
            <div className="purchases-kpi-badge">
              <UserCheck size={16} />
            </div>
          </div>
          <div>
            <div className="purchases-kpi-val">{metrics.activeSuppliers}</div>
            <div className="purchases-kpi-sub">
              {metrics.activeSuppliers} proveedores en operación continua
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="purchases-tabs-nav">
        <button
          type="button"
          className={`purchases-tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setActiveTab('purchases')}
        >
          <Receipt size={16} />
          Compras Realizadas
          <span className="purchases-tab-pill">{monthlyPurchases.length}</span>
        </button>

        <button
          type="button"
          className={`purchases-tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('suppliers');
            setSupplierStatusFilter('ALL');
          }}
        >
          <Truck size={16} />
          Directorio de Proveedores
          <span className="purchases-tab-pill">{suppliers.length}</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="supplies-toolbar">
        <div className="supplies-search-wrapper">
          <Search size={16} className="supplies-search-icon" />
          <input
            type="text"
            placeholder={
              activeTab === 'purchases'
                ? 'Buscar por N° compra, proveedor o insumo...'
                : 'Buscar por RUC, nombre o contacto...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="supplies-filter-chips">
          {activeTab === 'suppliers' && (
            <>
              <button
                type="button"
                className={`supplies-filter-chip ${supplierStatusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setSupplierStatusFilter('ALL')}
              >
                Todos ({suppliers.length})
              </button>
              <button
                type="button"
                className={`supplies-filter-chip ${supplierStatusFilter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setSupplierStatusFilter('ACTIVE')}
              >
                Solo Activos ({metrics.activeSuppliers})
              </button>
            </>
          )}

          {searchQuery && (
            <button
              type="button"
              className="supplies-filter-chip"
              onClick={() => setSearchQuery('')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}
            >
              <RotateCcw size={12} />
              Limpiar búsqueda
            </button>
          )}
        </div>
      </div>

      {/* Contenido según Pestaña */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {activeTab === 'purchases' ? (
          <DataTable
            columns={purchaseColumns}
            data={filteredPurchases}
            emptyMessage={renderPurchasesEmptyState()}
          />
        ) : (
          <DataTable
            columns={supplierColumns}
            data={filteredSuppliers}
            emptyMessage={renderSuppliersEmptyState()}
          />
        )}
      </div>

      {/* Modal: Registrar Compra */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Registrar Compra a Proveedor"
        maxWidth="520px"
      >
        <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                N° Compra / Orden *
              </label>
              <input
                type="text"
                value={purchaseForm.id}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Fecha *
              </label>
              <input
                type="date"
                value={purchaseForm.date}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Proveedor *
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={purchaseForm.supplier}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} {s.status === 'Inactivo' ? '(Inactivo)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Insumos Comprados / Concepto *
            </label>
            <input
              type="text"
              placeholder="Ej. Salmón 10kg, Palta 15kg, Queso Crema..."
              value={purchaseForm.items}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, items: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Total Factura (S/) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={purchaseForm.total}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, total: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Método de Pago
              </label>
              <select
                value={purchaseForm.payment_method}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_method: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              >
                <option value="Efectivo">Efectivo (Caja Chica)</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsPurchaseModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Registrar Compra
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Registrar o Editar Proveedor */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Razón Social / Nombre Comercial *
            </label>
            <input
              type="text"
              placeholder="Ej. Distribuidora Mar Fresco S.A.C."
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                RUC / Identificación
              </label>
              <input
                type="text"
                placeholder="20601234567"
                value={supplierForm.ruc}
                onChange={(e) => setSupplierForm({ ...supplierForm, ruc: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Categoría de Insumos
              </label>
              <input
                type="text"
                placeholder="Ej. Pescados, Lácteos..."
                value={supplierForm.category}
                onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Persona de Contacto
              </label>
              <input
                type="text"
                placeholder="Ej. Carlos Mendoza"
                value={supplierForm.contact}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                placeholder="987 654 321"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Estado
            </label>
            <select
              value={supplierForm.status}
              onChange={(e) => setSupplierForm({ ...supplierForm, status: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#ffffff',
              }}
            >
              <option value="Activo">Activo (Proveedor vigente)</option>
              <option value="Inactivo">Inactivo (Suspendido temporal)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsSupplierModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchasesPage;
