import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Plus, 
  Minus, 
  Send, 
  FileText, 
  Building2, 
  Receipt,
  Search, 
  User, 
  ShoppingBag, 
  CreditCard,
  Briefcase,
  MapPin,
  Wallet,
  UtensilsCrossed,
  Bike,
  ChevronRight,
  ChevronDown,
  Edit2,
  X,
  Check,
  Tag,
  Clock,
  Coins,
  Shuffle
} from 'lucide-react';
import { usePOS } from '../../../hooks/usePOS';
import { formatCurrency } from '../../../utils/formatCurrency';
import { syncAndGetNextBoletaNumber, sanitizeOrderTicketCode } from '../../../utils/storageUtils';
import { cashService } from '../../../services/cashService';

// Logos de pago con transparencia nativa
const PaymentIcon = ({ src, alt, className = '' }) => (
  <img src={src} alt={alt} className={className} loading="eager" decoding="sync" />
);

// Helper para resolver miniatura del producto si no viene embebida en la orden
const resolveItemImage = (it) => {
  if (it?.image && (it.image.startsWith('data:') || it.image.startsWith('http') || it.image.startsWith('/'))) {
    return it.image;
  }
  try {
    const raw = localStorage.getItem('ohana_products');
    if (raw) {
      const prods = JSON.parse(raw);
      const targetName = (it?.name || it?.product_name || '').toLowerCase().trim();
      const match = prods.find((p) => (p.id && (p.id === it?.id || p.id === it?.product_id)) || (p.name && p.name.toLowerCase().trim() === targetName));
      if (match?.image) return match.image;
    }
  } catch {}
  return null;
};

