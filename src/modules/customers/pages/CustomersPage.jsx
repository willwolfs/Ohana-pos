import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DataTable from '../../../components/common/DataTable';
import Button from '../../../components/common/Button';
import CustomerModal from '../components/CustomerModal';
import CustomerOrdersModal from '../components/CustomerOrdersModal';
import { customerService } from '../../../services/customerService';
import { exportCustomersToExcel } from '../../../utils/excelExporter';
import { formatCurrency } from '../../../utils/formatCurrency';
import {
  Users,
  UserCheck,
  Building2,
  TrendingUp,
  Plus,
  Search,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  Phone,
  MessageCircle,
  FileText,
  Heart,
  Calendar,
  X,
  Sparkles,
  MoreVertical
} from 'lucide-react';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'frequent' | 'new' | 'company'
  const [openMenu, setOpenMenu] = useState(null); // { customer, top, bottom, right, isDropup }

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingOrdersCustomer, setViewingOrdersCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);

  // Dismiss actions menu on click, scroll, resize
  useEffect(() => {
    const handleDismissMenu = () => setOpenMenu(null);
    window.addEventListener('click', handleDismissMenu);
    window.addEventListener('scroll', handleDismissMenu, true);
    window.addEventListener('resize', handleDismissMenu);
    return () => {
      window.removeEventListener('click', handleDismissMenu);
      window.removeEventListener('scroll', handleDismissMenu, true);
      window.removeEventListener('resize', handleDismissMenu);
    };
  }, []);

  const handleOpenActionMenu = (e, customer) => {
    e.stopPropagation();
    if (openMenu?.customer?.id === customer.id) {
      setOpenMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isDropup = spaceBelow < 140;

    setOpenMenu({
      customer,
      top: isDropup ? undefined : rect.bottom + 4,
      bottom: isDropup ? window.innerHeight - rect.top + 4 : undefined,
      right: Math.max(12, window.innerWidth - rect.right),
      isDropup,
    });
  };

  // Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data || []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();

    const handleUpdate = () => loadCustomers();
    window.addEventListener('ohana_customers_updated', handleUpdate);
    window.addEventListener('ohana_orders_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('ohana_customers_updated', handleUpdate);
      window.removeEventListener('ohana_orders_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalCount = customers.length;
    const frequentCount = customers.filter(
      (c) => c.category === 'Frecuente' || Number(c.visits) >= 4
    ).length;
    const companyCount = customers.filter(
      (c) => c.category === 'Empresa' || c.doc_type === 'RUC' || (c.doc_number && c.doc_number.length === 11)
    ).length;
    const totalSpent = customers.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0);

    return {
      totalCount,
      frequentCount,
      companyCount,
      totalSpent,
    };
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return customers.filter((c) => {
      // 1. Category Filter
      if (activeFilter === 'frequent') {
        const isFreq = c.category === 'Frecuente' || Number(c.visits) >= 4;
        if (!isFreq) return false;
      } else if (activeFilter === 'new') {
        const isNew = c.category === 'Nuevo' || Number(c.visits) < 4;
        if (!isNew) return false;
      } else if (activeFilter === 'company') {
        const isComp = c.category === 'Empresa' || c.doc_type === 'RUC' || (c.doc_number && c.doc_number.length === 11);
        if (!isComp) return false;
      }

      // 2. Search Query
      if (q) {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const businessMatch = (c.business_name || '').toLowerCase().includes(q);
        const docMatch = (c.doc_number || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').toLowerCase().includes(q);
        const emailMatch = (c.email || '').toLowerCase().includes(q);
        const rollMatch = (c.favorite_roll || '').toLowerCase().includes(q);
        return nameMatch || businessMatch || docMatch || phoneMatch || emailMatch || rollMatch;
      }

      return true;
    });
  }, [customers, searchQuery, activeFilter]);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cust) => {
    setEditingCustomer(cust);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (custData) => {
    try {
      await customerService.saveCustomer(custData);
      setIsModalOpen(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (err) {
      alert('Error guardando cliente: ' + err.message);
    }
  };

  const handleDeleteCustomer = async (cust) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar a "${cust.name}" del directorio de clientes?\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await customerService.deleteCustomer(cust.id);
      loadCustomers();
    } catch (err) {
      alert('Error eliminando cliente: ' + err.message);
    }
  };

  const handleViewOrders = (cust) => {
    const orders = customerService.getCustomerOrders(cust);
    setCustomerOrders(orders);
    setViewingOrdersCustomer(cust);
  };

  const handleExportExcel = () => {
    exportCustomersToExcel({
      customers: filteredCustomers,
      title: 'Directorio de Clientes - Ohana Makis & Sushi Bar',
    });
  };

  // Helper for formal avatar initials
  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.slice(0, 2) || 'CL').toUpperCase();
  };

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      render: (_, row) => (
        <div className="customer-info-cell">
          <div className="customer-avatar-formal">
            {getInitials(row.name)}
          </div>
          <div className="customer-details">
            <div className="customer-name-row">
              <span className="customer-name-text">{row.name}</span>
              <span className={`badge-customer-cat ${(row.category || 'Nuevo').toLowerCase()}`}>
                <span className="status-dot"></span>
                {row.category || 'Nuevo'}
              </span>
            </div>
            {row.email && (
              <span className="customer-subtext">{row.email}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'business_name',
      header: 'Razón Social',
      render: (val, row) => {
        const bName = val || row.razon_social || '-';
        const hasCompany = bName !== '-' && bName.trim() !== '';
        return (
          <span className={`customer-business-name ${hasCompany ? 'is-company' : 'empty-company'}`}>
            {bName}
          </span>
        );
      },
    },
    {
      key: 'doc_number',
      header: 'Documento',
      render: (_, row) => {
        const isRuc = row.doc_type === 'RUC' || (row.doc_number && row.doc_number.length === 11);
        return (
          <div className="customer-doc-formal">
            <span className={`doc-tag ${isRuc ? 'ruc' : 'dni'}`}>
              {isRuc ? 'RUC' : (row.doc_type || 'DNI')}
            </span>
            <span className="doc-num">{row.doc_number || '-'}</span>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (val, row) => {
        const cleanPhone = (val || '').replace(/\D/g, '');
        const hasPhone = cleanPhone.length >= 7;

        return (
          <div className="customer-phone-cell">
            <span className="phone-number-text">{val || 'No registrado'}</span>
            {hasPhone && (
              <a
                href={`https://wa.me/51${cleanPhone}?text=Hola%20${encodeURIComponent(row.name)},%20te%20saludamos%20de%20Ohana%20Makis`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp-icon"
                title={`Enviar WhatsApp a ${row.name}`}
              >
                <MessageCircle size={14} />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'visits',
      header: 'Visitas',
      render: (val) => {
        const visits = Number(val) || 0;
        return (
          <span className="customer-visits-text">
            {visits} {visits === 1 ? 'pedido' : 'pedidos'}
          </span>
        );
      },
    },
    {
      key: 'total_spent',
      header: 'Consumo Total',
      render: (val) => (
        <span className="customer-total-spent">
          {formatCurrency(Number(val) || 0)}
        </span>
      ),
    },
    {
      key: 'favorite_roll',
      header: 'Preferencia',
      render: (val) => (
        <span className="customer-favorite-clean">
          {val || 'Acevichado Maki'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '42px',
      render: (_, row) => (
        <div className="customer-actions-cell">
          <button
            type="button"
            className="btn-customer-dots"
            onClick={(e) => handleOpenActionMenu(e, row)}
            title="Opciones del cliente"
          >
            <MoreVertical size={15} />
          </button>
        </div>
      ),
    },
  ];

  const renderEmptyState = () => {
    if (searchQuery) {
      return (
        <div className="customers-empty-state">
          <div className="customers-empty-icon">
            <Search size={26} />
          </div>
          <div className="customers-empty-title">
            No se encontraron clientes
          </div>
          <div className="customers-empty-desc">
            No se encontraron registros que coincidan con "{searchQuery}".
          </div>
          <Button variant="secondary" onClick={() => setSearchQuery('')}>
            Limpiar búsqueda
          </Button>
        </div>
      );
    }

    if (activeFilter !== 'all') {
      return (
        <div className="customers-empty-state">
          <div className="customers-empty-icon">
            <Users size={26} />
          </div>
          <div className="customers-empty-title">
            Sin clientes en esta sección
          </div>
          <div className="customers-empty-desc">
            Actualmente no hay clientes que correspondan a este filtro.
          </div>
          <Button variant="secondary" onClick={() => setActiveFilter('all')}>
            Ver todos los clientes
          </Button>
        </div>
      );
    }

    return (
      <div className="customers-empty-state">
        <div className="customers-empty-icon">
          <Users size={28} />
        </div>
        <div className="customers-empty-title">
          No hay clientes registrados aún
        </div>
        <div className="customers-empty-desc">
          Empieza a construir tu directorio de clientes frecuentes y empresas para registrar sus consumos, facturación y preferencias.
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
          Nuevo Cliente
        </Button>
      </div>
    );
  };

  return (
    <div className="module-page">
      {/* Cabecera Principal */}
      <div className="page-header customers-header">
        <div>
          <h1 className="page-title">Gestión de Clientes</h1>
          <p className="page-subtitle">
            Directorio de clientes frecuentes, facturación electrónica y preferencias gastronómicas
          </p>
        </div>
        <div className="header-actions-group">
          <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExportExcel}>
            Exportar Excel
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* 4 Cards de Métricas (KPIs) - Diseño Formal */}
      <div className="customers-kpi-grid">
        <div className="customer-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-label">Total Clientes</span>
            <Users size={16} className="kpi-icon-formal" />
          </div>
          <div className="kpi-value">{metrics.totalCount}</div>
          <div className="kpi-subtext">Directorio registrado</div>
        </div>

        <div className="customer-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-label">Clientes Frecuentes</span>
            <UserCheck size={16} className="kpi-icon-formal" />
          </div>
          <div className="kpi-value">{metrics.frequentCount}</div>
          <div className="kpi-subtext">4 o más visitas registradas</div>
        </div>

        <div className="customer-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-label">Empresas / Con RUC</span>
            <Building2 size={16} className="kpi-icon-formal" />
          </div>
          <div className="kpi-value">{metrics.companyCount}</div>
          <div className="kpi-subtext">Facturación corporativa</div>
        </div>

        <div className="customer-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-label">Consumo Acumulado</span>
            <TrendingUp size={16} className="kpi-icon-formal" />
          </div>
          <div className="kpi-value">{formatCurrency(metrics.totalSpent)}</div>
          <div className="kpi-subtext">Total histórico en ventas</div>
        </div>
      </div>

      {/* Barra de Filtros y Buscador */}
      <div className="customers-toolbar">
        <div className="search-box-custom">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por cliente, documento, teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-segmented-group">
          <button
            type="button"
            className={`segmented-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            Todos <span className="segmented-count">{customers.length}</span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${activeFilter === 'frequent' ? 'active' : ''}`}
            onClick={() => setActiveFilter('frequent')}
          >
            Frecuentes <span className="segmented-count">{metrics.frequentCount}</span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${activeFilter === 'new' ? 'active' : ''}`}
            onClick={() => setActiveFilter('new')}
          >
            Nuevos <span className="segmented-count">{Math.max(0, customers.length - metrics.frequentCount)}</span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${activeFilter === 'company' ? 'active' : ''}`}
            onClick={() => setActiveFilter('company')}
          >
            Empresas RUC <span className="segmented-count">{metrics.companyCount}</span>
          </button>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="customers-table-card">
        <DataTable
          columns={columns}
          data={filteredCustomers}
          emptyMessage={renderEmptyState()}
        />
      </div>

      {/* Modal Nuevo / Editar Cliente */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
      />

      {/* Modal Historial de Pedidos */}
      <CustomerOrdersModal
        isOpen={Boolean(viewingOrdersCustomer)}
        onClose={() => {
          setViewingOrdersCustomer(null);
          setCustomerOrders([]);
        }}
        customer={viewingOrdersCustomer}
        orders={customerOrders}
      />

      {/* Menú de Acciones Flotante (3 Puntos) */}
      {openMenu &&
        createPortal(
          <div
            className="actions-dropdown-portal compact-ui"
            style={{
              position: 'fixed',
              top: openMenu.top,
              bottom: openMenu.bottom,
              right: openMenu.right,
              zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="actions-dropdown-item item-view"
              onClick={() => {
                const cust = openMenu.customer;
                setOpenMenu(null);
                handleViewOrders(cust);
              }}
            >
              <Eye size={12} strokeWidth={1.8} />
              <span>Ver pedidos</span>
            </button>
            <button
              type="button"
              className="actions-dropdown-item item-edit"
              onClick={() => {
                const cust = openMenu.customer;
                setOpenMenu(null);
                handleOpenEditModal(cust);
              }}
            >
              <Edit2 size={12} strokeWidth={1.8} />
              <span>Editar</span>
            </button>
            <button
              type="button"
              className="actions-dropdown-item item-delete"
              onClick={() => {
                const cust = openMenu.customer;
                setOpenMenu(null);
                handleDeleteCustomer(cust);
              }}
            >
              <Trash2 size={12} strokeWidth={1.8} />
              <span>Eliminar</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomersPage;
