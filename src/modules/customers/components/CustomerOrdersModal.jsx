import React from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { ShoppingBag, Receipt, Calendar, CreditCard, Tag } from 'lucide-react';

export const CustomerOrdersModal = ({ isOpen, onClose, customer, orders = [] }) => {
  if (!customer) return null;

  const totalSpent = orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Consumos • ${customer.name}`}
      maxWidth="680px"
    >
      <div className="customer-orders-modal-body">
        {/* Resumen superior del cliente */}
        <div className="customer-summary-box">
          <div className="summary-item">
            <span className="summary-label">Documento:</span>
            <span className="summary-val">{customer.doc_type} {customer.doc_number || 'S/D'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Teléfono:</span>
            <span className="summary-val">{customer.phone || 'No registrado'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Pedidos:</span>
            <span className="summary-val highlight">{orders.length > 0 ? orders.length : customer.visits} compras</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Consumo Registrado:</span>
            <span className="summary-val highlight-green">
              {formatCurrency(totalSpent > 0 ? totalSpent : customer.total_spent)}
            </span>
          </div>
        </div>

        {customer.notes && (
          <div className="customer-notes-banner">
            <strong>Nota / Preferencias:</strong> {customer.notes}
          </div>
        )}

        <h4 className="orders-section-subtitle">
          <Receipt size={16} /> Comprobantes y Comandas Realizadas
        </h4>

        {orders.length === 0 ? (
          <div className="empty-customer-orders">
            <ShoppingBag size={38} className="empty-icon" />
            <p className="empty-text">No hay órdenes registradas directamente en el POS para este documento aún.</p>
            <span className="empty-subtext">Las ventas emitidas desde el Punto de Venta con su DNI/RUC aparecerán aquí automáticamente.</span>
          </div>
        ) : (
          <div className="customer-orders-list">
            {orders.map((o) => (
              <div key={o.id || o.ticket_code} className="customer-order-card">
                <div className="order-card-header">
                  <div className="order-card-code">
                    <Receipt size={14} />
                    <span className="code-text">{o.ticket_code || 'TICKET'}</span>
                    <span className={`badge-order-status ${(o.status || 'Completado').toLowerCase()}`}>
                      {o.status || 'Completado'}
                    </span>
                  </div>
                  <div className="order-card-amount">
                    {formatCurrency(o.total)}
                  </div>
                </div>

                <div className="order-card-meta">
                  <span>
                    <Calendar size={13} /> {formatDate(o.created_at || o.date)}
                  </span>
                  <span>
                    <CreditCard size={13} /> {o.payment_method || 'Efectivo'}
                  </span>
                  {o.modality && (
                    <span>
                      <Tag size={13} /> {o.modality} {o.table_number ? `(Mesa ${o.table_number})` : ''}
                    </span>
                  )}
                </div>

                {o.items_summary && (
                  <div className="order-card-items">
                    {o.items_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions-footer" style={{ marginTop: '20px' }}>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CustomerOrdersModal;
