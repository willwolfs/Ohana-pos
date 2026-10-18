import React, { useState } from 'react';
import { ShoppingBag, Clock, CheckCircle2, Bike, UtensilsCrossed, Receipt, Eye } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import Modal from '../../../components/common/Modal';

export const RecentOrdersSection = ({ orders }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const getModalityBadge = (modality) => {
    switch (modality?.toLowerCase()) {
      case 'mesa':
        return (
          <span className="modality-tag tag-mesa">
            <UtensilsCrossed size={12} /> Mesa
          </span>
        );
      case 'llevar':
        return (
          <span className="modality-tag tag-llevar">
            <ShoppingBag size={12} /> Para Llevar
          </span>
        );
      case 'delivery':
        return (
          <span className="modality-tag tag-delivery">
            <Bike size={12} /> Delivery
          </span>
        );
      default:
        return <span className="modality-tag">{modality}</span>;
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span className="order-status-badge status-done">
        <CheckCircle2 size={12} /> {status}
      </span>
    );
  };

  return (
    <div className="recent-orders-card">
      <div className="recent-orders-header">
        <div>
          <div className="header-badge-row">
            <h2 className="recent-orders-title">Órdenes Recientes Vendidas</h2>
          </div>
          <p className="recent-orders-subtitle">
            Rolls, combos y bebidas despachados recientemente en el punto de venta
          </p>
        </div>

        <div className="recent-orders-meta">
          <span className="orders-count-pill">{orders.length} órdenes registradas</span>
        </div>
      </div>

      <div className="recent-orders-table-wrapper">
        <table className="recent-orders-table">
          <thead>
            <tr>
              <th>Orden / Ticket</th>
              <th>Rolls y Productos Vendidos</th>
              <th>Cliente / Ubicación</th>
              <th>Modalidad</th>
              <th>Método de Pago</th>
              <th className="text-right">Total</th>
              <th className="text-center">Estado</th>
              <th className="text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <ShoppingBag size={28} style={{ color: '#cbd5e1' }} />
                    <strong style={{ color: '#334155', fontSize: '0.88rem' }}>No hay órdenes registradas aún</strong>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                      El sistema está limpio. Las ventas y pedidos despachados aparecerán aquí en tiempo real.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="order-table-row">
                <td className="order-id-cell">
                  <div className="order-id-wrap">
                    <strong className="order-code">{order.id}</strong>
                    <span className="order-ticket-sub">{order.ticket}</span>
                    <span className="order-time-sub">
                      <Clock size={11} /> {order.time}
                    </span>
                  </div>
                </td>

                <td className="order-items-cell">
                  <div className="order-rolls-list">
                    {order.items.map((it, idx) => (
                      <span key={idx} className="item-chip">
                        <strong className="item-qty">{it.quantity}x</strong>
                        <span className="item-name">{it.name}</span>
                        {it.portions && <span className="item-portion">({it.portions})</span>}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="order-customer-cell">
                  <div className="customer-info">
                    <span className="customer-name">{order.customer}</span>
                    <span className="table-target">{order.tableOrChannel}</span>
                  </div>
                </td>

                <td>{getModalityBadge(order.modality)}</td>

                <td>
                  <span className="payment-pill-tag">{order.paymentMethod}</span>
                </td>

                <td className="text-right">
                  <strong className="order-total-amount">
                    {formatCurrency(order.total)}
                  </strong>
                </td>

                <td className="text-center">{getStatusBadge(order.status)}</td>

                <td className="text-center">
                  <button
                    type="button"
                    className="view-ticket-btn"
                    onClick={() => setSelectedOrder(order)}
                    title="Ver comanda completa"
                  >
                    <Eye size={15} />
                    <span>Ticket</span>
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle de Ticket / Comanda */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Detalle de Comanda: ${selectedOrder.id}`}
        >
          <div className="ticket-detail-modal">
            <div className="ticket-header-summary">
              <div>
                <span className="ticket-sub-label">Comprobante / Ticket</span>
                <h3>{selectedOrder.ticket}</h3>
              </div>
              <div className="ticket-right-status">
                {getStatusBadge(selectedOrder.status)}
                <span className="ticket-time">{selectedOrder.time}</span>
              </div>
            </div>

            <div className="ticket-metadata-grid">
              <div className="meta-box">
                <span className="meta-title">Cliente</span>
                <strong>{selectedOrder.customer}</strong>
              </div>
              <div className="meta-box">
                <span className="meta-title">Ubicación</span>
                <strong>{selectedOrder.tableOrChannel}</strong>
              </div>
              <div className="meta-box">
                <span className="meta-title">Modalidad</span>
                <div>{getModalityBadge(selectedOrder.modality)}</div>
              </div>
              <div className="meta-box">
                <span className="meta-title">Método de Pago</span>
                <strong>{selectedOrder.paymentMethod}</strong>
              </div>
            </div>

            <div className="ticket-items-divider">
              <h4>Ítems y Rolls Facturados</h4>
            </div>

            <div className="ticket-breakdown-list">
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="ticket-item-row">
                  <div className="ticket-item-left">
                    <span className="ticket-item-qty">{item.quantity}x</span>
                    <div>
                      <strong className="ticket-item-name">{item.name}</strong>
                      {item.portions && (
                        <span className="ticket-item-portion"> • {item.portions}</span>
                      )}
                    </div>
                  </div>
                  <div className="ticket-item-price">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="ticket-total-divider" />

            <div className="ticket-total-row">
              <span>Total Comanda</span>
              <strong>{formatCurrency(selectedOrder.total)}</strong>
            </div>

            <div className="ticket-modal-actions">
              <button
                type="button"
                className="btn-print-ticket"
                onClick={() => {
                  alert(`Imprimiendo comprobante ${selectedOrder.ticket} en ticketera térmica...`);
                }}
              >
                <Receipt size={16} /> Imprimir Comanda
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RecentOrdersSection;
