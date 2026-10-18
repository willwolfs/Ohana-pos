import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../../components/common/DataTable';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import {
  Plus,
  Minus,
  Boxes,
  PackageOpen,
  AlertTriangle,
  AlertOctagon,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  RotateCcw,
  FolderPlus,
  X,
  Tag,
  Folder,
} from 'lucide-react';

const STORAGE_KEY = 'ohana_supplies';
const CATEGORIES_STORAGE_KEY = 'ohana_supplies_categories';

const MOCK_DEFAULT_CATEGORIES = [
  'Pescados y Mariscos',
  'Granos y Abarrotes',
  'Verduras y Frutas',
  'Lácteos',
  'Secos y Empaques',
  'Salsas y Condimentos',
  'Masas y Harinas',
  'Bebidas e Insumos',
];

const DEFAULT_CATEGORIES = [];

const UNITS = ['Kg', 'Gramos', 'Litro', 'Mililitro', 'Paquete x100', 'Unidad', 'Lata', 'Botella'];

export const SuppliesPage = () => {
  // Categorías dinámicas de insumos (respetando eliminaciones sin resucitar datos de prueba)
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Si contenía las 8 categorías mock que volvían por defecto, limpiarlas
          const isFullMockSet =
            parsed.length === MOCK_DEFAULT_CATEGORIES.length &&
            parsed.every((c) => MOCK_DEFAULT_CATEGORIES.includes(c));

          if (isFullMockSet) {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify([]));
            return [];
          }

          const cleaned = parsed.filter(
            (c) => typeof c === 'string' && c.trim() !== '' && !MOCK_DEFAULT_CATEGORIES.includes(c)
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cleaned));
            return cleaned;
          }

          return parsed.filter((c) => typeof c === 'string' && c.trim() !== '');
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const safeCategories = useMemo(() => {
    return Array.isArray(categories) ? categories : [];
  }, [categories]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Persistir categorías
  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(safeCategories));
    } catch (e) {
      console.error(e);
    }
  }, [safeCategories]);
  const [supplies, setSupplies] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Si contenía los datos de prueba anteriores (ej. Salmón INS-01 de prueba), limpiarlo
        const isMockData = Array.isArray(parsed) && parsed.some((s) => s.id === '1' && s.code === 'INS-01');
        if (isMockData) {
          localStorage.removeItem(STORAGE_KEY);
          return [];
        }
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading supplies from localStorage', e);
    }
    return [];
  });

  // Guardar en localStorage ante cambios
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supplies));
    } catch (e) {
      console.error('Error saving supplies to localStorage', e);
    }
  }, [supplies]);

  // Escuchar actualizaciones externas (ej. descuentos ejecutados desde Recetas)
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setSupplies(parsed);
        }
      } catch {}
    };
    window.addEventListener('ohana_supplies_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('ohana_supplies_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Filtros
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'LOW' | 'OUT'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Modal de registro / edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'General',
    unit: 'Kg',
    stock: '',
    minStock: '',
    cost: '',
  });

  // Cálculo de métricas para las 3 CARDS
  const metrics = useMemo(() => {
    const total = supplies.length;
    const low = supplies.filter((s) => Number(s.stock) > 0 && Number(s.stock) <= Number(s.minStock)).length;
    const out = supplies.filter((s) => Number(s.stock) <= 0).length;
    return { total, low, out };
  }, [supplies]);

  // Filtrado de la lista
  const filteredSupplies = useMemo(() => {
    return supplies.filter((item) => {
      // Filtro de las cards
      if (filterMode === 'LOW') {
        const isLow = Number(item.stock) > 0 && Number(item.stock) <= Number(item.minStock);
        if (!isLow) return false;
      } else if (filterMode === 'OUT') {
        const isOut = Number(item.stock) <= 0;
        if (!isOut) return false;
      }

      // Filtro por categoría
      if (selectedCategory !== 'Todos' && item.category !== selectedCategory) {
        return false;
      }

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.code.toLowerCase().includes(query);
        const matchCat = (item.category || '').toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchCat) return false;
      }

      return true;
    });
  }, [supplies, filterMode, selectedCategory, searchQuery]);

  // Abrir modal nuevo insumo
  const handleOpenCreateModal = () => {
    const nextNum = supplies.length + 1;
    const autoCode = `INS-${String(nextNum).padStart(2, '0')}`;
    setEditingSupply(null);
    setFormData({
      code: autoCode,
      name: '',
      category: categories[0] || 'General',
      unit: 'Kg',
      stock: '',
      minStock: '5',
      cost: '',
    });
    setIsModalOpen(true);
  };

  // Abrir modal edición
  const handleOpenEditModal = (supply) => {
    setEditingSupply(supply);
    setFormData({
      code: supply.code,
      name: supply.name,
      category: supply.category || categories[0] || 'General',
      unit: supply.unit,
      stock: String(supply.stock),
      minStock: String(supply.minStock),
      cost: supply.cost ? String(supply.cost) : '',
    });
    setIsModalOpen(true);
  };

  // Categorías de Insumos: Crear y Eliminar
  const handleCreateCategory = (e) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta categoría de insumo ya existe');
      return;
    }
    setCategories((prev) => [...prev, trimmed]);
    setNewCatInput('');
  };

  const handleDeleteCategory = (catToDelete) => {
    if (window.confirm(`¿Eliminar la categoría "${catToDelete}"? Los insumos pasarán a "General".`)) {
      setCategories((prev) => prev.filter((c) => c !== catToDelete));
      setSupplies((prev) =>
        prev.map((s) => (s.category === catToDelete ? { ...s, category: 'General' } : s))
      );
      if (selectedCategory === catToDelete) {
        setSelectedCategory('Todos');
      }
    }
  };

  // Guardar insumo (crear o editar)
  const handleSaveSupply = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const newSupplyData = {
      code: formData.code.trim() || `INS-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(),
      category: formData.category,
      unit: formData.unit,
      stock: Math.max(0, parseFloat(formData.stock) || 0),
      minStock: Math.max(0, parseFloat(formData.minStock) || 0),
      cost: Math.max(0, parseFloat(formData.cost) || 0),
    };

    if (editingSupply) {
      setSupplies((prev) =>
        prev.map((s) => (s.id === editingSupply.id ? { ...s, ...newSupplyData } : s))
      );
    } else {
      setSupplies((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...newSupplyData,
        },
      ]);
    }

    setIsModalOpen(false);
  };

  // Eliminar insumo
  const handleDeleteSupply = (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar el insumo "${name}"?`)) {
      setSupplies((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Ajuste rápido de stock
  const handleAdjustStock = (id, delta) => {
    setSupplies((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newStock = Math.max(0, Number((s.stock + delta).toFixed(2)));
          return { ...s, stock: newStock };
        }
        return s;
      })
    );
  };

  const columns = [
    {
      key: 'code',
      header: 'Código',
      width: '100px',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#334155', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Insumo',
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
      key: 'unit',
      header: 'Unidad',
      width: '110px',
      render: (val) => <span style={{ color: '#475569', fontSize: '0.85rem' }}>{val}</span>,
    },
    {
      key: 'stock',
      header: 'Stock Actual',
      render: (val, row) => {
        const numStock = Number(val);
        const isLowOrOut = numStock <= Number(row.minStock);

        return (
          <div className="supplies-stock-counter">
            <button
              type="button"
              className="supplies-stepper-btn"
              title="Disminuir stock (-1)"
              onClick={() => handleAdjustStock(row.id, -1)}
            >
              <Minus size={11} strokeWidth={2.5} />
            </button>
            <span
              style={{
                minWidth: '36px',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '0.85rem',
                fontVariantNumeric: 'tabular-nums',
                color: isLowOrOut ? '#dc2626' : '#1e293b',
              }}
            >
              {val}
            </span>
            <button
              type="button"
              className="supplies-stepper-btn"
              title="Aumentar stock (+1)"
              onClick={() => handleAdjustStock(row.id, 1)}
            >
              <Plus size={11} strokeWidth={2.5} />
            </button>
          </div>
        );
      },
    },
    {
      key: 'minStock',
      header: 'Stock Mínimo',
      width: '120px',
      render: (val, row) => (
        <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
          {val} {row.unit}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '130px',
      render: (_, row) => {
        const numStock = Number(row.stock);
        if (numStock <= 0) {
          return (
            <span className="badge-supply-status out">
              Insumo Agotado
            </span>
          );
        }
        if (numStock <= Number(row.minStock)) {
          return (
            <span className="badge-supply-status low">
              Stock Bajo
            </span>
          );
        }
        return (
          <span className="badge-supply-status ok">
            En Stock
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '100px',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            type="button"
            className="supplies-stepper-btn"
            title="Editar insumo"
            onClick={() => handleOpenEditModal(row)}
            style={{ width: '28px', height: '28px' }}
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="supplies-stepper-btn"
            title="Eliminar insumo"
            onClick={() => handleDeleteSupply(row.id, row.name)}
            style={{ width: '28px', height: '28px', color: '#ef4444' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  const renderEmptyState = () => {
    const hasSearchOrFilters = searchQuery.trim() || selectedCategory !== 'Todos' || filterMode !== 'ALL';

    if (hasSearchOrFilters) {
      return (
        <div style={{ padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.85rem',
              color: '#94a3b8',
            }}
          >
            <Search size={22} strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
            No se encontraron insumos
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem', maxWidth: '360px', lineHeight: 1.4 }}>
            No hay registros que coincidan con la búsqueda o categoría seleccionada.
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            onClick={() => {
              setFilterMode('ALL');
              setSelectedCategory('Todos');
              setSearchQuery('');
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      );
    }

    return (
      <div style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.9rem',
            color: '#64748b',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
          }}
        >
          <PackageOpen size={28} strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: '0.96rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
          No hay insumos registrados aún
        </div>
        <div style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1.25rem', maxWidth: '380px', lineHeight: 1.5 }}>
          Gestiona las existencias y costos de tus materias primas registrando el primer insumo para tu cocina y barra.
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
        >
          Registrar Insumo
        </Button>
      </div>
    );
  };

  return (
    <div className="module-page">
      {/* Encabezado */}
      <div className="page-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Insumos e Ingredientes</h1>
          <p className="page-subtitle">Control y existencias de materias primas para la barra y cocina</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Button
            variant="secondary"
            icon={FolderPlus}
            onClick={() => setIsCategoryModalOpen(true)}
          >
            Gestionar Categorías
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
            Registrar Insumo
          </Button>
        </div>
      </div>

      {/* Tabs Bar idéntica al Dashboard / Control de Caja */}
      <div className="supplies-tabs-bar">
        <button
          type="button"
          className={`supplies-tab-btn ${filterMode === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterMode('ALL')}
        >
          <Boxes size={15} />
          <span>Total Insumos</span>
          <span className="supplies-tab-badge">{metrics.total}</span>
        </button>

        <button
          type="button"
          className={`supplies-tab-btn tab-warning ${filterMode === 'LOW' ? 'active' : ''}`}
          onClick={() => setFilterMode('LOW')}
        >
          <AlertTriangle size={15} />
          <span>Stock Bajo</span>
          <span className="supplies-tab-badge badge-warning">{metrics.low}</span>
        </button>

        <button
          type="button"
          className={`supplies-tab-btn tab-critical ${filterMode === 'OUT' ? 'active' : ''}`}
          onClick={() => setFilterMode('OUT')}
        >
          <AlertOctagon size={15} />
          <span>Crítico / Agotado</span>
          <span className="supplies-tab-badge badge-critical">{metrics.out}</span>
        </button>
      </div>

      {/* =========================================================================
          3 CARDS PRINCIPALES MÁS COMPACTAS: TOTAL DE INSUMOS | STOCK BAJO | INSUMO AGOTADO
          ========================================================================= */}
      <div className="supplies-kpi-grid">
        {/* Card 1: Total de Insumos */}
        <div
          className={`supplies-kpi-card kpi-total ${filterMode === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterMode('ALL')}
          title="Ver todos los insumos"
        >
          <div className="supplies-kpi-top">
            <span className="supplies-kpi-title">Total de Insumos</span>
            <div className="supplies-kpi-badge">
              <Boxes size={16} />
            </div>
          </div>
          <div>
            <div className="supplies-kpi-val">{metrics.total}</div>
            <div className="supplies-kpi-sub">
              {metrics.total} materias primas registradas
            </div>
          </div>
        </div>

        {/* Card 2: Stock Bajo */}
        <div
          className={`supplies-kpi-card kpi-low ${filterMode === 'LOW' ? 'active' : ''}`}
          onClick={() => setFilterMode('LOW')}
          title="Filtrar insumos con stock bajo"
        >
          <div className="supplies-kpi-top">
            <span className="supplies-kpi-title">Stock Bajo</span>
            <div className="supplies-kpi-badge">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div>
            <div className="supplies-kpi-val">{metrics.low}</div>
            <div className="supplies-kpi-sub">
              {metrics.low === 1 ? '1 insumo por debajo del mínimo' : `${metrics.low} por debajo del mínimo`}
            </div>
          </div>
        </div>

        {/* Card 3: Insumo Agotado */}
        <div
          className={`supplies-kpi-card kpi-out ${filterMode === 'OUT' ? 'active' : ''}`}
          onClick={() => setFilterMode('OUT')}
          title="Filtrar insumos agotados"
        >
          <div className="supplies-kpi-top">
            <span className="supplies-kpi-title">Insumo Agotado</span>
            <div className="supplies-kpi-badge">
              <AlertOctagon size={16} />
            </div>
          </div>
          <div>
            <div className="supplies-kpi-val">{metrics.out}</div>
            <div className="supplies-kpi-sub">
              {metrics.out === 1 ? '1 insumo sin stock disponible' : `${metrics.out} insumos sin stock`}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros de Categorías */}
      <div className="supplies-search-section">
        {/* 1. Buscador */}
        <div className="supplies-search-wrapper">
          <Search size={16} className="supplies-search-icon" />
          <input
            type="text"
            placeholder="Buscar por insumo o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 2. Botones de Categorías directamente debajo del buscador */}
        <div className="supplies-categories-bar">
          {/* Botón 'Todas' */}
          <button
            type="button"
            className={`supplies-cat-btn ${selectedCategory === 'Todos' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('Todos')}
          >
            <Tag size={13} className="supplies-cat-icon" />
            <span>Todas</span>
            <span className="supplies-cat-count">{supplies.length}</span>
          </button>

          {/* Categorías dinámicas */}
          {safeCategories.map((cat) => {
            const count = (supplies || []).filter((s) => s.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`supplies-cat-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <Folder size={13} className="supplies-cat-icon" />
                <span>{cat}</span>
                <span className="supplies-cat-count">{count}</span>
              </button>
            );
          })}

          {/* Botón para restablecer filtros si hay alguno activo */}
          {(filterMode !== 'ALL' || searchQuery || selectedCategory !== 'Todos') && (
            <button
              type="button"
              className="supplies-reset-filter-btn"
              onClick={() => {
                setFilterMode('ALL');
                setSearchQuery('');
                setSelectedCategory('Todos');
              }}
              title="Restablecer filtros"
            >
              <RotateCcw size={12} />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla con listado de insumos */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={filteredSupplies}
          emptyMessage={renderEmptyState()}
        />
      </div>

      {/* Modal para Crear o Editar Insumo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupply ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveSupply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Código
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                Nombre del Insumo *
              </label>
              <input
                type="text"
                placeholder="Ej. Salmón fresco, Mozzarella..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              >
                {safeCategories.length > 0 ? (
                  safeCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))
                ) : (
                  <option value="General">General</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Unidad de Medida
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Stock Inicial *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
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
                Stock Mínimo *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="5"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
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
                Costo Ref. (S/)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingSupply ? 'Guardar Cambios' : 'Registrar Insumo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: GESTIONAR CATEGORÍAS DE INSUMOS ================= */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Categorías de Insumos e Ingredientes"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Form Crear Categoría */}
          <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Nueva categoría (ej. Carnes, Especias, Licores)..."
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <Button variant="primary" type="submit" icon={Plus}>
              Agregar
            </Button>
          </form>

          {/* Lista de Categorías */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
              Categorías Activas ({safeCategories.length})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {safeCategories.map((cat) => (
                <div
                  key={cat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Folder size={14} />
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{cat}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    title={`Eliminar categoría "${cat}"`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>
              Listo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuppliesPage;
