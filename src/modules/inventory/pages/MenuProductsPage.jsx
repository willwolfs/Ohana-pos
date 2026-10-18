import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { 
  Package, 
  AlertTriangle, 
  AlertOctagon, 
  Search, 
  Plus, 
  Minus, 
  Edit3, 
  UtensilsCrossed,
  Filter,
  X,
  ArrowRight,
  LayoutGrid,
  List
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';

const MOCK_SEEDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

const loadStoredProducts = () => {
  try {
    const saved = localStorage.getItem('ohana_products');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filtrar semillas mock de prueba para respetar el borrado del usuario
        const cleaned = parsed.filter((p) => !MOCK_SEEDS.includes(p.id));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('ohana_products', JSON.stringify(cleaned));
        }
        return cleaned.map((p) => ({
          ...p,
          stock: p.stock !== undefined ? Number(p.stock) : 0,
          minStock: p.minStock !== undefined ? Number(p.minStock) : 5,
        }));
      }
    }
  } catch {}
  return [];
};

export const MenuProductsPage = () => {
  const navigate = useNavigate();

  // Modo de vista: 'list' (tabla) o 'grid' (forma cuadrada)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('ohana_stock_view_mode') || 'list';
    } catch {
      return 'list';
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('ohana_stock_view_mode', mode);
    } catch {}
  };

  // Productos cargados estrictamente desde localStorage (sin datos mock si está vacío)
  const [products, setProducts] = useState(loadStoredProducts);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL'); // 'ALL' | 'LOW' | 'OUT' | 'OK'

  // Modal de ajuste de stock
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('set'); // 'set' | 'add' | 'subtract'
  const [adjustMinStock, setAdjustMinStock] = useState('5');

  // Sincronizar en tiempo real cuando se agreguen o borren productos en la sección "Productos"
  useEffect(() => {
    const handleSync = () => {
      setProducts(loadStoredProducts());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Guardar cambios de stock en localStorage sólo cuando se modifique un producto
  const saveAndSetProducts = (updated) => {
    setProducts(updated);
    try {
      localStorage.setItem('ohana_products', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Cálculos de las 3 tarjetas métricas
  const metrics = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter((p) => {
      const stock = Number(p.stock) || 0;
      const min = Number(p.minStock) || 5;
      return stock > 0 && stock <= min;
    }).length;
    const outOfStock = products.filter((p) => {
      const stock = Number(p.stock) || 0;
      return stock <= 0;
    }).length;

    return { total, lowStock, outOfStock };
  }, [products]);

  // Ajustar stock directamente desde la tabla con stepper (+ / -)
  const handleQuickAdjust = (prodId, delta) => {
    const updated = products.map((p) => {
      if (p.id === prodId) {
        const current = Number(p.stock) || 0;
        const next = Math.max(0, current + delta);
        return {
          ...p,
          stock: next,
          active: next > 0,
        };
      }
      return p;
    });
    saveAndSetProducts(updated);
  };

  // Modificar stock con input numérico directo
  const handleDirectStockChange = (prodId, valStr) => {
    const num = parseInt(valStr, 10);
    const validStock = isNaN(num) ? 0 : Math.max(0, num);

    const updated = products.map((p) => {
      if (p.id === prodId) {
        return {
          ...p,
          stock: validStock,
          active: validStock > 0,
        };
      }
      return p;
    });
    saveAndSetProducts(updated);
  };

  // Abrir modal de ajuste detallado
  const handleOpenAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustQty(String(product.stock || 0));
    setAdjustType('set');
    setAdjustMinStock(String(product.minStock || 5));
    setIsAdjustModalOpen(true);
  };

  // Guardar ajuste de modal
  const handleSaveModalAdjust = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const val = parseInt(adjustQty, 10) || 0;
    const minVal = parseInt(adjustMinStock, 10) || 1;

    const updated = products.map((p) => {
      if (p.id === selectedProduct.id) {
        let newStock = Number(p.stock) || 0;
        if (adjustType === 'set') {
          newStock = Math.max(0, val);
        } else if (adjustType === 'add') {
          newStock = Math.max(0, newStock + val);
        } else if (adjustType === 'subtract') {
          newStock = Math.max(0, newStock - val);
        }

        return {
          ...p,
          stock: newStock,
          minStock: Math.max(1, minVal),
          active: newStock > 0,
        };
      }
      return p;
    });

    saveAndSetProducts(updated);
    setIsAdjustModalOpen(false);
  };

  // Filtrado de la tabla
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const stock = Number(p.stock) || 0;
      const min = Number(p.minStock) || 5;

      // Filtro por Estado (Cards)
      if (activeStatusFilter === 'LOW') {
        if (!(stock > 0 && stock <= min)) return false;
      } else if (activeStatusFilter === 'OUT') {
        if (stock > 0) return false;
      } else if (activeStatusFilter === 'OK') {
        if (stock <= min) return false;
      }

      // Filtro por Categoría
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Filtro por Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        const matchCode = p.code?.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchCode) return false;
      }

      return true;
    });
  }, [products, activeStatusFilter, selectedCategory, searchQuery]);

  // Columnas de la tabla de stock
  const columns = [
    {
      key: 'product',
      header: 'Producto',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {row.image && (row.image.startsWith('data:') || row.image.startsWith('http') || row.image.startsWith('/')) ? (
              <img src={row.image} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UtensilsCrossed size={18} color="#94a3b8" />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {row.pieces || row.code || 'Plato de carta'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (val) => (
        <span
          style={{
            display: 'inline-flex',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 600,
            background: '#f8fafc',
            color: '#475569',
            border: '1px solid #e2e8f0',
          }}
        >
          {val || 'General'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Precio Venta',
      render: (val) => (
        <strong style={{ fontWeight: 600, color: '#0f172a' }}>
          {formatCurrency(Number(val) || 0)}
        </strong>
      ),
    },
    {
      key: 'stock',
      header: 'Stock Actual',
      render: (val, row) => {
        const stockNum = Number(val) || 0;
        const minNum = Number(row.minStock) || 5;
        const isOut = stockNum <= 0;
        const isLow = stockNum > 0 && stockNum <= minNum;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="stock-stepper">
              <button
                type="button"
                className="stock-stepper-btn"
                onClick={() => handleQuickAdjust(row.id, -1)}
                title="Reducir 1 unidad"
              >
                <Minus size={13} />
              </button>
              <input
                type="number"
                min="0"
                className="stock-stepper-val"
                style={{
                  color: isOut ? '#ef4444' : isLow ? '#d97706' : '#0f172a',
                }}
                value={stockNum}
                onChange={(e) => handleDirectStockChange(row.id, e.target.value)}
              />
              <button
                type="button"
                className="stock-stepper-btn"
                onClick={() => handleQuickAdjust(row.id, 1)}
                title="Aumentar 1 unidad"
              >
                <Plus size={13} />
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>und</span>
          </div>
        );
      },
    },
    {
      key: 'minStock',
      header: 'Stock Mínimo',
      render: (val) => (
        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
          {val || 5} und
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (_, row) => {
        const stockNum = Number(row.stock) || 0;
        const minNum = Number(row.minStock) || 5;

        if (stockNum <= 0) {
          return <span className="status-pill danger">Agotado</span>;
        }
        if (stockNum <= minNum) {
          return <span className="status-pill warning">Stock Bajo</span>;
        }
        return <span className="status-pill active">Disponible</span>;
      },
    },
    {
      key: 'actions',
      header: 'Acción',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleOpenAdjustModal(row)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 600,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0f172a';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#334155';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          <Edit3 size={13} />
          <span>Ajustar</span>
        </button>
      ),
    },
  ];

  return (
    <div className="module-page">
      {/* Cabecera del Módulo */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock de Productos</h1>
          <p className="page-subtitle">
            Monitorea el inventario de platos y bebidas, existencias mínimas y productos agotados
          </p>
        </div>
      </div>

      {/* 3 Tarjetas Métricas: Total de Productos, Stock Bajo, Agotado (Estilo Formal/Minimalista) */}
      <div className="history-metrics-grid" style={{ marginBottom: '1.25rem' }}>
        {/* Card 1: Total de Productos */}
        <div
          className={`history-metric-card ${activeStatusFilter === 'ALL' && products.length > 0 ? 'active-filter' : ''}`}
          onClick={() => products.length > 0 && setActiveStatusFilter('ALL')}
          title="Ver todos los productos"
        >
          <div className="history-metric-info">
            <span className="history-metric-label">Total de Productos</span>
            <span className="history-metric-value">{metrics.total}</span>
          </div>
          <div className="history-metric-badge badge-blue">
            <Package size={22} />
          </div>
        </div>

        {/* Card 2: Stock Bajo */}
        <div
          className={`history-metric-card ${activeStatusFilter === 'LOW' ? 'active-filter' : ''}`}
          onClick={() => products.length > 0 && setActiveStatusFilter(activeStatusFilter === 'LOW' ? 'ALL' : 'LOW')}
          title="Filtrar productos con stock bajo"
        >
          <div className="history-metric-info">
            <span className="history-metric-label">Stock Bajo</span>
            <span className={`history-metric-value ${metrics.lowStock > 0 ? 'val-orange' : ''}`}>
              {metrics.lowStock}
            </span>
          </div>
          <div className="history-metric-badge badge-orange">
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Card 3: Agotado */}
        <div
          className={`history-metric-card ${activeStatusFilter === 'OUT' ? 'active-filter' : ''}`}
          onClick={() => products.length > 0 && setActiveStatusFilter(activeStatusFilter === 'OUT' ? 'ALL' : 'OUT')}
          title="Filtrar productos agotados"
        >
          <div className="history-metric-info">
            <span className="history-metric-label">Agotado</span>
            <span className={`history-metric-value ${metrics.outOfStock > 0 ? 'val-red' : ''}`}>
              {metrics.outOfStock}
            </span>
          </div>
          <div className="history-metric-badge badge-rose">
            <AlertOctagon size={22} />
          </div>
        </div>
      </div>

      {/* Si no hay productos creados en la sección Productos */}
      {products.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
            }}
          >
            <Package size={30} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#0f172a' }}>
            No hay productos registrados
          </h3>
          <p style={{ margin: 0, maxWidth: '460px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
            Agrega productos desde la sección <strong>"Productos"</strong> para poder visualizar y controlar su stock aquí.
          </p>
          <button
            type="button"
            onClick={() => navigate('/products')}
            style={{
              marginTop: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0f172a';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Plus size={16} />
            <span>Ir a Productos</span>
            <ArrowRight size={14} style={{ marginLeft: '2px' }} />
          </button>
        </div>
      ) : (
        <>
          {/* Barra de Filtros y Búsqueda */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Buscador */}
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Filtro por Categoría */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} color="#64748b" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  background: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Indicador de Filtro de Estado Activo */}
            {activeStatusFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setActiveStatusFilter('ALL')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>
                  Filtro: {activeStatusFilter === 'LOW' ? 'Stock Bajo' : 'Agotados'}
                </span>
                <X size={13} />
              </button>
            )}
            {/* Selector de Modo de Vista (Lista / Cuadrícula Cuadrada) */}
            <div className="stock-view-switcher">
              <button
                type="button"
                className={`stock-view-switcher-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('list')}
                title="Vista en Lista"
              >
                <List size={15} />
                <span>Lista</span>
              </button>
              <button
                type="button"
                className={`stock-view-switcher-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('grid')}
                title="Vista Cuadrada (Cuadrícula)"
              >
                <LayoutGrid size={15} />
                <span>Cuadrícula</span>
              </button>
            </div>
          </div>

          {/* Vista en Lista o Vista en Forma Cuadrada */}
          {viewMode === 'list' ? (
            <DataTable columns={columns} data={filteredProducts} />
          ) : filteredProducts.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <Search size={32} color="#94a3b8" />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                No se encontraron productos
              </h4>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                No hay productos que coincidan con la búsqueda o filtros seleccionados.
              </p>
              {(searchQuery || selectedCategory !== 'ALL' || activeStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setActiveStatusFilter('ALL');
                  }}
                  style={{
                    marginTop: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="stock-square-grid">
              {filteredProducts.map((p) => {
                const stockNum = Number(p.stock) || 0;
                const minNum = Number(p.minStock) || 5;
                const isOut = stockNum <= 0;
                const isLow = stockNum > 0 && stockNum <= minNum;

                return (
                  <div
                    key={p.id}
                    className={`stock-square-card ${isOut ? 'out-of-stock' : isLow ? 'low-stock' : ''}`}
                  >
                    {/* Área Cuadrada de Media / Foto */}
                    <div className="stock-square-card-media">
                      {p.image && (p.image.startsWith('data:') || p.image.startsWith('http') || p.image.startsWith('/')) ? (
                        <img src={p.image} alt={p.name} className="stock-square-card-img" />
                      ) : (
                        <div className="stock-square-card-placeholder">
                          <UtensilsCrossed size={36} color="#94a3b8" />
                        </div>
                      )}

                      {/* Badge Flotante de Estado */}
                      <div className="stock-square-badge-status">
                        {isOut ? (
                          <span className="status-pill danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', boxShadow: '0 2px 5px rgba(0,0,0,0.08)' }}>
                            <AlertOctagon size={11} /> Agotado
                          </span>
                        ) : isLow ? (
                          <span className="status-pill warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', boxShadow: '0 2px 5px rgba(0,0,0,0.08)' }}>
                            <AlertTriangle size={11} /> Stock Bajo
                          </span>
                        ) : (
                          <span className="status-pill active" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', boxShadow: '0 2px 5px rgba(0,0,0,0.08)' }}>
                            Disponible
                          </span>
                        )}
                      </div>

                      {/* Badge Flotante de Categoría */}
                      {p.category && (
                        <div className="stock-square-badge-cat" title={p.category}>
                          {p.category}
                        </div>
                      )}

                      {/* Badge Flotante de Precio */}
                      <div className="stock-square-badge-price">
                        {formatCurrency(Number(p.price) || 0)}
                      </div>
                    </div>

                    {/* Cuerpo de la Tarjeta */}
                    <div className="stock-square-card-body">
                      <div className="stock-square-card-info">
                        <h4 className="stock-square-card-title" title={p.name}>
                          {p.name}
                        </h4>
                        <span className="stock-square-card-subtitle">
                          {p.pieces || p.code || 'Plato de carta'}
                        </span>
                      </div>

                      {/* Control de Stock: Stock Actual arriba, Stepper (+ / -) abajo */}
                      <div className="stock-square-stock-box">
                        <div className="stock-square-stock-header">
                          <div className="stock-square-stock-current">
                            <span className="stock-square-stock-label">Stock Actual:</span>
                            <span
                              className="stock-square-stock-count"
                              style={{
                                color: isOut ? '#ef4444' : isLow ? '#d97706' : '#0f172a',
                              }}
                            >
                              {stockNum} <small>und</small>
                            </span>
                          </div>
                          <span className="stock-square-stock-min-badge">
                            Mín: {minNum} und
                          </span>
                        </div>

                        <div className="stock-square-stepper-wrapper">
                          <div className="stock-stepper">
                            <button
                              type="button"
                              className="stock-stepper-btn"
                              onClick={() => handleQuickAdjust(p.id, -1)}
                              title="Reducir 1 unidad"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              className="stock-stepper-val"
                              style={{
                                color: isOut ? '#ef4444' : isLow ? '#d97706' : '#0f172a',
                              }}
                              value={stockNum}
                              onChange={(e) => handleDirectStockChange(p.id, e.target.value)}
                            />
                            <button
                              type="button"
                              className="stock-stepper-btn"
                              onClick={() => handleQuickAdjust(p.id, 1)}
                              title="Aumentar 1 unidad"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Botón Ajustar Modal */}
                      <button
                        type="button"
                        className="stock-square-adjust-btn"
                        onClick={() => handleOpenAdjustModal(p)}
                      >
                        <Edit3 size={13} />
                        <span>Ajustar Stock</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal de Ajuste de Stock */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Ajustar Stock: ${selectedProduct?.name || ''}`}
        maxWidth="450px"
      >
        {selectedProduct && (
          <form onSubmit={handleSaveModalAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Imagen Rectangular Arriba */}
            {selectedProduct.image && (selectedProduct.image.startsWith('data:') || selectedProduct.image.startsWith('http') || selectedProduct.image.startsWith('/')) ? (
              <div
                style={{
                  width: '100%',
                  height: '105px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                }}
              >
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                  }}
                />
              </div>
            ) : null}

            {/* Barra de Stock Actual y Precio Venta */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Stock Actual:
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {selectedProduct.stock || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>und</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Precio Venta:
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {formatCurrency(Number(selectedProduct.price) || 0)}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Tipo de Ajuste:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustType('set')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: adjustType === 'set' ? '#0f172a' : '#cbd5e1',
                    background: adjustType === 'set' ? '#0f172a' : '#ffffff',
                    color: adjustType === 'set' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Fijar Total
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: adjustType === 'add' ? '#0f172a' : '#cbd5e1',
                    background: adjustType === 'add' ? '#0f172a' : '#ffffff',
                    color: adjustType === 'add' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  + Agregar
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('subtract')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: adjustType === 'subtract' ? '#0f172a' : '#cbd5e1',
                    background: adjustType === 'subtract' ? '#0f172a' : '#ffffff',
                    color: adjustType === 'subtract' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  - Descontar
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {adjustType === 'set' ? 'Nuevo Stock Total (und):' : 'Cantidad a aplicar (und):'}
              </label>
              <input
                type="number"
                min="0"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Stock Mínimo para Alerta (und):
              </label>
              <input
                type="number"
                min="1"
                value={adjustMinStock}
                onChange={(e) => setAdjustMinStock(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                Si el stock es menor o igual a este valor, aparecerá como "Stock Bajo".
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="outline" type="button" onClick={() => setIsAdjustModalOpen(false)}>
                Cancelar
              </Button>
              <button
                type="submit"
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Guardar Ajuste
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default MenuProductsPage;