export const OrderCart = ({ onOpenPayment, onParkOrder }) => {
  const {
    items,
    removeItem,
    updateQuantity,
    updateItemNotes,
    clearCart,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    customerName,
    setCustomerName,
    total,
    activeOrderId,
    activeOrderTicketCode,
    loadOrder,
  } = usePOS();

  // Modales
  const [isModalityModalOpen, setIsModalityModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [activeNoteItem, setActiveNoteItem] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [customTable, setCustomTable] = useState('');

  // Lista de ventas aparcadas / pendientes
  const [parkedOrders, setParkedOrders] = useState(() => cashService.getPendingOrders());
  const [showParkedDropdown, setShowParkedDropdown] = useState(false);
  const parkedDropdownRef = useRef(null);

  useEffect(() => {
    const handleSyncParked = () => {
      setParkedOrders(cashService.getPendingOrders());
    };
    handleSyncParked();
    window.addEventListener('ohana_orders_updated', handleSyncParked);
    window.addEventListener('storage', handleSyncParked);
    return () => {
      window.removeEventListener('ohana_orders_updated', handleSyncParked);
      window.removeEventListener('storage', handleSyncParked);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (parkedDropdownRef.current && !parkedDropdownRef.current.contains(e.target)) {
        setShowParkedDropdown(false);
      }
    };
    if (showParkedDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showParkedDropdown]);

  // Cambiar cíclicamente a la otra venta aparcada
  const handleCycleParkedOrder = () => {
    if (parkedOrders.length === 0) return;

    if (parkedOrders.length === 1) {
      const single = parkedOrders[0];
      loadOrder(single);
      window.dispatchEvent(
        new CustomEvent('ohana_toast', {
          detail: { message: `Pedido #${single.ticket_code} cargado para comprar`, type: 'info' },
        })
      );
      return;
    }

    // Si hay más de 1 venta aparcada:
    // Buscar la posición de la venta cargada actualmente
    const currentIdx = parkedOrders.findIndex((o) => String(o.id) === String(activeOrderId));

    // Si ya está en la venta actual, cambiar a la siguiente; si no, cargar la primera
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % parkedOrders.length : 0;
    const targetOrder = parkedOrders[nextIdx];

    if (targetOrder) {
      loadOrder(targetOrder);
      window.dispatchEvent(
        new CustomEvent('ohana_toast', {
          detail: {
            message: `Pedido #${targetOrder.ticket_code} cargado (${nextIdx + 1} de ${parkedOrders.length})`,
            type: 'info',
          },
        })
      );
    }
  };

  // Tipo de comprobante: 'nota' | 'boleta' | 'factura'
  const [docType, setDocType] = useState('nota');

  // Número correlativo reactivo, sincronizado con las órdenes reales según tipo de documento
  const [boletaNumber, setBoletaNumber] = useState(() => syncAndGetNextBoletaNumber(null, 'nota'));

  useEffect(() => {
    const handleUpdate = () => {
      const nextNum = syncAndGetNextBoletaNumber(null, docType);
      setBoletaNumber(nextNum);
    };

    // Sincronizar al montar y cada vez que cambia el tipo de documento
    handleUpdate();

    window.addEventListener('ohana_boleta_num_updated', handleUpdate);
    window.addEventListener('ohana_orders_updated', handleUpdate);
    window.addEventListener('ohana_shift_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('ohana_boleta_num_updated', handleUpdate);
      window.removeEventListener('ohana_orders_updated', handleUpdate);
      window.removeEventListener('ohana_shift_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [docType]);
  // Método de pago: 'efectivo' | 'tarjeta' | 'yape' | 'mixto'
  const [paymentMethod, setPaymentMethod] = useState('efectivo');

  // Datos de cliente
  const [customerDni, setCustomerDni] = useState('');
  const [rucNumber, setRucNumber] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [facturaAddress, setFacturaAddress] = useState('');

  // Efectivo y desglose
  const [cashGiven, setCashGiven] = useState('');
  const [mixedCash, setMixedCash] = useState('');
  const [mixedCard, setMixedCard] = useState('');
  const [mixedYape, setMixedYape] = useState('');

  // Descuentos: Global y por Producto (soporta manual % o S/)
  const [orderDiscountType, setOrderDiscountType] = useState('percent'); // 'percent' | 'amount'
  const [orderDiscountVal, setOrderDiscountVal] = useState('');
  const [showOrderDiscountInput, setShowOrderDiscountInput] = useState(false);

  // Descuentos por producto: { [itemId]: { type: 'percent' | 'amount', value: string|number } }
  const [itemDiscounts, setItemDiscounts] = useState({});
  const [editingDiscountItemId, setEditingDiscountItemId] = useState(null);

  // Cálculos de totales y descuentos
  const subtotal = total;

  let totalItemDiscounts = 0;
  items.forEach((it) => {
    const disc = itemDiscounts[it.id];
    const val = parseFloat(disc?.value) || 0;
    if (disc && val > 0) {
      const itPrice = (Number(it.price) || 0) * (it.quantity || 1);
      const d = disc.type === 'percent'
        ? (itPrice * val) / 100
        : Math.min(itPrice, val);
      totalItemDiscounts += d;
    }
  });

  const subtotalAfterItemDiscounts = Math.max(0, subtotal - totalItemDiscounts);
  const parsedOrderDisc = parseFloat(orderDiscountVal) || 0;
  let globalDiscountAmount = 0;
  if (parsedOrderDisc > 0) {
    if (orderDiscountType === 'percent') {
      globalDiscountAmount = (subtotalAfterItemDiscounts * parsedOrderDisc) / 100;
    } else {
      globalDiscountAmount = Math.min(subtotalAfterItemDiscounts, parsedOrderDisc);
    }
  }

  const totalDiscount = totalItemDiscounts + globalDiscountAmount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  const cashAmount = parseFloat(cashGiven) || 0;
  const changeAmount = cashAmount > finalTotal ? cashAmount - finalTotal : 0;

  const numMixedCash = parseFloat(mixedCash) || 0;
  const numMixedCard = parseFloat(mixedCard) || 0;
  const numMixedYape = parseFloat(mixedYape) || 0;
  const mixedSum = numMixedCash + numMixedCard + numMixedYape;
  const mixedRemaining = Math.max(0, finalTotal - mixedSum);

  // Lista de mesas predefinidas para selección rápida
  const PRESET_TABLES = [
    'Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4',
    'Mesa 5', 'Mesa 6', 'Mesa 7', 'Mesa 8',
    'Mesa 9', 'Mesa 10', 'Barra 1', 'Barra 2'
  ];

  const handleSearchDni = () => {
    if (customerDni.length === 8) {
      setCustomerName(customerName || 'Cliente DNI ' + customerDni);
    } else {
      alert('Por favor ingresa un DNI válido de 8 dígitos');
    }
  };

  const handleSearchRuc = () => {
    if (rucNumber.length === 11) {
      setRazonSocial('EMPRESA DEMO S.A.C.');
    } else {
      alert('Por favor ingresa un RUC válido de 11 dígitos');
    }
  };

  // Abrir modal de notas para un producto
  const handleOpenNoteModal = (item) => {
    setActiveNoteItem(item);
    setNoteDraft(item.notes || '');
  };

  const handleSaveNote = () => {
    if (activeNoteItem) {
      if (updateItemNotes) {
        updateItemNotes(activeNoteItem.id, noteDraft.trim());
      }
    }
    setActiveNoteItem(null);
  };

  // Texto e icono dinámico del selector superior
  const getModalityLabel = () => {
    if (orderType === 'DINE_IN') {
      return tableNumber || 'Elegir Mesa';
    }
    if (orderType === 'TAKE_AWAY' || orderType === 'TAKEAWAY') {
      return 'Para Llevar';
    }
    if (orderType === 'DELIVERY') {
      return 'Delivery';
    }
    return 'Elegir Mesa';
  };

  const getOrderModalityDisplay = () => {
    if (orderType === 'TAKE_AWAY' || orderType === 'TAKEAWAY') {
      return 'Para llevar';
    }
    if (orderType === 'DELIVERY') {
      return 'Para delivery';
    }
    return tableNumber || 'Mesa';
  };

  const renderModalityIcon = () => {
    if (orderType === 'DINE_IN') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 21v-8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8"/>
          <path d="M5 11V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/>
          <path d="M3 21h18"/>
        </svg>
      );
    }
    if (orderType === 'DELIVERY') {
      return <Bike size={15} />;
    }
    return <ShoppingBag size={15} />;
  };

  const handleConfirmCheckout = () => {
    const currentNum = syncAndGetNextBoletaNumber(null, docType);
    setBoletaNumber(currentNum);
    let prefix = 'NV01';
    if (docType === 'boleta') prefix = 'B001';
    else if (docType === 'factura') prefix = 'F001';

    let ticketCode = `${prefix}-${String(currentNum || 1).padStart(4, '0')}`;
    ticketCode = sanitizeOrderTicketCode(ticketCode);

    let resolvedCustomerName = 'Cliente General';
    let resolvedDocNumber = '';

    if (docType === 'factura') {
      resolvedCustomerName = razonSocial || customerName || 'Cliente Empresa';
      resolvedDocNumber = rucNumber;
    } else if (docType === 'boleta') {
      resolvedCustomerName = customerName || (customerDni ? `Cliente DNI ${customerDni}` : 'Cliente General');
      resolvedDocNumber = customerDni;
    } else {
      resolvedCustomerName = customerName || 'Cliente General';
      resolvedDocNumber = '';
    }

    const effectiveCashGiven = paymentMethod === 'efectivo'
      ? (parseFloat(cashGiven) || finalTotal)
      : finalTotal;

    const effectiveChange = paymentMethod === 'efectivo'
      ? (effectiveCashGiven > finalTotal ? effectiveCashGiven - finalTotal : 0)
      : 0;

    onOpenPayment({
      ticket_code: ticketCode,
      docType,
      customerDni: docType === 'boleta' ? customerDni : '',
      customerName: resolvedCustomerName,
      doc_number: resolvedDocNumber,
      customer_address: docType === 'factura' ? facturaAddress : '',
      paymentMethod,
      cashGiven: effectiveCashGiven,
      changeAmount: effectiveChange,
      discountVal: totalDiscount || 0,
      finalTotal,
      mixedCash: parseFloat(mixedCash) || 0,
      mixedCard: parseFloat(mixedCard) || 0,
      mixedYape: parseFloat(mixedYape) || 0,
      itemDiscounts,
    });
    setIsCheckoutModalOpen(false);
  };

  // Aparcar venta actual como pendiente
  const handleParkCurrentOrder = async () => {
    if (items.length === 0) return;

    let defaultPrefix = 'NV01';
    if (docType === 'boleta') defaultPrefix = 'B001';
    else if (docType === 'factura') defaultPrefix = 'F001';

    const ticketCode = activeOrderTicketCode || `${defaultPrefix}-${String(boletaNumber).padStart(4, '0')}`;

    let resolvedCustomerName = 'Cliente General';
    let resolvedDocNumber = '';

    if (docType === 'factura') {
      resolvedCustomerName = razonSocial || customerName || 'Cliente Empresa';
      resolvedDocNumber = rucNumber;
    } else if (docType === 'boleta') {
      resolvedCustomerName = customerName || (customerDni ? `Cliente DNI ${customerDni}` : 'Cliente General');
      resolvedDocNumber = customerDni;
    } else {
      resolvedCustomerName = customerName || 'Cliente General';
      resolvedDocNumber = '';
    }

    try {
      let saved = null;
      if (onParkOrder) {
        saved = await onParkOrder({
          ticket_code: ticketCode,
          docType,
          customerName: resolvedCustomerName,
          doc_number: resolvedDocNumber,
        });
      }
      // Actualizar inmediatamente la lista reactiva de aparcadas para refrescar la UI
      const freshOrders = cashService.getPendingOrders();
      if (saved && !freshOrders.some((o) => String(o.id) === String(saved.id))) {
        freshOrders.unshift(saved);
      }
      setParkedOrders(freshOrders);
    } catch (e) {
      console.error('Error al aparcar venta:', e);
    } finally {
      setIsCheckoutModalOpen(false);
    }
  };

  return (
    <div className="pos-cart-panel card-panel">
      {/* 1. BARRA SUPERIOR: SELECTOR DE TIPO DE COMPROBANTE & SELECCIÓN DE MESA/MODALIDAD */}
      <div className="pos-cart-top-bar">
        <div className="pos-doc-section-wrapper">
          <div className="pos-doc-header-row">
            <span className="pos-doc-section-label">Comprobantes</span>
            <span className="pos-doc-section-current">
              #{docType === 'factura' ? 'F001' : docType === 'boleta' ? 'B001' : 'NV01'}-{String(boletaNumber).padStart(4, '0')}
            </span>
          </div>
          <div className="pos-doc-type-pills" role="tablist" title="Seleccionar tipo de comprobante">
            <button
              type="button"
              className={`pos-doc-pill ${docType === 'nota' ? 'active' : ''}`}
              onClick={() => setDocType('nota')}
            >
              Nota de Venta
            </button>
            <button
              type="button"
              className={`pos-doc-pill ${docType === 'boleta' ? 'active' : ''}`}
              onClick={() => setDocType('boleta')}
            >
              Boleta
            </button>
            <button
              type="button"
              className={`pos-doc-pill ${docType === 'factura' ? 'active' : ''}`}
              onClick={() => setDocType('factura')}
            >
              Factura
            </button>
          </div>
        </div>

        <button
          type="button"
          className="pos-select-table-btn"
          onClick={() => setIsModalityModalOpen(true)}
          title="Cambiar tipo de pedido (Mesa, Para Llevar, Delivery)"
        >
          <span className="select-table-icon">
            {renderModalityIcon()}
          </span>
          <span className="select-table-label">{getModalityLabel()}</span>
          <ChevronRight size={13} className="select-table-arrow" />
        </button>
      </div>

      {/* CAMPOS DE DATOS PARA BOLETA Y FACTURA */}
      {docType === 'boleta' && (
        <div className="pos-cart-doc-data-card">
          <div className="pos-cart-doc-data-row">
            <div className="pos-doc-field-dni has-search">
              <input
                type="text"
                maxLength={8}
                placeholder="DNI (8 dígitos)"
                value={customerDni}
                onChange={(e) => setCustomerDni(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchDni(); }}
                className="pos-cart-doc-input"
              />
              <button
                type="button"
                className="pos-doc-search-icon-btn"
                onClick={handleSearchDni}
                title="Consultar DNI (RENIEC)"
              >
                <Search size={13} />
              </button>
            </div>
            <div className="pos-doc-field-name">
              <input
                type="text"
                placeholder="Nombre del cliente..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="pos-cart-doc-input"
              />
            </div>
          </div>
        </div>
      )}

      {docType === 'factura' && (
        <div className="pos-cart-doc-data-card">
          <div className="pos-cart-doc-data-row">
            <div className="pos-doc-field-ruc has-search">
              <input
                type="text"
                maxLength={11}
                placeholder="RUC (11 dígitos)"
                value={rucNumber}
                onChange={(e) => setRucNumber(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchRuc(); }}
                className="pos-cart-doc-input"
              />
              <button
                type="button"
                className="pos-doc-search-icon-btn"
                onClick={handleSearchRuc}
                title="Consultar RUC (SUNAT)"
              >
                <Search size={13} />
              </button>
            </div>
            <div className="pos-doc-field-razon">
              <input
                type="text"
                placeholder="Razón Social..."
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="pos-cart-doc-input"
              />
            </div>
          </div>
          <div className="pos-cart-doc-data-row" style={{ marginTop: '3px' }}>
            <input
              type="text"
              placeholder="Dirección Fiscal (opcional)..."
              value={facturaAddress}
              onChange={(e) => setFacturaAddress(e.target.value)}
              className="pos-cart-doc-input full-width"
            />
          </div>
        </div>
      )}

      {/* 2. SECCIÓN PRODUCTOS DEL PEDIDO CON CANTIDAD */}
      <div className="pos-cart-section-label">
        <div className="pos-cart-section-title-wrap">
          <span>
            CANTIDAD ({items.reduce((acc, it) => acc + it.quantity, 0)})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {parkedOrders.length > 0 && (
            <div className="pos-parked-btn-wrapper" ref={parkedDropdownRef} style={{ position: 'relative' }}>
              <div className="pos-parked-btn-group" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-park-inline"
                  onClick={handleCycleParkedOrder}
                  title={
                    parkedOrders.length > 1
                      ? `Haz clic para cambiar a la otra venta aparcada (${parkedOrders.length} en espera)`
                      : `Cargar venta aparcada #${parkedOrders[0]?.ticket_code || ''}`
                  }
                  style={{
                    background: '#fef3c7',
                    borderColor: '#fde047',
                    color: '#92400e',
                    borderTopRightRadius: parkedOrders.length > 1 ? 0 : '6px',
                    borderBottomRightRadius: parkedOrders.length > 1 ? 0 : '6px',
                  }}
                >
                  <Clock size={11} />
                  <span>Aparcadas ({parkedOrders.length})</span>
                </button>

                {parkedOrders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowParkedDropdown((prev) => !prev)}
                    title="Ver lista de todas las ventas aparcadas"
                    style={{
                      background: '#fef3c7',
                      borderColor: '#fde047',
                      color: '#92400e',
                      borderLeft: '1px solid #fcd34d',
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderTopRightRadius: '6px',
                      borderBottomRightRadius: '6px',
                      padding: '0 5px',
                      height: '24px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <ChevronDown size={11} />
                  </button>
                )}
              </div>

              {showParkedDropdown && parkedOrders.length > 1 && (
                <div className="pos-parked-quick-dropdown">
                  <div className="pos-parked-quick-dropdown-header">
                    <span>Ventas aparcadas ({parkedOrders.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowParkedDropdown(false)}
                      className="pos-parked-dropdown-close"
                      title="Cerrar"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="pos-parked-quick-dropdown-list">
                    {parkedOrders.map((order, idx) => {
                      const isActive = String(order.id) === String(activeOrderId);
                      const orderItems = order.items || order.order_items || [];
                      const summaryText = orderItems
                        .map((it) => `${it.quantity || 1}x ${it.name || it.product_name}`)
                        .join(', ');

                      return (
                        <div
                          key={order.id}
                          className={`pos-parked-quick-item ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            loadOrder(order);
                            setShowParkedDropdown(false);
                            window.dispatchEvent(
                              new CustomEvent('ohana_toast', {
                                detail: {
                                  message: `Pedido #${order.ticket_code} cargado (${idx + 1} de ${parkedOrders.length})`,
                                  type: 'info',
                                },
                              })
                            );
                          }}
                        >
                          <div className="pos-parked-quick-item-main">
                            <div className="pos-parked-quick-item-top">
                              <span className="pos-parked-quick-ticket">#{order.ticket_code}</span>
                              <span className="pos-parked-quick-table">
                                {order.modality === 'Mesa' ? (order.table_number || 'Mesa') : order.modality || 'Mesa'}
                              </span>
                              {isActive && <span className="pos-parked-quick-badge">Activo</span>}
                            </div>
                            <div className="pos-parked-quick-summary">
                              {summaryText || order.customer_name || 'Pedido'}
                            </div>
                          </div>
                          <div className="pos-parked-quick-item-right">
                            <span className="pos-parked-quick-price">{formatCurrency(order.total || 0)}</span>
                            <button
                              type="button"
                              className="btn-parked-delete-mini"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Eliminar venta #${order.ticket_code}?`)) {
                                  await cashService.deleteOrder(order.id);
                                  const fresh = cashService.getPendingOrders();
                                  setParkedOrders(fresh);
                                  if (String(order.id) === String(activeOrderId)) {
                                    if (fresh.length > 0) {
                                      loadOrder(fresh[0]);
                                    } else {
                                      clearCart(true);
                                    }
                                  }
                                }
                              }}
                              title="Eliminar este pedido"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {items.length > 0 && (
            <button
              type="button"
              className="btn-park-inline"
              onClick={handleParkCurrentOrder}
              title="Aparcar venta como pendiente para retomarla después"
            >
              <Clock size={11} />
              <span>Aparcar venta</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. LISTA DE PRODUCTOS DEL PEDIDO */}
      <div className="cart-items-container">
        {items.length === 0 ? (
          <div className="pos-empty-cart-state">
            <div className="pos-empty-circle">
              <ShoppingBag size={32} color="#94a3b8" />
              <div className="pos-empty-question-badge">?</div>
            </div>
            <h4 className="pos-empty-title">Sin Pedidos</h4>
            <p className="pos-empty-subtitle">
              Toca un producto del menú para agregarlo al pedido
            </p>
          </div>
        ) : (
          <div className="pos-cart-items-list">
            {items.map((item) => (
              <div key={item.id} className="pos-cart-item-card">
                {/* Miniatura cuadrada con bordes redondeados */}
                <div className="pos-cart-item-thumb">
                  {item.image && (item.image.startsWith('data:') || item.image.startsWith('http') || item.image.startsWith('/')) ? (
                    <img src={item.image} alt={item.name} className="pos-cart-item-img" />
                  ) : (
                    <div className="pos-cart-item-no-img">
                      <UtensilsCrossed size={18} color="#94a3b8" />
                    </div>
                  )}
                </div>

                {/* Información Central: Nombre, Notas y Fila de Precio con Stepper */}
                <div className="pos-cart-item-body">
                  <div className="pos-cart-item-name" title={item.name}>
                    {item.name}
                  </div>

                  {/* Notas o personalización */}
                  <button
                    type="button"
                    className="pos-cart-item-notes-btn"
                    onClick={() => handleOpenNoteModal(item)}
                    title="Editar nota o instrucción especial"
                  >
                    {item.notes ? (
                      <>
                        <span className="notes-text">{item.notes}</span>
                        <Edit2 size={12} className="notes-icon" />
                      </>
                    ) : (
                      <>
                        <FileText size={12} className="notes-icon" />
                        <span className="notes-text">Agregar Nota</span>
                      </>
                    )}
                  </button>

                  {/* Fila Inferior: Precio a la izquierda (cambia dinámicamente con la cantidad), Stepper y Botón Eliminar a la derecha */}
                  <div className="pos-cart-item-bottom-row">
                    <div className="pos-cart-item-price">
                      {formatCurrency(item.price * item.quantity)}
                      {item.quantity > 1 && (
                        <span className="pos-cart-item-unit-price">
                          ({formatCurrency(item.price)} c/u)
                        </span>
                      )}
                    </div>

                    <div className="pos-cart-item-actions-group">
                      <div className="pos-cart-item-stepper">
                        <button
                          type="button"
                          className="pos-stepper-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          title="Disminuir"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="pos-stepper-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="pos-stepper-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          title="Aumentar"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="pos-cart-item-delete-btn"
                        onClick={() => removeItem(item.id)}
                        title="Eliminar producto del pedido"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SELECTOR COMPACTO DE MÉTODOS DE PAGO RÁPIDO */}
      {items.length > 0 && (
        <div className="pos-cart-quick-payments">
          <div className="pos-quick-payment-header">
            <span className="pos-quick-payment-label">Método de pago</span>
          </div>
          <div className="pos-quick-payment-buttons">
            <button
              type="button"
              className={`pos-quick-pay-btn pay-efectivo ${paymentMethod === 'efectivo' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('efectivo')}
              title="Pago en Efectivo"
            >
              <Coins size={13} />
              <span>Efectivo</span>
            </button>
            <button
              type="button"
              className={`pos-quick-pay-btn pay-yape ${paymentMethod === 'yape' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('yape')}
              title="Pago con Yape / Plin"
            >
              <span className="pos-pay-dot yape-dot" />
              <span>Yape</span>
            </button>
            <button
              type="button"
              className={`pos-quick-pay-btn pay-tarjeta ${paymentMethod === 'tarjeta' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('tarjeta')}
              title="Pago con Tarjeta"
            >
              <CreditCard size={13} />
              <span>Tarjeta</span>
            </button>
            <button
              type="button"
              className={`pos-quick-pay-btn pay-mixto ${paymentMethod === 'mixto' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('mixto')}
              title="Pago Mixto (Dividir entre Efectivo, Yape y Tarjeta)"
            >
              <Shuffle size={13} />
              <span>Mixto</span>
            </button>
          </div>

          {/* Subpanel cuando se selecciona EFECTIVO: Minimalista y elegante */}
          {paymentMethod === 'efectivo' && (
            <div className="pos-cart-payment-subpanel minimal">
              <div className="pos-cash-mini-grid">
                {/* Input Paga con */}
                <div className="pos-mini-field">
                  <span className="pos-mini-label">PAGA CON</span>
                  <div className="pos-mini-input-box">
                    <span className="pos-mini-symbol">S/</span>
                    <input
                      type="number"
                      step="0.50"
                      placeholder={finalTotal.toFixed(2)}
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="pos-mini-input"
                    />
                  </div>
                </div>

                {/* Vuelto */}
                <div className="pos-mini-field">
                  <span className="pos-mini-label">
                    {cashAmount > 0 && cashAmount < finalTotal ? 'FALTA' : 'VUELTO'}
                  </span>
                  <div className={`pos-mini-vuelto-box ${cashAmount > 0 && cashAmount < finalTotal ? 'warning' : ''}`}>
                    <span className="pos-mini-vuelto-symbol">S/</span>
                    <span className="pos-mini-vuelto-num">
                      {cashAmount > 0 && cashAmount < finalTotal
                        ? (finalTotal - cashAmount).toFixed(2)
                        : Math.max(0, changeAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subpanel cuando se selecciona MIXTO: Minimalista */}
          {paymentMethod === 'mixto' && (
            <div className="pos-cart-payment-subpanel minimal">
              <div className="pos-mixed-mini-grid">
                {/* Efectivo */}
                <div className="pos-mini-field">
                  <span className="pos-mini-label">EFECTIVO</span>
                  <div className="pos-mini-input-box">
                    <span className="pos-mini-symbol">S/</span>
                    <input
                      type="number"
                      step="0.50"
                      placeholder="0.00"
                      value={mixedCash}
                      onChange={(e) => setMixedCash(e.target.value)}
                      className="pos-mini-input"
                    />
                  </div>
                </div>

                {/* Yape */}
                <div className="pos-mini-field">
                  <span className="pos-mini-label">YAPE</span>
                  <div className="pos-mini-input-box yape-box">
                    <span className="pos-mini-symbol">S/</span>
                    <input
                      type="number"
                      step="0.50"
                      placeholder="0.00"
                      value={mixedYape}
                      onChange={(e) => setMixedYape(e.target.value)}
                      className="pos-mini-input"
                    />
                  </div>
                </div>

                {/* Tarjeta */}
                <div className="pos-mini-field">
                  <span className="pos-mini-label">TARJETA</span>
                  <div className="pos-mini-input-box tarjeta-box">
                    <span className="pos-mini-symbol">S/</span>
                    <input
                      type="number"
                      step="0.50"
                      placeholder="0.00"
                      value={mixedCard}
                      onChange={(e) => setMixedCard(e.target.value)}
                      className="pos-mini-input"
                    />
                  </div>
                </div>
              </div>

              {/* Status de cobertura */}
              <div className="pos-mixed-mini-bar">
                <div className="pos-mixed-mini-status">
                  {mixedRemaining > 0.01 ? (
                    <span className="pos-mini-faltante">Resta: <strong>S/ {mixedRemaining.toFixed(2)}</strong></span>
                  ) : mixedSum > finalTotal + 0.01 ? (
                    <span className="pos-mini-sobra">Excede: <strong>S/ {(mixedSum - finalTotal).toFixed(2)}</strong></span>
                  ) : (
                    <span className="pos-mini-ok">✓ Cubierto</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. RESUMEN DE MONTO TOTAL */}
      {items.length > 0 && (
        <div className="pos-cart-total-bar">
          <span className="pos-cart-total-label">Monto Total</span>
          <span className="pos-cart-total-value">{formatCurrency(total)}</span>
        </div>
      )}

      {/* 4. BOTONES INFERIORES: CANCELAR & CONFIRMAR PEDIDO */}
      <div className="pos-cart-footer-bar">
        <button
          type="button"
          className="pos-cart-btn-cancel"
          disabled={items.length === 0}
          onClick={() => {
            if (items.length > 0) {
              if (window.confirm('¿Deseas cancelar y vaciar el pedido actual?')) {
                clearCart();
              }
            }
          }}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="pos-cart-btn-place-order"
          disabled={items.length === 0}
          onClick={handleConfirmCheckout}
          title="Cobrar y emitir comprobante directamente"
        >
          <span>Confirmar Pedido</span>
        </button>
      </div>


      {/* ============================================================== */}
      {/* MODAL 1: SELECTOR DE MODALIDAD (MESA, PARA LLEVAR, DELIVERY)    */}
      {/* ============================================================== */}
      {isModalityModalOpen && (
        <div className="pos-cart-modal-backdrop" onClick={() => setIsModalityModalOpen(false)}>
          <div className="pos-cart-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-cart-modal-header">
              <h3>Tipo de Pedido</h3>
              <button
                type="button"
                className="pos-cart-modal-close"
                onClick={() => setIsModalityModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* 3 Opciones principales de modalidad */}
            <div className="pos-modality-selector-grid">
              <button
                type="button"
                className={`pos-modality-option ${orderType === 'DINE_IN' ? 'active' : ''}`}
                onClick={() => setOrderType('DINE_IN')}
              >
                <span className="modality-option-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 21v-8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8"/>
                    <path d="M5 11V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/>
                    <path d="M3 21h18"/>
                  </svg>
                </span>
                <span className="modality-option-title">Para Mesa</span>
                <span className="modality-option-sub">Consumo en local</span>
              </button>

              <button
                type="button"
                className={`pos-modality-option ${orderType === 'TAKE_AWAY' || orderType === 'TAKEAWAY' ? 'active' : ''}`}
                onClick={() => {
                  setOrderType('TAKE_AWAY');
                  setIsModalityModalOpen(false);
                }}
              >
                <span className="modality-option-icon">
                  <ShoppingBag size={22} />
                </span>
                <span className="modality-option-title">Para Llevar</span>
                <span className="modality-option-sub">Para llevar / Retiro</span>
              </button>

              <button
                type="button"
                className={`pos-modality-option ${orderType === 'DELIVERY' ? 'active' : ''}`}
                onClick={() => {
                  setOrderType('DELIVERY');
                  setIsModalityModalOpen(false);
                }}
              >
                <span className="modality-option-icon">
                  <Bike size={22} />
                </span>
                <span className="modality-option-title">Delivery</span>
                <span className="modality-option-sub">Envío a domicilio</span>
              </button>
            </div>

            {/* Si es Para Mesa, mostramos la grilla de selección de mesas */}
            {orderType === 'DINE_IN' && (
              <div className="pos-tables-section">
                <div className="pos-tables-header-row">
                  <h4>Selecciona una Mesa:</h4>
                  <span className="current-table-tag">Actual: {tableNumber || 'Sin asignar'}</span>
                </div>
                
                <div className="pos-tables-grid">
                  {PRESET_TABLES.map((table) => (
                    <button
                      key={table}
                      type="button"
                      className={`pos-table-chip ${tableNumber === table ? 'active' : ''}`}
                      onClick={() => {
                        setTableNumber(table);
                        setIsModalityModalOpen(false);
                      }}
                    >
                      {table}
                      {tableNumber === table && <Check size={13} className="chip-check" />}
                    </button>
                  ))}
                </div>

                <div className="pos-custom-table-row">
                  <input
                    type="text"
                    placeholder="Otra mesa o barra (ej. Terraza 2)..."
                    value={customTable}
                    onChange={(e) => setCustomTable(e.target.value)}
                    className="pos-custom-table-input"
                  />
                  <button
                    type="button"
                    className="pos-custom-table-btn"
                    onClick={() => {
                      if (customTable.trim()) {
                        setTableNumber(customTable.trim());
                        setCustomTable('');
                        setIsModalityModalOpen(false);
                      }
                    }}
                  >
                    Asignar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: NOTA / INSTRUCCIÓN ESPECIAL PARA UN PRODUCTO         */}
      {/* ============================================================== */}
      {activeNoteItem && (
        <div className="pos-cart-modal-backdrop" onClick={() => setActiveNoteItem(null)}>
          <div className="pos-cart-modal-card note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-cart-modal-header">
              <h3>Nota para: {activeNoteItem.name}</h3>
              <button
                type="button"
                className="pos-cart-modal-close"
                onClick={() => setActiveNoteItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="note-modal-desc">
              Agrega instrucciones para cocina (ej. sin azúcar, caliente, sin cebolla, etc.):
            </p>

            {/* Chips de sugerencias rápidas */}
            <div className="note-quick-tags">
              {['Sin azúcar', 'Caliente', 'Frío con hielo', 'Poco picante', 'Sin cebolla', 'Término medio', 'Para compartir'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="note-tag-btn"
                  onClick={() => {
                    setNoteDraft((prev) => (prev ? `${prev}, ${tag}` : tag));
                  }}
                >
                  +{tag}
                </button>
              ))}
            </div>

            <textarea
              className="note-modal-textarea"
              rows={3}
              placeholder="Escribe las notas o especificaciones aquí..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              autoFocus
            />

            <div className="note-modal-actions">
              <button
                type="button"
                className="note-btn-clear"
                onClick={() => setNoteDraft('')}
              >
                Borrar nota
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="note-btn-cancel"
                  onClick={() => setActiveNoteItem(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="note-btn-save"
                  onClick={handleSaveNote}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CHECKOUT POPUP ELIMINADO (COBRO DIRECTO DESDE EL CARRITO) */}
      {false && isCheckoutModalOpen && (
        <div className="pos-cart-modal-backdrop" onClick={() => setIsCheckoutModalOpen(false)}>
          <div className="pos-cart-modal-card ref-checkout-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* BOTÓN CERRAR FLOTANTE */}
            <button
              type="button"
              className="ref-modal-close-btn"
              onClick={() => setIsCheckoutModalOpen(false)}
              title="Cerrar"
            >
              <X size={18} />
            </button>

            {/* CUERPO HORIZONTAL EN 2 COLUMNAS */}
            <div className="ref-checkout-columns">
              {/* COLUMNA IZQUIERDA: DOCUMENTO Y MÉTODOS DE PAGO */}
              <div className="ref-checkout-col-left">
                {/* 1. Tipo de Documento */}
                <div className="ref-section-block">
                  <div className="ref-section-header">
                    <div className="ref-section-title">
                      <FileText size={16} className="ref-section-icon" />
                      <span>Tipo de documento</span>
                    </div>
                    <span className="ref-section-number">01</span>
                  </div>

                  <div className="ref-doc-tabs">
                    {/* Nota de venta */}
                    <button
                      type="button"
                      className={`ref-doc-tab ${docType === 'nota' ? 'active' : ''}`}
                      onClick={() => setDocType('nota')}
                    >
                      <Receipt size={22} className="ref-doc-icon" />
                      <span>Nota de venta</span>
                    </button>

                    {/* Boleta */}
                    <button
                      type="button"
                      className={`ref-doc-tab ${docType === 'boleta' ? 'active' : ''}`}
                      onClick={() => setDocType('boleta')}
                    >
                      <FileText size={22} className="ref-doc-icon" />
                      <span>Boleta</span>
                    </button>

                    {/* Factura */}
                    <button
                      type="button"
                      className={`ref-doc-tab ${docType === 'factura' ? 'active' : ''}`}
                      onClick={() => setDocType('factura')}
                    >
                      <Building2 size={22} className="ref-doc-icon" />
                      <span>Factura</span>
                    </button>
                  </div>

                  {/* Campos dinámicos según el tipo de documento seleccionado */}
                  {docType === 'nota' && (
                    <div className="ref-doc-fields-row">
                      <div className="ref-input-pill" style={{ gridColumn: 'span 2' }}>
                        <User className="ref-input-icon" size={15} />
                        <input
                          type="text"
                          placeholder="Nombre del cliente (opcional)"
                          className="ref-input-clean"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {docType === 'boleta' && (
                    <div className="ref-doc-fields-row">
                      <div className="ref-input-pill">
                        <CreditCard className="ref-input-icon" size={15} />
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="DNI (8 dígitos)..."
                          className="ref-input-clean has-btn"
                          value={customerDni}
                          onChange={(e) => setCustomerDni(e.target.value)}
                        />
                        <button
                          type="button"
                          className="ref-input-search-btn"
                          onClick={handleSearchDni}
                          title="Consultar RENIEC"
                        >
                          <Search size={12} />
                        </button>
                      </div>
                      <div className="ref-input-pill">
                        <User className="ref-input-icon" size={15} />
                        <input
                          type="text"
                          placeholder="Nombre del cliente..."
                          className="ref-input-clean"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {docType === 'factura' && (
                    <div className="ref-doc-fields-col">
                      <div className="ref-input-pill">
                        <Building2 className="ref-input-icon" size={15} />
                        <input
                          type="text"
                          maxLength={11}
                          placeholder="RUC (11 dígitos)..."
                          className="ref-input-clean has-btn"
                          value={rucNumber}
                          onChange={(e) => setRucNumber(e.target.value)}
                        />
                        <button
                          type="button"
                          className="ref-input-search-btn"
                          onClick={handleSearchRuc}
                          title="Consultar SUNAT"
                        >
                          <Search size={12} />
                        </button>
                      </div>
                      <div className="ref-input-pill">
                        <Briefcase className="ref-input-icon" size={15} />
                        <input
                          type="text"
                          placeholder="Razón Social..."
                          className="ref-input-clean"
                          value={razonSocial}
                          onChange={(e) => setRazonSocial(e.target.value)}
                        />
                      </div>
                      <div className="ref-input-pill">
                        <MapPin className="ref-input-icon" size={15} />
                        <input
                          type="text"
                          placeholder="Dirección Fiscal (opcional)..."
                          className="ref-input-clean"
                          value={facturaAddress}
                          onChange={(e) => setFacturaAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Método de Pago */}
                <div className="ref-section-block">
                  <div className="ref-section-header">
                    <div className="ref-section-title">
                      <Wallet size={16} className="ref-section-icon" />
                      <span>Método de pago</span>
                    </div>
                    <span className="ref-section-number">02</span>
                  </div>

                  <div className="ref-payment-grid">
                    {/* Efectivo */}
                    <div
                      className={`ref-payment-card pay-cash ${paymentMethod === 'efectivo' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('efectivo')}
                    >
                      <div className="ref-pay-icon-box cash">
                        <PaymentIcon src="/assets/payments/cash.png" alt="Efectivo" className="ref-pay-img" />
                      </div>
                      <div className="ref-pay-text-group">
                        <span className="ref-pay-name">Efectivo</span>
                        <span className="ref-pay-desc">Pago al contado</span>
                      </div>
                    </div>

                    {/* Tarjeta */}
                    <div
                      className={`ref-payment-card pay-card ${paymentMethod === 'tarjeta' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('tarjeta')}
                    >
                      <div className="ref-pay-icon-box card">
                        <PaymentIcon src="/assets/payments/visa.png" alt="Tarjeta" className="ref-pay-img visa" />
                      </div>
                      <div className="ref-pay-text-group">
                        <span className="ref-pay-name">Tarjeta</span>
                        <span className="ref-pay-desc">Crédito o débito</span>
                      </div>
                    </div>

                    {/* Yape */}
                    <div
                      className={`ref-payment-card pay-yape ${paymentMethod === 'yape' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('yape')}
                    >
                      <div className="ref-pay-icon-box yape">
                        <PaymentIcon src="/assets/payments/yape.png" alt="Yape" className="ref-pay-img" />
                      </div>
                      <div className="ref-pay-text-group">
                        <span className="ref-pay-name">Yape</span>
                        <span className="ref-pay-desc">Pago con QR</span>
                      </div>
                    </div>

                    {/* Pago mixto */}
                    <div
                      className={`ref-payment-card pay-mixed ${paymentMethod === 'mixto' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('mixto')}
                    >
                      <div className="ref-pay-icon-box mixed">
                        <div className="pay-method-mixed-stack">
                          <PaymentIcon src="/assets/payments/cash.png" alt="" className="mixed-mini-img cash" />
                          <PaymentIcon src="/assets/payments/visa.png" alt="" className="mixed-mini-img visa" />
                          <PaymentIcon src="/assets/payments/yape.png" alt="" className="mixed-mini-img yape" />
                        </div>
                      </div>
                      <div className="ref-pay-text-group">
                        <span className="ref-pay-name">Pago mixto</span>
                        <span className="ref-pay-desc">Combina métodos</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalle si es Efectivo */}
                  {paymentMethod === 'efectivo' && (
                    <div className="ref-cash-box">
                      <div className="ref-cash-quick-buttons">
                        <button
                          type="button"
                          className="ref-cash-quick-btn"
                          onClick={() => setCashGiven(finalTotal.toFixed(2))}
                        >
                          Exacto
                        </button>
                        {[20, 50, 100, 200].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className="ref-cash-quick-btn"
                            onClick={() => setCashGiven(amt.toString())}
                          >
                            S/ {amt}
                          </button>
                        ))}
                      </div>
                      <div className="ref-cash-inputs-row">
                        <div>
                          <span className="ref-cash-label">Paga con (S/)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="ref-cash-input"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                          />
                        </div>
                        <div>
                          <span className="ref-cash-label">Vuelto a entregar</span>
                          <div className="ref-change-display">
                            S/ {changeAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detalle si es Mixto */}
                  {paymentMethod === 'mixto' && (
                    <div className="ref-mixed-box">
                      <div>
                        <span className="ref-cash-label">Efectivo</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="ref-cash-input"
                          value={mixedCash}
                          onChange={(e) => setMixedCash(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="ref-cash-label">Tarjeta</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="ref-cash-input"
                          value={mixedCard}
                          onChange={(e) => setMixedCard(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="ref-cash-label">Yape</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="ref-cash-input"
                          value={mixedYape}
                          onChange={(e) => setMixedYape(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA DERECHA: TU ORDEN / RESUMEN DEL PEDIDO */}
              <div className="ref-checkout-col-right">
                <div className="ref-order-summary-card">
                  <div className="ref-order-card-header">
                    <div>
                      <span className="ref-order-tag">TU ORDEN</span>
                      <h3 className="ref-order-heading">Resumen del pedido</h3>
                    </div>
                    <div className="ref-order-header-badges-col">
                      <span className="ref-table-pill">
                        {getOrderModalityDisplay()}
                        {customerName && customerName !== 'Cliente General' ? ` • ${customerName}` : ''}
                      </span>
                      <span className="ref-product-count-badge">
                        {items.length} {items.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                  </div>

                  {/* Lista de productos con miniatura y descuento individual */}
                  <div className="ref-order-items-list custom-scrollbar">
                    {items.map((item) => {
                      const disc = itemDiscounts[item.id];
                      const val = parseFloat(disc?.value) || 0;
                      const itemBaseTotal = (Number(item.price) || 0) * (item.quantity || 1);
                      const isEditingThis = editingDiscountItemId === item.id;
                      const itemDiscountVal = disc && val > 0
                        ? (disc.type === 'amount' ? Math.min(itemBaseTotal, val) : (itemBaseTotal * val) / 100)
                        : 0;
                      const itemFinalTotal = Math.max(0, itemBaseTotal - itemDiscountVal);

                      return (
                        <div key={item.id} className="ref-order-item-block">
                          <div className="ref-order-item-main">
                            {/* Miniatura con badge de cantidad integrado */}
                            <div className="ref-item-thumb-wrapper">
                              {item.image && (item.image.startsWith('data:') || item.image.startsWith('http') || item.image.startsWith('/')) ? (
                                <img src={item.image} alt={item.name} className="ref-item-img" />
                              ) : (
                                <div className="ref-item-no-img">
                                  <UtensilsCrossed size={16} color="#94a3b8" />
                                </div>
                              )}
                              <span className="ref-item-qty-badge">{item.quantity}</span>
                            </div>

                            {/* Info central: nombre y subtítulo/notas */}
                            <div className="ref-item-info">
                              <div className="ref-item-name" title={item.name}>{item.name}</div>
                              <div className="ref-item-sub">
                                {item.notes ? item.notes : (item.category ? item.category : 'Plato del día')}
                              </div>
                            </div>

                            {/* Columna derecha: Precio y botón para aplicar descuento */}
                            <div className="ref-item-price-col">
                              {itemDiscountVal > 0 ? (
                                <>
                                  <span className="ref-item-price-crossed">{formatCurrency(itemBaseTotal)}</span>
                                  <span className="ref-item-price discount">{formatCurrency(itemFinalTotal)}</span>
                                </>
                              ) : (
                                <span className="ref-item-price">{formatCurrency(itemBaseTotal)}</span>
                              )}

                              <button
                                type="button"
                                className={`ref-item-disc-trigger ${disc && val > 0 ? 'active' : ''}`}
                                onClick={() => setEditingDiscountItemId(isEditingThis ? null : item.id)}
                                title="Aplicar o modificar descuento a este producto"
                              >
                                {disc && val > 0
                                  ? `-${disc.type === 'amount' ? `S/${val}` : `${val}%`}`
                                  : '% desc'}
                              </button>
                            </div>
                          </div>

                          {/* Editor inline de descuento por producto (MANUAL Y RÁPIDO) */}
                          {isEditingThis && (
                            <div className="ref-item-disc-editor">
                              <div className="ref-disc-unit-toggle">
                                <button
                                  type="button"
                                  className={`ref-disc-unit-btn ${(!disc?.type || disc?.type === 'percent') ? 'active' : ''}`}
                                  onClick={() => {
                                    setItemDiscounts(prev => ({
                                      ...prev,
                                      [item.id]: { type: 'percent', value: disc?.value ?? '' }
                                    }));
                                  }}
                                >
                                  %
                                </button>
                                <button
                                  type="button"
                                  className={`ref-disc-unit-btn ${disc?.type === 'amount' ? 'active' : ''}`}
                                  onClick={() => {
                                    setItemDiscounts(prev => ({
                                      ...prev,
                                      [item.id]: { type: 'amount', value: disc?.value ?? '' }
                                    }));
                                  }}
                                >
                                  S/
                                </button>
                              </div>

                              <input
                                type="number"
                                min="0"
                                step={disc?.type === 'amount' ? '0.5' : '1'}
                                placeholder="0"
                                className="ref-disc-manual-input"
                                value={disc?.value ?? ''}
                                onChange={(e) => {
                                  const inputVal = e.target.value;
                                  setItemDiscounts(prev => ({
                                    ...prev,
                                    [item.id]: { type: disc?.type || 'percent', value: inputVal }
                                  }));
                                }}
                                autoFocus
                              />

                              <div className="ref-quick-disc-row">
                                {[5, 10, 15, 20].map((pct) => (
                                  <button
                                    key={pct}
                                    type="button"
                                    className={`ref-disc-pill-btn ${(!disc?.type || disc?.type === 'percent') && Number(disc?.value) === pct ? 'active' : ''}`}
                                    onClick={() => {
                                      setItemDiscounts(prev => ({
                                        ...prev,
                                        [item.id]: { type: 'percent', value: pct.toString() }
                                      }));
                                    }}
                                  >
                                    {pct}%
                                  </button>
                                ))}
                                {disc && (parseFloat(disc.value) > 0 || disc.value !== '') && (
                                  <button
                                    type="button"
                                    className="ref-disc-pill-btn remove"
                                    onClick={() => {
                                      setItemDiscounts(prev => {
                                        const copy = { ...prev };
                                        delete copy[item.id];
                                        return copy;
                                      });
                                      setEditingDiscountItemId(null);
                                    }}
                                  >
                                    Quitar
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Sección de Totales */}
                  <div className="ref-order-totals-section">
                    <div className="ref-total-row">
                      <span className="ref-total-label">Subtotal</span>
                      <span className="ref-total-val">{formatCurrency(subtotal)}</span>
                    </div>

                    <div className="ref-total-row discount-row">
                      <div className="ref-disc-label-group">
                        <span className="ref-total-label">Descuentos</span>
                        <button
                          type="button"
                          className={`ref-global-disc-toggle-btn ${parsedOrderDisc > 0 ? 'active' : ''}`}
                          onClick={() => setShowOrderDiscountInput(!showOrderDiscountInput)}
                          title="Descuento a todo el pedido"
                        >
                          <Tag size={12} />
                          <span>
                            {parsedOrderDisc > 0
                              ? `-${orderDiscountType === 'amount' ? `S/${parsedOrderDisc}` : `${parsedOrderDisc}%`} pedido`
                              : '+ Todo el pedido'}
                          </span>
                        </button>
                      </div>
                      <span className={`ref-total-val ${totalDiscount > 0 ? 'discount-green' : ''}`}>
                        {totalDiscount > 0 ? `-${formatCurrency(totalDiscount)}` : 'S/ 0.00'}
                      </span>
                    </div>

                    {/* Selector y Editor Manual de descuento a toda la orden */}
                    {showOrderDiscountInput && (
                      <div className="ref-global-disc-box">
                        <div className="ref-global-disc-top">
                          <span className="ref-disc-box-title">Descuento a todo el pedido:</span>
                          <div className="ref-disc-unit-toggle">
                            <button
                              type="button"
                              className={`ref-disc-unit-btn ${orderDiscountType === 'percent' ? 'active' : ''}`}
                              onClick={() => setOrderDiscountType('percent')}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              className={`ref-disc-unit-btn ${orderDiscountType === 'amount' ? 'active' : ''}`}
                              onClick={() => setOrderDiscountType('amount')}
                            >
                              S/
                            </button>
                          </div>
                        </div>

                        <div className="ref-global-disc-inputs">
                          <div className="ref-disc-input-wrapper">
                            <span className="ref-disc-prefix">{orderDiscountType === 'percent' ? '%' : 'S/'}</span>
                            <input
                              type="number"
                              min="0"
                              step={orderDiscountType === 'percent' ? '1' : '0.5'}
                              placeholder={orderDiscountType === 'percent' ? '0' : '0.00'}
                              value={orderDiscountVal}
                              onChange={(e) => setOrderDiscountVal(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="ref-quick-disc-row">
                            {[5, 10, 15, 20].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                className={`ref-disc-pill-btn ${orderDiscountType === 'percent' && Number(orderDiscountVal) === pct ? 'active' : ''}`}
                                onClick={() => {
                                  setOrderDiscountType('percent');
                                  setOrderDiscountVal(pct.toString());
                                }}
                              >
                                {pct}%
                              </button>
                            ))}
                            {parsedOrderDisc > 0 && (
                              <button
                                type="button"
                                className="ref-disc-pill-btn remove"
                                onClick={() => setOrderDiscountVal('')}
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total a pagar destacado */}
                    <div className="ref-total-final-row">
                      <div>
                        <div className="ref-final-title">Total a pagar</div>
                        <div className="ref-final-sub">Impuestos incluidos</div>
                      </div>
                      <div className="ref-final-amount">{formatCurrency(finalTotal)}</div>
                    </div>
                  </div>

                  {/* Botón Confirmar y cobrar con total integrado a la derecha */}
                  <button
                    type="button"
                    className="ref-submit-checkout-btn"
                    onClick={handleConfirmCheckout}
                  >
                    <div className="ref-submit-btn-left">
                      <Send size={17} />
                      <span>Confirmar y cobrar</span>
                    </div>
                    <span className="ref-submit-btn-price">{formatCurrency(finalTotal)}</span>
                  </button>

                  {/* Botón secundario: Aparcar como pendiente */}
                  <button
                    type="button"
                    className="ref-park-checkout-btn"
                    onClick={handleParkCurrentOrder}
                    title="Aparcar venta como pendiente y guardarla en el sistema"
                  >
                    <Clock size={16} />
                    <span>Aparcar como Pendiente</span>
                  </button>

                  <div className="ref-checkout-footer-note">
                    Revisa los datos antes de confirmar el cobro.
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

export default OrderCart;
