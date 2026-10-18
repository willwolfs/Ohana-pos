import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({
  message,
  type = 'info',
  onClose,
  duration = 3000,
}) => {
  const icons = {
    success: <CheckCircle2 size={18} className="toast-icon success" />,
    warning: <AlertTriangle size={18} className="toast-icon warning" />,
    error: <AlertCircle size={18} className="toast-icon error" />,
    info: <Info size={18} className="toast-icon info" />,
  };

  return (
    <div className={`toast-notification toast-${type}`}>
      {icons[type]}
      <span className="toast-message">{message}</span>
      {onClose && (
        <button onClick={onClose} className="toast-close-btn" aria-label="Cerrar notificación">
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default Toast;
