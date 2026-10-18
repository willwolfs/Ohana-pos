import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Store, 
  ArrowLeftRight, 
  TrendingUp, 
  Banknote, 
  MoreVertical, 
  Plus, 
  X, 
  Clock, 
  Calendar as CalendarIcon, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  Eye,
  Trash2,
  ShoppingBag
} from 'lucide-react';
import { cashService } from '../../../services/cashService';
import { formatCurrency } from '../../../utils/formatCurrency';
import '../styles/CashHistory.css';

export const CashHistoryView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('shifts'); // 'shifts' | 'movements'
  const [closedShifts, setClosedShifts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Popovers
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Form New Movement
  const [movType, setMovType] = useState('Ingreso'); // 'Ingreso' | 'Egreso'
  const [movAmount, setMovAmount] = useState('');
  const [movConcept, setMovConcept] = useState('');
  const [movPaymentMethod, setMovPaymentMethod] = useState('Efectivo');
  const [formError, setFormError] = useState('');

  // Close 3-dots menu on clicking outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.actions-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const handleDeleteShift = async (shift) => {
    const dateLabel = formatShiftDate(shift.closed_at || shift.opened_at);
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el registro de caja del ${dateLabel}?\n\n` +
      `⚠️ ATENCIÓN: Al eliminar esta caja, también se eliminarán del historial todas las ventas asociadas a este turno.\n\n` +
      `¿Deseas continuar?`
    );
    if (!confirmed) return;

    try {
      await cashService.deleteClosedShift(shift.id, shift);
      loadData();
    } catch (err) {
      alert('Error al eliminar cierre: ' + err.message);
    }
  };

  const handleDeleteMovement = async (mov) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el movimiento "${mov.concept}" por S/ ${Number(mov.amount).toFixed(2)}?`
    );
    if (!confirmed) return;

    try {
      await cashService.deleteMovement(mov.id);
      loadData();
    } catch (err) {
      alert('Error al eliminar movimiento: ' + err.message);
    }
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Nombre formateado del mes y año (ej: Septiembre 2026)
  const monthName = useMemo(() => {
    const name = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(currentDate);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [currentDate]);

  // Cargar datos al cambiar de mes o año
  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftsData, movsData] = await Promise.all([
        cashService.getClosedShifts({ month: currentMonth, year: currentYear }),
        cashService.getCashMovements({ month: currentMonth, year: currentYear }),
      ]);
      setClosedShifts(shiftsData || []);
      setMovements(movsData || []);
    } catch (err) {
      console.error('Error cargando historial de caja:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth, currentYear]);

  // Navegación de meses
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Métricas calculadas para el mes
  const totalSales = useMemo(() => {
    return closedShifts.reduce((acc, curr) => acc + (Number(curr.sales_amount) || 0), 0);
  }, [closedShifts]);

  const totalIncomes = useMemo(() => {
    return movements
      .filter((m) => m.type === 'Ingreso')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [movements]);

  const totalExpenses = useMemo(() => {
    return movements
      .filter((m) => m.type === 'Egreso')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  }, [movements]);

  const netBalance = totalIncomes - totalExpenses;

  // Formateador de fecha completa para cada fila (ej: martes, 29 de septiembre de 2026)
  const formatShiftDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Fecha de Cierre';
      return new Intl.DateTimeFormat('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return 'Fecha de Cierre';
    }
  };

  const formatShiftHours = (openedAt, closedAt) => {
    try {
      const o = openedAt ? new Date(openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '18:00';
      const c = closedAt ? new Date(closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '22:00';
      return `${o} - ${c}`;
    } catch {
      return 'Turno completado';
    }
  };

  const handleCreateMovement = async (e) => {
    e.preventDefault();
    setFormError('');

    const amt = parseFloat(movAmount);
    if (!amt || amt <= 0) {
      setFormError('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!movConcept.trim()) {
      setFormError('Ingresa el concepto o motivo del movimiento');
      return;
    }

    try {
      await cashService.recordMovement({
        type: movType,
        amount: amt,
        concept: movConcept.trim(),
        payment_method: movPaymentMethod,
      });

      setMovAmount('');
      setMovConcept('');
      setIsNewMovementModalOpen(false);
      loadData();
    } catch (err) {
      setFormError('Error al registrar movimiento: ' + err.message);
    }
  };

  return (
    <div className="cash-history-wrapper">
      {/* 1. Barra Superior con Selector de Mes y Switch Cierres/Movimientos */}
      <div className="cash-history-topbar">
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

        <div className="history-view-switcher">
          <button
            type="button"
            className={`history-switch-btn ${activeTab === 'shifts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shifts')}
          >
            <Store size={16} />
            <span>Cierres de Caja</span>
          </button>

          <button
            type="button"
            className={`history-switch-btn ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <Coins size={16} />
            <span>Movimientos</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas Métricas Resumen - Formal & Minimalista */}
      <div className="history-metrics-grid">
        <div className="history-metric-card">
          <div className="history-metric-info">
            <span className="history-metric-label">Cierres de Caja</span>
            <span className="history-metric-value">{closedShifts.length}</span>
          </div>
          <div className="history-metric-badge badge-blue">
            <Store size={18} />
          </div>
        </div>

        <div className="history-metric-card">
          <div className="history-metric-info">
            <span className="history-metric-label">Total Ventas (Historial)</span>
            <span className="history-metric-value sales-blue">
              {formatCurrency(totalSales)}
            </span>
          </div>
          <div className="history-metric-badge badge-blue">
            <ShoppingBag size={18} />
          </div>
        </div>

        <div className="history-metric-card">
          <div className="history-metric-info">
            <span className="history-metric-label">Movimientos</span>
            <span className="history-metric-value">{movements.length}</span>
          </div>
          <div className="history-metric-badge badge-slate">
            <Banknote size={18} />
          </div>
        </div>
      </div>

      {/* 3. Contenedor Principal: Cierres de Caja o Movimientos */}
      <div className="history-main-card">
        {activeTab === 'shifts' ? (
          <div>
            <div className="history-card-header">
              <div className="history-card-title-group">
                <Store size={20} className="history-card-icon" />
                <h3 className="history-card-title">Historial de Cierres de Caja</h3>
              </div>
            </div>

            {loading ? (
              <div className="history-empty-state">
                <p>Cargando cierres de caja...</p>
              </div>
            ) : closedShifts.length === 0 ? (
              <div className="history-empty-state">
                <div className="history-empty-icon">
                  <Store size={24} />
                </div>
                <h4>Sin cierres de caja registrados en {monthName}</h4>
                <p>Al cerrar tu turno diario desde "Caja Actual", el reporte de cierre quedará registrado automáticamente aquí.</p>
              </div>
            ) : (
              <div className="closed-shifts-list">
                {closedShifts.map((shift) => (
                  <div key={shift.id} className="closed-shift-row">
                    <div className="shift-row-left">
                      <div className="shift-icon-badge">
                        <Store size={20} />
                      </div>
                      <div className="shift-datetime">
                        <span className="shift-date-text">
                          {formatShiftDate(shift.closed_at || shift.opened_at)}
                        </span>
                        <span className="shift-hours-text">
                          {formatShiftHours(shift.opened_at, shift.closed_at)}
                        </span>
                      </div>
                    </div>

                    <div className="shift-row-stats">
                      <div className="shift-stat-col">
                        <span className="shift-stat-label">VENTAS</span>
                        <span className="shift-stat-val">
                          {formatCurrency(shift.sales_amount || 0)}
                        </span>
                      </div>

                      <div className="shift-stat-col">
                        <span className="shift-stat-label">TOTAL GENERAL</span>
                        <span className="shift-stat-val">
                          {formatCurrency(shift.total_general || 0)}
                        </span>
                      </div>

                      <div className="shift-stat-col">
                        <span className="shift-stat-label">CIERRE</span>
                        <span className="shift-stat-val">
                          {formatCurrency(shift.closing_amount || 0)}
                        </span>
                      </div>

                      <div className="shift-stat-col">
                        <span className="shift-stat-label">DIFERENCIA</span>
                        <span className="shift-stat-val">
                          {formatCurrency(shift.difference || 0)}
                        </span>
                      </div>

                      <div className="shift-row-actions">
                        <div className="actions-menu-container">
                          <button
                            type="button"
                            className="btn-shift-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === `shift-${shift.id}` ? null : `shift-${shift.id}`);
                            }}
                            aria-label="Opciones"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === `shift-${shift.id}` && (
                            <div className="actions-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="actions-dropdown-item"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setSelectedShift(shift);
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
                                  handleDeleteShift(shift);
                                }}
                              >
                                <Trash2 size={15} />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="btn-shift-chevron"
                          onClick={() => setSelectedShift(shift)}
                          title="Ver arqueo completo"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: MOVIMIENTOS DE INGRESO Y EGRESO */
          <div>
            <div className="history-card-header">
              <div className="history-card-title-group">
                <Coins size={20} className="history-card-icon" />
                <h3 className="history-card-title">Movimientos de Ingreso y Egreso de Caja</h3>
              </div>

              <button
                type="button"
                className="btn-new-movement"
                onClick={() => setIsNewMovementModalOpen(true)}
              >
                <Plus size={16} />
                <span>Registrar Movimiento</span>
              </button>
            </div>

            {/* Resumen de totales de movimientos */}
            <div className="movements-summary-bar">
              <div className="mov-summary-pill income">
                <span className="mov-pill-label">Total Ingresos Varios</span>
                <span className="mov-pill-value green">+{formatCurrency(totalIncomes)}</span>
              </div>
              <div className="mov-summary-pill expense">
                <span className="mov-pill-label">Total Egresos / Retiros</span>
                <span className="mov-pill-value red">-{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="mov-summary-pill net">
                <span className="mov-pill-label">Balance Neto en Caja</span>
                <span className="mov-pill-value">{formatCurrency(netBalance)}</span>
              </div>
            </div>

            {loading ? (
              <div className="history-empty-state">
                <p>Cargando movimientos...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="history-empty-state">
                <div className="history-empty-icon">
                  <Banknote size={24} />
                </div>
                <h4>Sin movimientos en {monthName}</h4>
                <p>Puedes registrar entradas manuales de sencillo o salidas de dinero para compras usando el botón superior.</p>
              </div>
            ) : (
              <div className="movements-table-wrapper">
                <table className="movements-table">
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Tipo</th>
                      <th>Concepto / Motivo</th>
                      <th>Cajero / Responsable</th>
                      <th>Método</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th style={{ textAlign: 'center', width: '80px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov) => {
                      const isIngreso = mov.type === 'Ingreso';
                      const formattedTime = new Date(mov.created_at).toLocaleString('es-PE', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={mov.id}>
                          <td>{formattedTime}</td>
                          <td>
                            <span className={`movement-badge ${isIngreso ? 'ingreso' : 'egreso'}`}>
                              {mov.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{mov.concept}</td>
                          <td>{mov.user_name || 'Admin'}</td>
                          <td>{mov.payment_method || 'Efectivo'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={isIngreso ? 'mov-amount-positive' : 'mov-amount-negative'}>
                              {isIngreso ? '+ ' : '- '}
                              {formatCurrency(mov.amount)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="actions-menu-container">
                              <button
                                type="button"
                                className="btn-shift-action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === `mov-${mov.id}` ? null : `mov-${mov.id}`);
                                }}
                                aria-label="Opciones"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openMenuId === `mov-${mov.id}` && (
                                <div className="actions-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="actions-dropdown-item"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setSelectedMovement(mov);
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
                                      handleDeleteMovement(mov);
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR NUEVO MOVIMIENTO DE CAJA */}
      {isNewMovementModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewMovementModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Registrar Movimiento de Caja</h3>
              <button 
                type="button"
                className="btn-modal-close" 
                onClick={() => setIsNewMovementModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="modal-body">
              {formError && (
                <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setMovType('Ingreso')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    border: movType === 'Ingreso' ? '2px solid #10b981' : '1px solid #e2e8f0',
                    background: movType === 'Ingreso' ? 'rgba(16,185,129,0.1)' : '#ffffff',
                    color: movType === 'Ingreso' ? '#059669' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  + Ingreso (Entrada)
                </button>

                <button
                  type="button"
                  onClick={() => setMovType('Egreso')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    border: movType === 'Egreso' ? '2px solid #ef4444' : '1px solid #e2e8f0',
                    background: movType === 'Egreso' ? 'rgba(239,68,68,0.1)' : '#ffffff',
                    color: movType === 'Egreso' ? '#dc2626' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  - Egreso (Salida / Gasto)
                </button>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Monto (S/) *
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  required
                  placeholder="0.00"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Concepto o Motivo *
                </label>
                <input
                  type="text"
                  required
                  placeholder={movType === 'Ingreso' ? 'Ej: Sencillo inicial, Aporte caja' : 'Ej: Compra de hielo, Pago delivery'}
                  value={movConcept}
                  onChange={(e) => setMovConcept(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Medio de Pago / Canal
                </label>
                <select
                  value={movPaymentMethod}
                  onChange={(e) => setMovPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                >
                  <option value="Efectivo">Efectivo en Caja</option>
                  <option value="Yape">Yape / Plin</option>
                  <option value="Tarjeta">Tarjeta POS</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsNewMovementModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DEL CIERRE DE CAJA */}
      {selectedShift && (
        <div className="modal-backdrop" onClick={() => setSelectedShift(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={20} color="#2563eb" />
                <h3 className="modal-title">Detalle de Cierre de Caja</h3>
              </div>
              <button 
                type="button"
                className="btn-modal-close" 
                onClick={() => setSelectedShift(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                  {formatShiftDate(selectedShift.closed_at || selectedShift.opened_at)}
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Horario: {formatShiftHours(selectedShift.opened_at, selectedShift.closed_at)} • Cajero: <strong>{selectedShift.user_name || 'Admin'}</strong>
                </p>
              </div>

              <div className="shift-detail-grid">
                <div className="shift-detail-item">
                  <span className="shift-detail-label">Ventas del Turno</span>
                  <span className="shift-detail-value" style={{ color: '#10b981' }}>
                    {formatCurrency(selectedShift.sales_amount || 0)}
                  </span>
                </div>

                <div className="shift-detail-item">
                  <span className="shift-detail-label">Monto de Apertura</span>
                  <span className="shift-detail-value">
                    {formatCurrency(selectedShift.opening_amount || 0)}
                  </span>
                </div>

                <div className="shift-detail-item">
                  <span className="shift-detail-label">Total General Teórico</span>
                  <span className="shift-detail-value">
                    {formatCurrency(selectedShift.total_general || 0)}
                  </span>
                </div>

                <div className="shift-detail-item">
                  <span className="shift-detail-label">Monto Contado (Cierre)</span>
                  <span className="shift-detail-value" style={{ color: '#2563eb' }}>
                    {formatCurrency(selectedShift.closing_amount || 0)}
                  </span>
                </div>

                <div className="shift-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="shift-detail-label">Diferencia de Arqueo</span>
                  <span 
                    className="shift-detail-value" 
                    style={{ 
                      color: Number(selectedShift.difference) === 0 ? '#10b981' : Number(selectedShift.difference) < 0 ? '#ef4444' : '#f59e0b' 
                    }}
                  >
                    {formatCurrency(selectedShift.difference || 0)} 
                    {Number(selectedShift.difference) === 0 && ' (Cuadrado Exacto ✓)'}
                    {Number(selectedShift.difference) < 0 && ' (Faltante)'}
                    {Number(selectedShift.difference) > 0 && ' (Sobrante)'}
                  </span>
                </div>
              </div>

              {selectedShift.notes && (
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', marginBottom: '14px' }}>
                  <strong>Observaciones:</strong> {selectedShift.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedShift(null)}
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

      {/* MODAL: DETALLE DEL MOVIMIENTO */}
      {selectedMovement && (
        <div className="modal-backdrop" onClick={() => setSelectedMovement(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={20} color={selectedMovement.type === 'Ingreso' ? '#10b981' : '#ef4444'} />
                <h3 className="modal-title">Detalle de Movimiento</h3>
              </div>
              <button 
                type="button"
                className="btn-modal-close" 
                onClick={() => setSelectedMovement(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '1rem 0', background: '#f8fafc', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Monto de {selectedMovement.type}
                </span>
                <div style={{ 
                  fontSize: '1.85rem', 
                  fontWeight: 600, 
                  color: selectedMovement.type === 'Ingreso' ? '#059669' : '#dc2626',
                  marginTop: '0.25rem'
                }}>
                  {selectedMovement.type === 'Ingreso' ? '+ ' : '- '}
                  {formatCurrency(selectedMovement.amount)}
                </div>
                <span className={`movement-badge ${selectedMovement.type === 'Ingreso' ? 'ingreso' : 'egreso'}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                  {selectedMovement.type}
                </span>
              </div>

              <div className="shift-detail-grid" style={{ gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                <div className="shift-detail-item">
                  <span className="shift-detail-label">Concepto / Motivo</span>
                  <span className="shift-detail-value" style={{ fontSize: '0.95rem' }}>{selectedMovement.concept || 'Movimiento manual'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div className="shift-detail-item">
                    <span className="shift-detail-label">Método / Canal</span>
                    <span className="shift-detail-value" style={{ fontSize: '0.9rem' }}>{selectedMovement.payment_method || 'Efectivo'}</span>
                  </div>

                  <div className="shift-detail-item">
                    <span className="shift-detail-label">Responsable</span>
                    <span className="shift-detail-value" style={{ fontSize: '0.9rem' }}>{selectedMovement.user_name || 'Admin'}</span>
                  </div>
                </div>

                <div className="shift-detail-item">
                  <span className="shift-detail-label">Fecha y Hora</span>
                  <span className="shift-detail-value" style={{ fontSize: '0.85rem' }}>
                    {new Date(selectedMovement.created_at || selectedMovement.date).toLocaleString('es-PE', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedMovement(null)}
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

export default CashHistoryView;
