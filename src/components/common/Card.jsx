import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  onClick,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`custom-card ${hoverable ? 'card-hoverable' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {(title || action) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
};

export default Card;
