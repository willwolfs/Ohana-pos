import React, { useState, useRef, useEffect, useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShiftContext } from '../../context/ShiftContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Menu,
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Banknote,
  Boxes,
  ShoppingBag,
  TrendingDown,
  Users2,
  UserCog,
  Truck,
  BookOpenCheck,
  ChevronDown,
  Layers,
  Receipt,
  Package,
  Wifi,
  Building2,
} from 'lucide-react';

export const Sidebar = ({ isOpen, isCollapsed, onToggleSidebar, onCloseMobile }) => {
  const location = useLocation();
  const { currentShift } = useContext(ShiftContext) || {};
  const { appLogo } = useTheme();
  const isShiftOpen = Boolean(currentShift?.isOpen);

  // Grupos desplegables con memoria de estado (estilo Dolce Candys / YouTube)
  const [openGroups, setOpenGroups] = useState({
    inventario: location.pathname.startsWith('/inventory'),
    operaciones: ['/purchases', '/expenses'].some((p) =>
      location.pathname.startsWith(p)
    ),
  });

  // Estado para el menú flotante en modo colapsado
  const [hoveredItem, setHoveredItem] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = (e, item) => {
    if (!isCollapsed || !item?.isGroup) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem({
      ...item,
      top: rect.top,
      left: rect.right + 10,
    });
  };

  const handleMouseLeave = () => {
    if (!isCollapsed) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 180);
  };

  const handleFlyoutMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleFlyoutMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 180);
  };

  // Cerrar menú flotante al navegar o expandir el sidebar
  useEffect(() => {
    setHoveredItem(null);
  }, [location.pathname, isCollapsed]);

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const navItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      path: '/cash-register',
      label: 'Caja',
      icon: Banknote,
    },
    {
      path: '/pos',
      label: 'POS Venta',
      icon: UtensilsCrossed,
    },
    {
      path: '/sales',
      label: 'Historial de Ventas',
      icon: ShoppingBag,
    },
    {
      path: '/kitchen',
      label: 'Cocina (KDS)',
      icon: ChefHat,
    },
    {
      path: '/products',
      label: 'Productos',
      icon: Package,
    },
    {
      isGroup: true,
      id: 'inventario',
      label: 'Inventario',
      icon: Boxes,
      children: [
        { path: '/inventory/supplies', label: 'Insumos', icon: Boxes },
        { path: '/inventory/recipes', label: 'Recetas de Makis', icon: BookOpenCheck },
        { path: '/inventory/kardex', label: 'Kardex de Stock', icon: Receipt },
      ],
    },
    {
      isGroup: true,
      id: 'operaciones',
      label: 'Operaciones',
      icon: ShoppingBag,
      children: [
        { path: '/purchases', label: 'Compras Proveedores', icon: Truck },
        { path: '/expenses', label: 'Gastos Operativos', icon: TrendingDown },
      ],
    },
    {
      path: '/customers',
      label: 'Clientes',
      icon: Users2,
    },
    {
      path: '/users',
      label: 'Usuarios & Roles',
      icon: UserCog,
    },
    {
      path: '/company',
      label: 'Empresa',
      icon: Building2,
    },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay active" onClick={onCloseMobile} />}
      <aside
        className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}
        id="ohanaSidebar"
      >
        {/* Cabecera del Sidebar: Botón de 3 rayas funcional y Logo redondo centrado y más grande */}
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-hamburger-btn"
            onClick={onToggleSidebar}
            aria-label="Alternar menú de navegación"
            title="Alternar menú"
          >
            <Menu size={22} />
          </button>

          <div className="sidebar-logo-centered-box" title="Ohana Makis">
            <img
              src={appLogo}
              alt="Ohana Makis"
              className="sidebar-round-logo-large"
            />
          </div>
        </div>

        {/* Navegación estilo Dolce Candys / YouTube */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Grupo desplegable (Submenú con chevron animado)
            if (item.isGroup) {
              const isGroupOpen = !!openGroups[item.id] && !isCollapsed;
              const hasActiveChild = item.children.some(
                (child) => location.pathname === child.path
              );

              return (
                <div
                  key={item.id}
                  className={`nav-group-wrapper ${isGroupOpen ? 'open' : ''}`}
                  onMouseEnter={(e) => handleMouseEnter(e, item)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    className={`nav-btn nav-group-btn ${hasActiveChild ? 'has-active-child' : ''}`}
                    onClick={() => toggleGroup(item.id)}
                  >
                    <Icon size={19} className="nav-icon" />
                    {!isCollapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        <ChevronDown size={15} className="nav-group-chevron" />
                      </>
                    )}
                  </button>

                  {/* Submenú desplegable en modo expandido */}
                  {!isCollapsed && isGroupOpen && (
                    <div className="nav-sub-menu">
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={onCloseMobile}
                            className={({ isActive }) =>
                              `nav-sub-btn ${isActive ? 'active' : ''}`
                            }
                          >
                            <SubIcon size={16} className="sub-icon" />
                            <span>{sub.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Enlace de ruta directa
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                end={item.path === '/'}
              >
                <Icon size={19} className="nav-icon" />
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Pie de Sidebar: Indicador dinámico de estado de caja e indicador wifi */}
        <div className="sidebar-footer">
          <div className="system-status">
            <span className={`status-dot ${isShiftOpen ? 'pulse' : 'closed'}`} />
            {!isCollapsed && (
              <span className={`status-text ${isShiftOpen ? 'open' : 'closed'}`}>
                {isShiftOpen ? 'Caja Abierta' : 'Caja Cerrada'}
              </span>
            )}
            <Wifi size={15} className="status-wifi-icon" title="Conectado" />
          </div>
        </div>
      </aside>

      {/* Floating Flyout Menu on Hover solo para grupos (Inventario y Operaciones) */}
      {isCollapsed && hoveredItem && hoveredItem.isGroup && (
        <div
          className="sidebar-floating-flyout"
          style={{
            position: 'fixed',
            top: `${Math.max(10, Math.min(hoveredItem.top, window.innerHeight - 260))}px`,
            left: `${hoveredItem.left}px`,
            zIndex: 99999,
          }}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
        >
          <div className="flyout-header">
            <span className="flyout-title">{hoveredItem.label}</span>
          </div>
          <div className="flyout-items-list">
            {hoveredItem.children.map((sub) => {
              const SubIcon = sub.icon;
              const isActive = location.pathname === sub.path;
              return (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  className={`flyout-item-link ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setHoveredItem(null);
                    onCloseMobile?.();
                  }}
                >
                  <SubIcon size={16} className="flyout-icon" />
                  <span>{sub.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
