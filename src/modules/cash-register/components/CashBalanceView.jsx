import React, { useState, useEffect, useMemo } from 'react';
import { 
  Scale, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  FileSpreadsheet,
  MoreVertical,
  Eye,
  Trash2,
  X,
  ShoppingBag
} from 'lucide-react';
import { cashService } from '../../../services/cashService';
import { formatCurrency } from '../../../utils/formatCurrency';
import '../styles/CashBalance.css';

export const CashBalanceView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [closedShifts, setClosedShifts] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOutflow, setSelectedOutflow] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const pageSize = 8;

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.actions-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Nombre del mes y año (ej: Septiembre 2026)
  const monthName = useMemo(() => {
    const name = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(currentDate);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [shifts, movements] = await Promise.all([
        cashService.getClosedShifts({ month: currentMonth, year: currentYear }),
        cashService.getCashMovements({ month: currentMonth, year: currentYear }),
      ]);
      setClosedShifts(shifts || []);
      setCashMovements(movements || []);
    } catch (err) {
      console.error('Error cargando datos para el balance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setCurrentPage(1);
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // 1. Ingresos / Fondos: Ventas de cierres de caja + Ingresos varios
  const totalSales = useMemo(() => {
    return closedShifts.reduce((acc, curr) => acc + (Number(curr.sales_amount) || 0), 0);
  }, [closedShifts]);

  const totalOtherIncomes = useMemo(() => {
    return cashMovements
      .filter((m) => m.type === 'Ingreso')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [cashMovements]);

  const totalIngresos = totalSales + totalOtherIncomes;

  // 2. Gastos Operativos de Caja Chica (Egresos)
  const totalGastosOperativos = useMemo(() => {
    return cashMovements
      .filter((m) => m.type === 'Egreso')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [cashMovements]);

  // 3. Compras registradas
  const [purchases, setPurchases] = useState(() => {
    try {
      const saved = localStorage.getItem('ohana_purchases_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDeleteOutflow = async (item) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar este registro de ${item.tipo.toLowerCase()} "${item.concepto}" por S/ ${Number(item.monto).toFixed(2)}?`
    );
    if (!confirmed) return;

    try {
      if (item.id.startsWith('egr-')) {
        const rawId = item.id.replace('egr-', '');
        await cashService.deleteMovement(rawId);
      } else if (item.id.startsWith('pur-')) {
        const rawId = item.id.replace('pur-', '');
        const currentPurchases = purchases.filter((p) => String(p.id) !== String(rawId));
        setPurchases(currentPurchases);
        localStorage.setItem('ohana_purchases_cache', JSON.stringify(currentPurchases));
      }
      loadData();
    } catch (err) {
      alert('Error al eliminar registro: ' + err.message);
    }
  };

  const totalCompras = useMemo(() => {
    return purchases
      .filter((p) => {
        const d = new Date(p.date || p.created_at);
        if (isNaN(d.getTime())) return true;
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  }, [purchases, currentMonth, currentYear]);

  // 4. Balance Neto y Salidas Totales
  const totalOutflows = totalCompras + totalGastosOperativos;
  const balanceNeto = totalIngresos - totalOutflows;
  const isPositive = balanceNeto >= 0;

  // 5. Lista Combinada de Salidas de Dinero (Egresos y Compras)
  const combinedOutflows = useMemo(() => {
    const list = [];

    // Agregar egresos de caja chica
    cashMovements
      .filter((m) => m.type === 'Egreso')
      .forEach((m) => {
        list.push({
          id: `egr-${m.id}`,
          tipo: 'Gasto',
          rawDate: new Date(m.created_at || Date.now()),
          fecha: new Date(m.created_at || Date.now()).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          concepto: m.concept || 'Egreso de caja chica',
          origen: `Movimiento de caja por ${m.user_name || 'Personal'}`,
          metodo: m.payment_method || 'Efectivo',
          monto: Number(m.amount) || 0,
        });
      });

    // Agregar compras a proveedores
    purchases.forEach((p) => {
      const pDate = new Date(p.date || p.created_at || Date.now());
      if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
        list.push({
          id: `pur-${p.id}`,
          tipo: 'Compra',
          rawDate: pDate,
          fecha: pDate.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          concepto: p.items || 'INSUMOS',
          origen: p.supplier ? `Proveedor: ${p.supplier}` : 'Proveedor de Insumos',
          metodo: p.payment_method || 'Efectivo',
          monto: Number(p.total) || 0,
        });
      }
    });

    // Ordenar cronológicamente descendente (más recientes primero)
    return list.sort((a, b) => b.rawDate - a.rawDate);
  }, [cashMovements, purchases, currentMonth, currentYear]);

  // Paginación
  const totalItems = combinedOutflows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedOutflows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return combinedOutflows.slice(start, start + pageSize);
  }, [combinedOutflows, currentPage]);

  return (
    <div className="cash-balance-view-wrapper">
      {/* 1. Header con Ícono y Navegación de Mes */}
      <div className="balance-page-header">
        <div className="balance-title-group">
          <div className="balance-icon-box">
            <Scale size={24} />
          </div>
          <div>
            <h2 className="balance-main-title">Balance Financiero</h2>
            <p className="balance-main-subtitle">
              Control y salud financiera mensual: ingresos, compras y gastos operativos
            </p>
          </div>
        </div>

        <div className="month-navigator">
          <button 
            type="button" 
            className="month-nav-btn" 
            onClick={handlePrevMonth}
            title="Mes anterior"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="month-nav-title">{monthName}</span>
          <button 
            type="button" 
            className="month-nav-btn" 
            onClick={handleNextMonth}
            title="Mes siguiente"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 2. Tarjetas Métricas Resumen - Formal & Minimalista */}
      <div className="history-metrics-grid">
        {/* Card 1: Balance Financiero Neto */}
        <div className="history-metric-card">
          <div className="history-metric-info">
            <span className="history-metric-label">Balance Financiero Neto</span>
            <span className={`history-metric-value ${!isPositive ? 'sales-rose' : ''}`}>
              {formatCurrency(balanceNeto)}
            </span>
          </div>
          <div className="history-metric-badge badge-blue">
            <Scale size={18} />
          </div>
        </div>

        {/* Card 2: Ingresos / Fondos */}
        <div className="history-metric-card">
          <div className="history-metric-info">
            <span className="history-metric-label">Ingresos / Fondos</span>
            <span className="history-metric-value sales-blue">
              {formatCurrency(totalIngresos)}
            </span>
          </div>
          <div className="history-metric-badge badge-blue">
            <ShoppingBag size={18} />
          </div>
        </div>

        {/* Card 3: Compras y Gastos */}
        <div className="history-metric-card">
          <div className="history-metric-info">
            <span className="history-metric-label">Compras y Gastos</span>
            <span className="history-metric-value sales-rose">
              {formatCurrency(totalOutflows)}
            </span>
          </div>
          <div className="history-metric-badge badge-rose">
            <ShoppingCart size={18} />
          </div>
        </div>
      </div>

      {/* 3. Contenedor de la Tabla de Flujo Reciente de Egresos (Exacta a la imagen 2) */}
      <div className="balance-table-card">
        <div className="balance-table-header">
          <h3 className="balance-table-title">Flujo Reciente de Egresos (Compras y Gastos)</h3>
          <p className="balance-table-subtitle">
            Historial cronológico combinado de salidas de dinero en el mes
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <p>Cargando balance financiero...</p>
          </div>
        ) : combinedOutflows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <FileSpreadsheet size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <h4 style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Sin egresos en {monthName}</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              No se han registrado compras a proveedores ni egresos de caja chica durante este mes.
            </p>
          </div>
        ) : (
          <div className="balance-table-container">
            <table className="balance-flow-table">
              <thead>
                <tr>
                  <th>TIPO</th>
                  <th>FECHA</th>
                  <th>CONCEPTO / DETALLE</th>
                  <th>PROVEEDOR / ORIGEN</th>
                  <th>MÉTODO</th>
                  <th style={{ textAlign: 'right' }}>MONTO</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOutflows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={`flow-badge ${item.tipo.toLowerCase()}`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.fecha}</td>
                    <td>
                      <span className="flow-concept-text">{item.concepto}</span>
                    </td>
                    <td>
                      <span className="flow-origin-text">{item.origen}</span>
                    </td>
                    <td>
                      <span className="flow-method-text">{item.metodo}</span>
                    </td>
                    <td>
                      <span className="flow-amount-text">
                        -{formatCurrency(item.monto)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="actions-menu-container">
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === `outflow-${item.id}` ? null : `outflow-${item.id}`);
                          }}
                          aria-label="Opciones"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === `outflow-${item.id}` && (
                          <div className="actions-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="actions-dropdown-item"
                              onClick={() => {
                                setOpenMenuId(null);
                                setSelectedOutflow(item);
                              }}
                            >
                              <Eye size={15} style={{ color: '#2563eb' }} />
                              <span>Ver detalle</span>
                            </button>
                            <button
                              type="button"
                              className="actions-dropdown-item delete"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDeleteOutflow(item);
                              }}
                            >
                              <Trash2 size={15} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 4. Barra de Paginación */}
            {totalPages > 1 && (
              <div className="balance-pagination-bar">
                <span className="pagination-counter">
                  Página {currentPage} de {totalPages} ({totalItems} movimientos)
                </span>

                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn-pagination"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                    <span>Anterior</span>
                  </button>

                  <button
                    type="button"
                    className="btn-pagination"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span>Siguiente</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: DETALLE DEL EGRESO / COMPRA */}
      {selectedOutflow && (
        <div className="modal-backdrop" onClick={() => setSelectedOutflow(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={20} color={selectedOutflow.tipo === 'Compra' ? '#2563eb' : '#f59e0b'} />
                <h3 className="modal-title">Detalle de Salida de Dinero</h3>
              </div>
              <button 
                type="button"
                className="btn-modal-close" 
                onClick={() => setSelectedOutflow(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '1rem 0', background: '#f8fafc', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {selectedOutflow.tipo === 'Compra' ? 'Compra a Proveedor' : 'Gasto Operativo'}
                </span>
                <div style={{ 
                  fontSize: '1.85rem', 
                  fontWeight: 600, 
                  color: '#dc2626',
                  marginTop: '0.25rem'
                }}>
                  - {formatCurrency(selectedOutflow.monto)}
                </div>
                <span className={`flow-badge ${selectedOutflow.tipo.toLowerCase()}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                  {selectedOutflow.tipo}
                </span>
              </div>

              <div className="shift-detail-grid" style={{ gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                <div className="shift-detail-item">
                  <span className="shift-detail-label">Concepto / Detalle</span>
                  <span className="shift-detail-value" style={{ fontSize: '0.95rem' }}>{selectedOutflow.concepto}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div className="shift-detail-item">
                    <span className="shift-detail-label">Proveedor / Origen</span>
                    <span className="shift-detail-value" style={{ fontSize: '0.9rem' }}>{selectedOutflow.origen}</span>
                  </div>

                  <div className="shift-detail-item">
                    <span className="shift-detail-label">Método de Pago</span>
                    <span className="shift-detail-value" style={{ fontSize: '0.9rem' }}>{selectedOutflow.metodo}</span>
                  </div>
                </div>

                <div className="shift-detail-item">
                  <span className="shift-detail-label">Fecha y Hora</span>
                  <span className="shift-detail-value" style={{ fontSize: '0.85rem' }}>{selectedOutflow.fecha}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedOutflow(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashBalanceView;
