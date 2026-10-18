import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ShiftContext } from '../../../context/ShiftContext';
import { AuthContext } from '../../../context/AuthContext';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import { formatCurrency } from '../../../utils/formatCurrency';
import { cashService } from '../../../services/cashService';
import CashHistoryView from '../components/CashHistoryView';
import CashBalanceView from '../components/CashBalanceView';
import { 
  Lock, 
  Unlock, 
  DollarSign, 
  Clock, 
  Scale,
  TrendingUp, 
  TrendingDown, 
  Plus, 
  X, 
  Calendar, 
  UserCheck, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  UtensilsCrossed, 
  Banknote, 
  Smartphone, 
  Wallet, 
  ShoppingBag, 
  Coins,
  HelpCircle,
  Trash2,
  FileText
} from 'lucide-react';

export const CashRegisterPage = () => {
  const { currentShift, openShift, closeShift } = useContext(ShiftContext);
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'history' | 'balance'
  const [isOpenModalVisible, setIsOpenModalVisible] = useState(false);
  const [isCloseModalVisible, setIsCloseModalVisible] = useState(false);
  const [isMovementModalVisible, setIsMovementModalVisible] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Form states
  const [openingAmount, setOpeningAmount] = useState('');
  const [countedAmount, setCountedAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Movements form state
  const [movementType, setMovementType] = useState('Ingreso'); // 'Ingreso' | 'Egreso'
  const [movementPaymentMethod, setMovementPaymentMethod] = useState('Efectivo'); // 'Efectivo' | 'Yape'
  const [movementAmount, setMovementAmount] = useState('');
  const [movementConcept, setMovementConcept] = useState('');

  // Movements & Orders raw state for active shift
  const [cashMovements, setCashMovements] = useState([]);
  const [orders, setOrders] = useState([]);

  // Load shift movements and orders
  const loadShiftData = async () => {
    if (!currentShift?.isOpen) {
      setCashMovements([]);
      setOrders([]);
      return;
    }

    try {
      const [allMovs, allOrders] = await Promise.all([
        cashService.getCashMovements(),
        cashService.getOrders(),
      ]);
      setCashMovements(allMovs || []);
      setOrders(allOrders || []);
    } catch (err) {
      console.error('Error loading shift data:', err);
    }
  };

  useEffect(() => {
    loadShiftData();

    const handleUpdate = () => {
      loadShiftData();
    };

    window.addEventListener('ohana_orders_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ohana_orders_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [currentShift?.isOpen, currentShift?.openedAt, currentShift?.id]);

  // Compute all Dolce Candys session metrics reactively
  const metrics = useMemo(() => {
    return cashService.computeSessionMetrics({
      currentShift,
      orders,
      movements: cashMovements,
    });
  }, [currentShift, orders, cashMovements]);

  const {
    initialCash,
    adjustedFondo,
    sessionSales,
    salesCount,
    salesCash,
    salesYape,
    salesCard,
    salesMixed,
    cashIncome,
    cashExpenses,
    yapeIncome,
    yapeExpenses,
    totalOtherIncome,
    totalExpenses,
    expectedCash,
    expectedYape,
    totalMoney,
    recentSales,
  } = metrics;

  const handleOpenRegister = (e) => {
    e.preventDefault();
    const amount = parseFloat(openingAmount) || 10.0;
    openShift(amount, user?.name || user?.user_metadata?.name || user?.email || 'Admin Ohana');
    setOpeningAmount('');
    setIsOpenModalVisible(false);
  };

  const handleCloseRegister = async (e) => {
    e.preventDefault();
    const counted = parseFloat(countedAmount) || 0;
    const diff = counted - expectedCash;

    const closingData = {
      countedCash: counted,
      notes,
      sales: sessionSales,
      sales_amount: sessionSales,
      total_general: totalMoney,
      difference: diff,
      opening_amount: initialCash,
      closing_amount: counted,
      closed_at: new Date().toISOString(),
    };

    closeShift(closingData);
    await cashService.saveClosedShift({
      ...currentShift,
      ...closingData,
      user_name: user?.name || user?.user_metadata?.name || currentShift?.cashierName || 'Admin Ohana',
    });
    setIsCloseModalVisible(false);
    setActiveTab('history');
  };

  const handleAddMovement = async (e) => {
    e.preventDefault();
    const amt = parseFloat(movementAmount) || 0;
    if (amt <= 0) return;

    const res = await cashService.recordMovement({
      type: movementType,
      amount: amt,
      concept: movementConcept.trim() || `${movementType} (${movementPaymentMethod})`,
      payment_method: movementPaymentMethod,
      user_name: user?.name || user?.user_metadata?.name || 'Admin Ohana',
      shift_id: currentShift?.id || null,
    });

    if (res?.movement) {
      setCashMovements((prev) => [res.movement, ...prev]);
    }

    setMovementAmount('');
    setMovementConcept('');
    setIsMovementModalVisible(false);
  };

  // Computed session movements and opened at
  const sessionMovements = useMemo(() => {
    if (!currentShift?.isOpen) return [];
    const shiftStart = currentShift.openedAt ? new Date(currentShift.openedAt).getTime() : 0;
    return cashMovements.filter((m) => {
      if (m.shift_id && currentShift.id) {
        return String(m.shift_id) === String(currentShift.id);
      }
      const mTime = new Date(m.created_at || m.date).getTime();
      return !isNaN(mTime) && mTime >= shiftStart;
    });
  }, [currentShift, cashMovements]);

  const formattedOpenedAt = useMemo(() => {
    if (!currentShift?.openedAt) return 'Sin fecha';
    try {
      const d = new Date(currentShift.openedAt);
      if (isNaN(d.getTime())) return String(currentShift.openedAt);
      const dateStr = d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return String(currentShift.openedAt);
    }
  }, [currentShift?.openedAt]);

  const handleDeleteMovement = async (id) => {
    if (window.confirm('¿Deseas eliminar este movimiento de la sesión?')) {
      await cashService.deleteMovement(id);
      setCashMovements((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Comprobantes / Ventas pertenecientes a la sesión activa
  const sessionReceipts = useMemo(() => {
    if (!currentShift?.isOpen) return [];
    const shiftStart = currentShift.openedAt ? new Date(currentShift.openedAt).getTime() : 0;
    
    const filtered = orders.filter((o) => {
      if (o.shift_id && currentShift.id) {
        return String(o.shift_id) === String(currentShift.id);
      }
      const orderTime = new Date(o.created_at || o.date).getTime();
      return !isNaN(orderTime) && orderTime >= shiftStart;
    });

    return filtered
      .sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0))
      .map((o) => {
        const orderDate = new Date(o.created_at || o.date || Date.now());
        const formattedTime = !isNaN(orderDate.getTime())
          ? orderDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'Hoy';

        const rawMethod = (o.payment_method || o.payment || 'Efectivo').toUpperCase();
        let displayMethod = 'Efectivo';
        if (rawMethod.includes('YAPE') || rawMethod.includes('PLIN')) displayMethod = 'Yape';
        else if (rawMethod.includes('TARJETA') || rawMethod.includes('CARD') || rawMethod.includes('POS')) displayMethod = 'Tarjeta';
        else if (rawMethod.includes('MIXTO') || rawMethod.includes('MIXED')) displayMethod = 'Mixto';

        const docType = (o.voucher_type || o.document_type || o.invoice_type || 'Boleta').toLowerCase();
        let displayType = 'Boleta';
        if (docType.includes('factura')) displayType = 'Factura';
        else if (docType.includes('nota')) displayType = 'Nota de Venta';

        return {
          id: o.id || o.ticket_code || Math.random().toString(),
          ticketNumber: o.ticket_code || (o.id ? `B001-${String(o.id).slice(-4)}` : 'B001-0001'),
          type: displayType,
          customer: o.customer_name || o.customer || 'Cliente General',
          user: o.cashier_name || o.user_name || currentShift?.cashierName || user?.name || 'selva plaza',
          method: displayMethod,
          total: Number(o.total || 0),
          status: 'Pagado',
          time: formattedTime,
        };
      });
  }, [currentShift, orders, user]);

  const isClosed = !currentShift?.isOpen;

  return (
    <div className="cash-control-page">
      {/* Top Header */}
      <div className="cash-page-header">
        <div className="cash-header-info">
          <div className="cash-header-title-row">
            <h1 className="cash-page-title">Control de Caja</h1>
            <button 
              type="button" 
              className="cash-help-link"
              onClick={() => setIsHelpModalOpen(true)}
              title="Aprende cómo funciona el Control de Caja"
            >
              <HelpCircle size={15} />
              <span>¿Cómo funciona esta página?</span>
            </button>
          </div>
          <p className="cash-page-subtitle">Gestiona los movimientos de efectivo del día</p>
        </div>

        <div className="cash-header-actions">
          {isClosed ? (
            <button 
              className="btn-cash-red" 
              onClick={() => setIsOpenModalVisible(true)}
            >
              <Unlock size={16} />
              <span>Abrir Caja</span>
            </button>
          ) : (
            <div className="cash-header-buttons-group">
              <button 
                className="btn-cash-outlined-blue"
                onClick={() => setIsMovementModalVisible(true)}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Movimiento</span>
              </button>
              <button 
                className="btn-cash-close-red" 
                onClick={() => {
                  setCountedAmount('');
                  setNotes('');
                  setIsCloseModalVisible(true);
                }}
              >
                <Lock size={16} />
                <span>Cerrar Caja</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="cash-tabs-bar">
        <button 
          className={`cash-tab-btn ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          <span className="tab-symbol">$</span>
          <span>Caja Actual</span>
        </button>

        <button 
          className={`cash-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={15} />
          <span>Historial</span>
        </button>

        <button 
          className={`cash-tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          <Scale size={15} />
          <span>Balance</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="cash-tab-content">
        {/* TAB 1: CAJA ACTUAL */}
        {activeTab === 'current' && (
          <>
            {isClosed ? (
              /* CLEAN COMPACT DOLCE CANDYS STYLE VIEW IN OHANA ORANGE */
              <div className="cash-closed-wrapper">
                <div className="cash-closed-card">
                  <div className="cash-closed-main-content">
                    <div className="lock-icon-outer-ring">
                      <div className="lock-icon-badge">
                        <Lock size={22} className="lock-svg" />
                      </div>
                    </div>

                    <h2 className="cash-closed-title">Caja Cerrada</h2>
                    <p className="cash-closed-desc">
                      Para comenzar a registrar ventas y movimientos, abre la caja con el monto inicial
                    </p>

                    <button 
                      className="btn-cash-red"
                      onClick={() => setIsOpenModalVisible(true)}
                    >
                      <Unlock size={16} />
                      <span>Abrir Caja</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* CAJA ABIERTA - EXACT MATCH TO USER REQUEST & SCREENSHOT */
              <div className="cash-open-section">
                {/* 4 Top KPI Cards */}
                <div className="cash-stats-row">
                  {/* Card 1: Monto Inicial */}
                  <div className="cash-stat-card">
                    <div className="cash-stat-info">
                      <span className="cash-stat-label">Monto Inicial</span>
                      <span className="cash-stat-val text-slate-900">
                        S/ {initialCash.toFixed(2)}
                      </span>
                    </div>
                    <div className="cash-stat-icon-badge blue-light">
                      <span className="stat-currency-dollar">$</span>
                    </div>
                  </div>

                  {/* Card 2: Ventas de la Sesión */}
                  <div className="cash-stat-card">
                    <div className="cash-stat-info">
                      <span className="cash-stat-label">Ventas de la Sesión</span>
                      <span className="cash-stat-val text-emerald-600">
                        S/ {sessionSales.toFixed(2)}
                      </span>
                      <span className="cash-stat-sub">
                        {salesCount} {salesCount === 1 ? 'comprobante' : 'comprobantes'} en esta caja
                      </span>
                    </div>
                    <div className="cash-stat-icon-badge green-light">
                      <ShoppingBag size={20} className="text-emerald-500" />
                    </div>
                  </div>

                  {/* Card 3: Otros Ingresos */}
                  <div className="cash-stat-card">
                    <div className="cash-stat-info">
                      <span className="cash-stat-label">Otros Ingresos</span>
                      <span className="cash-stat-val text-emerald-600">
                        S/ {totalOtherIncome.toFixed(2)}
                      </span>
                    </div>
                    <div className="cash-stat-icon-badge green-light">
                      <TrendingUp size={20} className="text-emerald-500" />
                    </div>
                  </div>

                  {/* Card 4: Egresos */}
                  <div className="cash-stat-card">
                    <div className="cash-stat-info">
                      <span className="cash-stat-label">Egresos</span>
                      <span className="cash-stat-val text-rose-600">
                        S/ {totalExpenses.toFixed(2)}
                      </span>
                    </div>
                    <div className="cash-stat-icon-badge red-light">
                      <TrendingDown size={20} className="text-rose-500" />
                    </div>
                  </div>
                </div>

                {/* 2 Columns: Left (Resumen de Caja) & Right (Movimientos de la Sesión) */}
                <div className="cash-open-two-columns mt-6">
                  {/* Left Column: Resumen de Caja */}
                  <div className="cash-panel-card">
                    <h3 className="cash-panel-card-title">Resumen de Caja</h3>
                    
                    <div className="cash-resumen-list">
                      <div className="cash-resumen-row">
                        <span className="cash-resumen-label">Monto Inicial:</span>
                        <span className="cash-resumen-val">S/ {initialCash.toFixed(2)}</span>
                      </div>

                      <div className="cash-resumen-row">
                        <span className="cash-resumen-label">Ventas de la Sesión:</span>
                        <span className="cash-resumen-val text-emerald-600">S/ {sessionSales.toFixed(2)}</span>
                      </div>

                      <div className="cash-resumen-subrow">
                        <span className="text-slate-500">• Efectivo:</span>
                        <span className="font-semibold text-emerald-600">S/ {salesCash.toFixed(2)}</span>
                      </div>

                      <div className="cash-resumen-subrow">
                        <span className="text-slate-500">• Yape:</span>
                        <span className="font-semibold text-emerald-600">S/ {salesYape.toFixed(2)}</span>
                      </div>

                      {salesCard > 0 && (
                        <div className="cash-resumen-subrow">
                          <span className="text-slate-500">• Tarjeta:</span>
                          <span className="font-semibold text-blue-600">S/ {salesCard.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="cash-resumen-divider"></div>

                      <div className="cash-resumen-row">
                        <span className="cash-resumen-label text-emerald-600">+ Otros Ingresos:</span>
                        <span className="cash-resumen-val text-emerald-600">S/ {totalOtherIncome.toFixed(2)}</span>
                      </div>

                      <div className="cash-resumen-divider"></div>

                      <div className="cash-resumen-row">
                        <span className="cash-resumen-label text-rose-600">- Egresos:</span>
                        <span className="cash-resumen-val text-rose-600">S/ {totalExpenses.toFixed(2)}</span>
                      </div>

                      {/* Highlight Box: Efectivo Esperado */}
                      <div className="cash-expected-box">
                        <span className="cash-expected-label">Efectivo Esperado:</span>
                        <span className="cash-expected-amount">S/ {expectedCash.toFixed(2)}</span>
                      </div>

                      {/* Notes / Meta */}
                      <div className="cash-resumen-formula">
                        Fórmula: Inicial (S/ {initialCash.toFixed(2)}) + Ventas Efectivo (S/ {salesCash.toFixed(2)}) + Ingresos (S/ {cashIncome.toFixed(2)}) - Egresos (S/ {cashExpenses.toFixed(2)})
                      </div>

                      <div className="cash-resumen-opened">
                        <Clock size={13} className="text-slate-400" />
                        <span>Abierto: {formattedOpenedAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Movimientos de la Sesión */}
                  <div className="cash-panel-card">
                    <h3 className="cash-panel-card-title">Movimientos de la Sesión</h3>

                    <div className="cash-movements-alert">
                      <strong>Nota:</strong> Las ventas del POS se registran automáticamente. Aquí se muestran solo los movimientos adicionales (pagos, cobros, gastos, etc.) que registres con el botón "Movimiento".
                    </div>

                    {sessionMovements.length === 0 ? (
                      <div className="cash-movements-empty">
                        <p className="cash-movements-empty-title">No hay movimientos adicionales registrados</p>
                        <p className="cash-movements-empty-sub">Haz clic en "Movimiento" para registrar ingresos o egresos</p>
                      </div>
                    ) : (
                      <div className="cash-session-table-wrapper">
                        <table className="cash-session-table">
                          <thead>
                            <tr>
                              <th>Tipo</th>
                              <th>Concepto / Motivo</th>
                              <th>Medio</th>
                              <th>Monto</th>
                              <th>Hora</th>
                              <th>Usuario</th>
                              <th style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessionMovements.map((mov) => {
                              const isIngreso = (mov.type || '').toLowerCase().includes('ingreso') || (mov.operation || '').toLowerCase().includes('ingreso');
                              const movDate = new Date(mov.created_at || mov.date || Date.now());
                              const movTime = !isNaN(movDate.getTime()) 
                                ? movDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Hoy';

                              return (
                                <tr key={mov.id}>
                                  <td>
                                    <span className={`badge-type ${isIngreso ? 'success' : 'warning'}`}>
                                      {isIngreso ? 'Ingreso' : 'Egreso'}
                                    </span>
                                  </td>
                                  <td className="font-medium text-slate-800">
                                    {mov.concept || mov.operation || 'Movimiento'}
                                  </td>
                                  <td>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                      {mov.payment_method || 'Efectivo'}
                                    </span>
                                  </td>
                                  <td className={`font-bold ${isIngreso ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isIngreso ? '+' : '-'} S/ {Number(mov.amount || 0).toFixed(2)}
                                  </td>
                                  <td className="text-slate-500 text-xs">{movTime}</td>
                                  <td className="text-slate-600 text-xs">{mov.user_name || 'Admin'}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button 
                                      className="btn-del-movement" 
                                      title="Eliminar movimiento"
                                      onClick={() => handleDeleteMovement(mov.id)}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comprobantes de esta sesión */}
                <div className="cash-receipts-panel-card">
                  <h3 className="cash-receipts-title">
                    <FileText size={18} className="text-slate-500" />
                    <span>Comprobantes de esta sesión ({sessionReceipts.length})</span>
                  </h3>

                  {sessionReceipts.length === 0 ? (
                    <div className="cash-movements-empty" style={{ padding: '2.5rem 1rem', minHeight: 'auto' }}>
                      <p className="cash-movements-empty-title">Sin comprobantes emitidos en esta sesión</p>
                      <p className="cash-movements-empty-sub">Las ventas cobradas desde el POS aparecerán listadas aquí</p>
                    </div>
                  ) : (
                    <div className="cash-receipts-table-wrapper">
                      <table className="cash-receipts-table">
                        <thead>
                          <tr>
                            <th>NÚMERO</th>
                            <th>TIPO</th>
                            <th>CLIENTE</th>
                            <th>USUARIO</th>
                            <th>MÉTODO</th>
                            <th>TOTAL</th>
                            <th>ESTADO</th>
                            <th style={{ textAlign: 'right' }}>HORA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionReceipts.map((rcpt) => (
                            <tr key={rcpt.id}>
                              <td className="ticket-number-cell">
                                {rcpt.ticketNumber}
                              </td>
                              <td>{rcpt.type}</td>
                              <td>{rcpt.customer}</td>
                              <td>{rcpt.user}</td>
                              <td>{rcpt.method}</td>
                              <td className="font-bold text-slate-900">
                                S/ {rcpt.total.toFixed(2)}
                              </td>
                              <td>
                                <span className="ticket-status-pill paid">
                                  {rcpt.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }} className="text-slate-500 text-xs">
                                {rcpt.time}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: HISTORIAL (CIERRES Y MOVIMIENTOS) */}
        {activeTab === 'history' && (
          <CashHistoryView />
        )}

        {/* TAB 3: BALANCE FINANCIERO (MATCHING MOCKUP) */}
        {activeTab === 'balance' && (
          <CashBalanceView />
        )}
      </div>

      {/* MODAL: APERTURA DE CAJA (MATCHING SCREENSHOT) */}
      {isOpenModalVisible && (
        <div className="modal-backdrop" onClick={() => setIsOpenModalVisible(false)}>
          <div className="modal-dialog modal-initial-amount" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title-initial">Monto Inicial</h3>
              <button className="modal-close-btn" onClick={() => setIsOpenModalVisible(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOpenRegister}>
              <div className="modal-body-initial">
                <div className="form-group mb-3">
                  <label className="form-label-initial">Tipo de Operación</label>
                  <input 
                    type="text"
                    className="form-input-initial readonly"
                    value="Apertura de Caja (Monto Inicial)"
                    readOnly
                  />
                </div>

                <div className="form-group mb-1">
                  <label className="form-label-initial">Monto (S/)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input-initial"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer-initial">
                <button 
                  type="button" 
                  className="btn-modal-cancel"
                  onClick={() => setIsOpenModalVisible(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-submit">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR MOVIMIENTO (EXACT MATCH TO SCREENSHOT 3 & 4) */}
      {isMovementModalVisible && (
        <div className="modal-backdrop" onClick={() => setIsMovementModalVisible(false)}>
          <div className="modal-dialog modal-initial-amount" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title-initial">Movimientos de caja</h3>
              <button className="modal-close-btn" onClick={() => setIsMovementModalVisible(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMovement}>
              <div className="modal-body-initial">
                {/* 1. Dos Cuadros: Ingreso / Egreso */}
                <div className="form-group mb-3">
                  <label className="form-label-initial">Tipo de Movimiento</label>
                  <div className="modal-movement-type-grid">
                    <button
                      type="button"
                      className={`modal-movement-type-btn ${movementType === 'Ingreso' ? 'active-ingreso' : ''}`}
                      onClick={() => setMovementType('Ingreso')}
                    >
                      <TrendingUp size={18} />
                      <span>Ingreso</span>
                    </button>

                    <button
                      type="button"
                      className={`modal-movement-type-btn ${movementType === 'Egreso' ? 'active-egreso' : ''}`}
                      onClick={() => setMovementType('Egreso')}
                    >
                      <TrendingDown size={18} />
                      <span>Egreso</span>
                    </button>
                  </div>
                </div>

                {/* 2. Lista: Medio de Pago (Efectivo o Yape) */}
                <div className="form-group mb-3">
                  <label className="form-label-initial">Medio de Pago</label>
                  <select
                    className="form-input-initial cursor-pointer"
                    value={movementPaymentMethod}
                    onChange={(e) => setMovementPaymentMethod(e.target.value)}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Yape">Yape</option>
                  </select>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label-initial">Monto (S/)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0.10"
                    placeholder="0.00"
                    className="form-input-initial"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group mb-1">
                  <label className="form-label-initial">Concepto / Motivo (Opcional)</label>
                  <input 
                    type="text"
                    placeholder="Ej: Compra menor, pago de servicio, pasaje..."
                    className="form-input-initial"
                    value={movementConcept}
                    onChange={(e) => setMovementConcept(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-initial">
                <button 
                  type="button" 
                  className="btn-modal-cancel"
                  onClick={() => setIsMovementModalVisible(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-submit">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CIERRE DE CAJA (EXACT MATCH TO USER SCREENSHOT) */}
      {isCloseModalVisible && (
        <div className="modal-backdrop" onClick={() => setIsCloseModalVisible(false)}>
          <div className="modal-dialog modal-close-cash-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title-initial">Cierre de Caja</h3>
              <button className="modal-close-btn" onClick={() => setIsCloseModalVisible(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseRegister}>
              <div className="modal-body-close-cash">
                {/* Breakdown List */}
                <div className="close-breakdown-list">
                  <div className="close-breakdown-line">
                    <span className="close-line-label">(+) Monto Apertura:</span>
                    <span className="close-line-val">S/ {initialCash.toFixed(2)}</span>
                  </div>
                  <div className="close-breakdown-line">
                    <span className="close-line-label">(+) Ventas en Efectivo:</span>
                    <span className="close-line-val">S/ {salesCash.toFixed(2)}</span>
                  </div>
                  <div className="close-breakdown-line">
                    <span className="close-line-label">(+) Ingresos de Efectivo:</span>
                    <span className="close-line-val">S/ {cashIncome.toFixed(2)}</span>
                  </div>
                  <div className="close-breakdown-line">
                    <span className="close-line-label">(-) Egresos de Efectivo:</span>
                    <span className="close-line-val">S/ {cashExpenses.toFixed(2)}</span>
                  </div>
                  <div className="close-breakdown-line">
                    <span className="close-line-label">(*) Ventas en Mixto (Total):</span>
                    <span className="close-line-val">S/ {salesMixed.toFixed(2)}</span>
                  </div>
                </div>

                <div className="close-divider"></div>

                {/* Saldo Esperado */}
                <div className="close-expected-row">
                  <span className="close-expected-label">Saldo Esperado en Caja:</span>
                  <span className="close-expected-val">S/ {expectedCash.toFixed(2)}</span>
                </div>

                {/* Input Efectivo Real */}
                <div className="form-group my-3">
                  <label className="close-input-label">Efectivo Real en Caja (S/)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="close-cash-input"
                    value={countedAmount}
                    onChange={(e) => setCountedAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Diferencia (Arqueo) */}
                <div className="close-diff-row">
                  <span className="close-diff-label">Diferencia (Arqueo):</span>
                  {(() => {
                    if (countedAmount === '' || countedAmount === null || countedAmount === undefined) {
                      return <span className="close-diff-val text-slate-400 font-medium">Ingresa el conteo</span>;
                    }
                    const counted = parseFloat(countedAmount);
                    if (isNaN(counted)) {
                      return <span className="close-diff-val text-slate-400 font-medium">Monto inválido</span>;
                    }
                    const diff = counted - expectedCash;
                    if (Math.abs(diff) < 0.01) {
                      return <span className="close-diff-val text-emerald-600 font-bold">Caja Cuadrada (S/ 0.00)</span>;
                    } else if (diff < 0) {
                      return <span className="close-diff-val text-rose-600 font-bold">Faltante (-S/ {Math.abs(diff).toFixed(2)})</span>;
                    } else {
                      return <span className="close-diff-val text-blue-600 font-bold">Sobrante (+S/ {diff.toFixed(2)})</span>;
                    }
                  })()}
                </div>
              </div>

              <div className="modal-footer-initial">
                <button 
                  type="button" 
                  className="btn-modal-cancel"
                  onClick={() => setIsCloseModalVisible(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-close-submit">
                  Registrar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GUÍA DE AYUDA (¿CÓMO FUNCIONA ESTA PÁGINA?) */}
      {isHelpModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsHelpModalOpen(false)}>
          <div className="modal-dialog modal-help-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="modal-icon-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <HelpCircle size={20} />
                </div>
                <h3 className="modal-title-initial">¿Cómo funciona el Control de Caja?</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsHelpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="cash-help-guide-item">
                <div className="cash-help-guide-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <DollarSign size={18} />
                </div>
                <div>
                  <h4 className="cash-help-guide-title">1. Monto Inicial</h4>
                  <p className="cash-help-guide-text">
                    Es el efectivo inicial en gaveta al momento de abrir la jornada. Sirve como base para vueltos y pagos menores.
                  </p>
                </div>
              </div>

              <div className="cash-help-guide-item">
                <div className="cash-help-guide-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <h4 className="cash-help-guide-title">2. Ventas de la Sesión</h4>
                  <p className="cash-help-guide-text">
                    Se registran y totalizan automáticamente con cada pedido cobrado en el POS (desglosado en Efectivo, Yape y otros medios).
                  </p>
                </div>
              </div>

              <div className="cash-help-guide-item">
                <div className="cash-help-guide-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h4 className="cash-help-guide-title">3. Otros Ingresos y Egresos</h4>
                  <p className="cash-help-guide-text">
                    Utiliza el botón <strong>"+ Movimiento"</strong> para anotar salidas (gastos diarios, compras de emergencia, retiros) o ingresos que no correspondan a ventas.
                  </p>
                </div>
              </div>

              <div className="cash-help-guide-item">
                <div className="cash-help-guide-icon" style={{ background: '#eff6ff', color: '#1e40af' }}>
                  <Banknote size={18} />
                </div>
                <div>
                  <h4 className="cash-help-guide-title">4. Efectivo Esperado</h4>
                  <p className="cash-help-guide-text">
                    Es el total físico que debe existir en gaveta: <code>Monto Inicial + Ventas en Efectivo + Ingresos - Egresos</code>.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '0.85rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-cash-outlined-blue"
                onClick={() => setIsHelpModalOpen(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegisterPage;
