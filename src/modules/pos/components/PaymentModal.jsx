import React, { useState, useContext, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { PAYMENT_METHODS } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatCurrency';
import { usePOS } from '../../../hooks/usePOS';
import { ShiftContext } from '../../../context/ShiftContext';
import { AuthContext } from '../../../context/AuthContext';
import { cashService } from '../../../services/cashService';

export const PaymentModal = ({ isOpen, onClose, checkoutData = {}, onPaymentSuccess }) => {
  const { total, items, orderType, tableNumber, customerName, clearCart } = usePOS();
  const { currentShift } = useContext(ShiftContext);
  const { user } = useContext(AuthContext);

  const initialMethod = checkoutData?.paymentMethod
    ? checkoutData.paymentMethod === 'efectivo'
      ? 'CASH'
      : checkoutData.paymentMethod === 'tarjeta'
      ? 'CARD'
      : checkoutData.paymentMethod === 'yape'
      ? 'YAPE'
      : 'MIXED'
    : 'CASH';

  const [selectedMethod, setSelectedMethod] = useState(initialMethod);
  const [cashReceived, setCashReceived] = useState(
    checkoutData?.cashGiven ? String(checkoutData.cashGiven) : ''
  );
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (checkoutData?.paymentMethod) {
        const m = checkoutData.paymentMethod === 'efectivo'
          ? 'CASH'
          : checkoutData.paymentMethod === 'tarjeta'
          ? 'CARD'
          : checkoutData.paymentMethod === 'yape'
          ? 'YAPE'
          : 'MIXED';
        setSelectedMethod(m);
      }
      if (checkoutData?.cashGiven) {
        setCashReceived(String(checkoutData.cashGiven));
      } else {
        setCashReceived('');
      }
      setIsProcessing(false);
    }
  }, [isOpen, checkoutData]);

  // Si en el carrito se aplicó descuento, usamos finalTotal
  const effectiveTotal = checkoutData?.finalTotal !== undefined ? checkoutData.finalTotal : total;
  const received = parseFloat(cashReceived) || 0;
  const change = Math.max(0, received - effectiveTotal);

  const handleProcessPayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const methodLabel = selectedMethod === 'CASH' 
      ? 'Efectivo' 
      : selectedMethod === 'CARD' 
      ? 'Tarjeta'
      : selectedMethod === 'YAPE' 
      ? 'Yape' 
      : 'Mixto';

    const modalityLabel = orderType === 'DINE_IN' 
      ? 'Mesa' 
      : orderType === 'TAKE_AWAY' 
      ? 'Llevar' 
      : 'Delivery';

    const cashierName = user?.name || user?.user_metadata?.name || currentShift?.cashierName || 'Admin Ohana';

    // Generamos código correlativo realista
    const ticketCode = `B001-${Date.now().toString().slice(-4)}`;

    const orderPayload = {
      ticket_code: ticketCode,
      docType: checkoutData?.docType || 'boleta',
      customer_name: checkoutData?.customerName || customerName || 'Cliente General',
      doc_number: checkoutData?.doc_number || checkoutData?.customerDni || '',
      modality: modalityLabel,
      table_number: modalityLabel === 'Mesa' ? tableNumber : '',
      payment_method: methodLabel,
      cash_given: selectedMethod === 'CASH' ? received : 0,
      change: selectedMethod === 'CASH' ? change : 0,
      subtotal: total,
      discount: checkoutData?.discountVal || 0,
      total: effectiveTotal,
      shift_id: currentShift?.id || null,
      cashier_name: cashierName,
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        product_name: it.name,
        price: it.price,
        quantity: it.quantity,
        notes: it.notes || '',
      })),
      order_items: items.map((it) => ({
        product_name: it.name,
        quantity: it.quantity,
        unit_price: it.price,
        notes: it.notes || '',
      })),
      created_at: new Date().toISOString(),
    };

    try {
      const res = await cashService.recordOrder(orderPayload);
      const savedOrder = res?.order || orderPayload;

      // Limpiamos el carrito
      clearCart();

      // Notificamos para abrir la pestaña de impresión
      if (onPaymentSuccess) {
        onPaymentSuccess(savedOrder);
      }
      onClose();
    } catch (err) {
      console.error('Error registrando pago:', err);
      alert('Hubo un error al registrar el pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Procesar Cobro de Comanda"
      maxWidth="480px"
    >
      <div className="payment-form">
        <div className="payment-amount-display">
          <span className="label">Total a cobrar</span>
          <span className="amount">{formatCurrency(effectiveTotal)}</span>
        </div>

        <label className="input-label">Método de Pago:</label>
        <div className="payment-methods-grid">
          {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`payment-method-chip ${selectedMethod === key ? 'active' : ''}`}
              onClick={() => setSelectedMethod(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {selectedMethod === 'CASH' && (
          <div className="cash-calculator">
            <div className="input-group mt-4">
              <label className="input-label">Monto recibido (S/):</label>
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                autoFocus
              />
            </div>

            <div className="change-display">
              <span>Vuelto:</span>
              <strong className={change > 0 ? 'highlight-change' : ''}>
                {formatCurrency(change)}
              </strong>
            </div>
          </div>
        )}

        <div className="modal-actions-bar mt-6">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleProcessPayment}
            disabled={isProcessing || (selectedMethod === 'CASH' && received < effectiveTotal && received !== 0)}
          >
            {isProcessing ? 'Procesando...' : 'Completar e Imprimir'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;
