import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, User, LogOut, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Estado de notificaciones (por defecto 0 notificaciones)
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('ohana_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Cerrar menú de notificaciones al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  // Sincronizar notificaciones en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ohana_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showLogoutModal) setShowLogoutModal(false);
        if (isNotifOpen) setIsNotifOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutModal, isNotifOpen]);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const [avatarTick, setAvatarTick] = useState(0);

  // Escuchar eventos de actualización de foto para refrescar inmediatamente
  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatarTick((t) => t + 1);
    };
    window.addEventListener('ohana_avatar_updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);
    return () => {
      window.removeEventListener('ohana_avatar_updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, []);

  // Determinar foto con fallback a caché por id o email
  const getEffectiveAvatar = () => {
    if (user?.avatar_url) return user.avatar_url;
    try {
      const cache = JSON.parse(localStorage.getItem('ohana_user_avatars_cache') || '{}');
      if (user?.id && cache[user.id]) return cache[user.id];
      if (user?.email && cache[user.email]) return cache[user.email];
      if (user?.email && cache[user.email.toLowerCase()]) return cache[user.email.toLowerCase()];
      const saved = JSON.parse(localStorage.getItem('ohana_user') || '{}');
      if (saved?.avatar_url) return saved.avatar_url;
    } catch {
      // ignore
    }
    return null;
  };

  const effectiveAvatar = getEffectiveAvatar();

  return (
    <>
      <header className="app-navbar">
        <div className="navbar-left" />

        <div className="navbar-right">
          <div className="navbar-notif-wrapper" ref={notifRef}>
            <button
              className="navbar-action-btn"
              aria-label="Notificaciones"
              title="Notificaciones del sistema"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
            >
              <Bell size={18} color="#ffffff" />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {/* Menú Desplegable de Notificaciones */}
            {isNotifOpen && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <div className="notif-dropdown-title">
                    <Bell size={15} color="#0f172a" />
                    <span>Notificaciones</span>
                    <span className={`notif-count-chip ${unreadCount > 0 ? 'active' : ''}`}>
                      {unreadCount}
                    </span>
                  </div>

                  {notifications.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        title="Marcar todas como leídas"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Leídas
                      </button>
                      <button
                        type="button"
                        onClick={handleClearNotifications}
                        title="Limpiar todas"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </div>

                <div className="notif-dropdown-body">
                  {notifications.length === 0 ? (
                    <div className="notif-empty-state">
                      <div className="notif-empty-icon">
                        <BellOff size={22} />
                      </div>
                      <div className="notif-empty-title">Sin notificaciones</div>
                      <div className="notif-empty-text">
                        No tienes alertas pendientes por el momento. Los avisos de stock bajo, pedidos o cierres de caja aparecerán aquí.
                      </div>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`notif-item ${!notif.read ? 'unread' : ''}`}
                        onClick={() => {
                          setNotifications((prev) =>
                            prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                          );
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                            {notif.message}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                            {notif.time || 'Hace un momento'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="notif-dropdown-footer">
                  <span>Alertas del sistema activas</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>● En línea</span>
                </div>
              </div>
            )}
          </div>

          <div className="user-profile">
            <div className="user-avatar" style={{ overflow: 'hidden' }}>
              {effectiveAvatar ? (
                <img
                  src={effectiveAvatar}
                  alt={user?.name || 'Usuario'}
                  className="navbar-avatar-img"
                  key={effectiveAvatar}
                />
              ) : (
                <User size={18} color="#ffffff" />
              )}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'admin'}</span>
              <span className="user-role">{user?.role || 'ADMIN'}</span>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="navbar-logout-btn"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Modal de Confirmación de Cerrar Sesión */}
      {showLogoutModal && (
        <div
          className="logout-confirm-overlay"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="logout-confirm-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <div className="logout-icon-wrapper">
              <LogOut size={26} />
            </div>

            <h3 id="logout-title" className="logout-title">
              ¿Cerrar sesión?
            </h3>

            <p className="logout-desc">
              Hola <strong className="logout-user-highlight">{user?.name || 'Usuario'}</strong>, ¿estás seguro de que deseas salir del sistema?
            </p>

            <div className="logout-actions-row">
              <button
                type="button"
                className="logout-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="logout-btn-confirm"
                onClick={handleConfirmLogout}
              >
                <LogOut size={16} />
                <span>Sí, salir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
