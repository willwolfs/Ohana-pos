import React from 'react';
import { Clock, Play, Flame, CheckCircle2, Send, CheckCheck, RotateCcw, Trash2 } from 'lucide-react';

export const OrderCard = ({ order, onStatusChange, onDeleteOrder }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Iniciar', className: 'badge-kds-pending', icon: Play };
      case 'PREPARING':
        return { label: 'Preparando', className: 'badge-kds-preparing', icon: Flame };
      case 'READY':
        return { label: 'Finalizado', className: 'badge-kds-ready', icon: CheckCircle2 };
      case 'DELIVERED':
        return { label: 'Entregado', className: 'badge-kds-delivered', icon: CheckCheck };
      default:
        return { label: status, className: 'badge-kds-pending', icon: Clock };
    }
  };

  const badgeInfo = getStatusBadge(order.status);
  const BadgeIcon = badgeInfo.icon;

  const tableDisplay = (() => {
    if (order.modality === 'Delivery') return 'Delivery';
    if (order.modality === 'Llevar' || order.type === 'TAKEAWAY') return 'Para Llevar';
    const raw = order.table || (order.table_number ? `Mesa ${order.table_number}` : 'Mesa');
    return raw.replace(/^mesa\s+mesa\s+/i, 'Mesa ').trim();
  })();

  return (
    <div className={`kitchen-order-card status-${order.status.toLowerCase()}`}>
      <div className="kitchen-order-header">
        <div>
          <div className="kds-order-top-row">
            <span className="order-id">{String(order.id || '').startsWith('#') ? order.id : `#${order.id || ''}`}</span>
            <span className={`kds-status-tag ${badgeInfo.className}`}>
              <BadgeIcon size={11} /> {badgeInfo.label}
            </span>
          </div>
          <h4 className="order-table">
            {tableDisplay}
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="order-time">
            <Clock size={13} />
            <span>{order.elapsedMinutes !== undefined ? `${order.elapsedMinutes} min` : 'Reciente'}</span>
          </div>
          {onDeleteOrder && (
            <button
              type="button"
              className="kds-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteOrder(order.id || order.ticket_code);
              }}
              title="Eliminar comanda"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="kitchen-items-list">
        {(order.items || order.order_items || []).map((item, idx) => (
          <div key={idx} className="kitchen-item-row">
            <span className="kitchen-qty">{item.quantity}x</span>
            <div className="kitchen-item-meta">
              <span className="item-name">{item.name || item.product_name}</span>
              {item.notes && <span className="item-notes">Nota: {item.notes}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="kitchen-card-footer">
        {order.status === 'PENDING' && (
          <button
            type="button"
            className="kds-action-btn btn-kds-start"
            onClick={() => onStatusChange(order.id, 'PREPARING')}
          >
            <Flame size={14} /> Iniciar Preparación
          </button>
        )}

        {order.status === 'PREPARING' && (
          <button
            type="button"
            className="kds-action-btn btn-kds-ready"
            onClick={() => onStatusChange(order.id, 'READY')}
          >
            <CheckCircle2 size={14} /> Finalizar Pedido
          </button>
        )}

        {order.status === 'READY' && (
          <button
            type="button"
            className="kds-action-btn btn-kds-deliver"
            onClick={() => onStatusChange(order.id, 'DELIVERED')}
          >
            <Send size={14} /> Entregar Pedido
          </button>
        )}

        {order.status === 'DELIVERED' && (
          <div className="kds-delivered-row">
            <span className="kds-delivered-text">
              <CheckCheck size={14} /> Entregado
            </span>
            <button
              type="button"
              className="kds-revert-btn"
              onClick={() => onStatusChange(order.id, 'READY')}
              title="Revertir orden a Finalizado"
            >
              <RotateCcw size={12} /> Reabrir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;

