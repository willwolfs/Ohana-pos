import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, 
  Flame, 
  CheckCircle2, 
  Send, 
  RotateCcw, 
  Filter, 
  ChefHat, 
  UtensilsCrossed, 
  Layers 
} from 'lucide-react';
import OrderCard from '../components/OrderCard';
import { cashService } from '../../../services/cashService';

const MOCK_ORDER_IDS = new Set(['ORD-101', 'ORD-102', 'ORD-103', 'ORD-104']);

const calcElapsedMinutes = (dateString) => {
  if (!dateString) return 0;
  const createdTime = new Date(dateString).getTime();
  if (isNaN(createdTime)) return 0;
  return Math.max(0, Math.floor((Date.now() - createdTime) / 60000));
};

const syncKitchenOrdersFromStorage = () => {
  try {
    // 0. Comandas eliminadas manualmente por el usuario
    const deletedRaw = localStorage.getItem('ohana_deleted_kitchen_orders');
    const deletedSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);

    // 1. Obtener estados de cocina previamente guardados (para preservar si el chef los pasó a PREPARING, READY, DELIVERED)
    const savedRaw = localStorage.getItem('ohana_kitchen_orders');
    const savedList = savedRaw ? JSON.parse(savedRaw) : [];
    const statusMap = new Map();
    const existingKitchenMap = new Map();

    if (Array.isArray(savedList)) {
      savedList.forEach((item) => {
        const idStr = String(item.id || '');
        const ticketStr = String(item.ticket_code || '');
        const orderIdStr = String(item.order_id || '');
        if (deletedSet.has(idStr) || deletedSet.has(ticketStr) || deletedSet.has(orderIdStr)) return;

        if (!MOCK_ORDER_IDS.has(item.id)) {
          if (item.ticket_code) statusMap.set(String(item.ticket_code), item.status);
          if (item.order_id) statusMap.set(String(item.order_id), item.status);
          if (item.id) statusMap.set(String(item.id), item.status);
          existingKitchenMap.set(String(item.ticket_code || item.id), item);
        }
      });
    }

    // 2. Obtener todas las órdenes registradas en el POS (locales y aparcadas)
    const posOrders = cashService.getLocalOrders();
    const mergedList = [];
    const processedKeys = new Set();

    // Procesar órdenes del POS
    posOrders.forEach((o) => {
      // Ignorar órdenes canceladas o anuladas
      if (String(o.status || '').toLowerCase() === 'anulado') return;

      const ticketKey = o.ticket_code || o.id;
      if (!ticketKey) return;
      const keyStr = String(ticketKey);
      const oIdStr = o.id ? String(o.id) : '';

      if (deletedSet.has(keyStr) || (oIdStr && deletedSet.has(oIdStr))) return;
      if (processedKeys.has(keyStr)) return;
      processedKeys.add(keyStr);
      if (o.id) processedKeys.add(oIdStr);

      const rawItems = o.order_items || o.items || [];
      const items = rawItems.map((it) => ({
        name: it.product_name || it.name,
        quantity: it.quantity || 1,
        notes: it.notes || '',
      }));

      // Si no tiene ítems, omitir
      if (items.length === 0) return;

      const existingStatus = statusMap.get(String(ticketKey)) || statusMap.get(String(o.id)) || 'PENDING';

      mergedList.push({
        id: ticketKey,
        order_id: o.id,
        ticket_code: o.ticket_code || ticketKey,
        type: o.modality === 'Mesa' ? 'DINE_IN' : 'TAKEAWAY',
        table: o.modality === 'Mesa'
          ? (o.table_number ? `Mesa ${o.table_number}` : 'Mesa')
          : (o.modality === 'Delivery' ? 'Delivery' : 'Para Llevar'),
        modality: o.modality,
        elapsedMinutes: calcElapsedMinutes(o.created_at),
        status: existingStatus,
        created_at: o.created_at || new Date().toISOString(),
        items,
      });
    });

    // 3. Incluir cualquier comanda que estuviera directamente en existingKitchenMap y no estuviera en posOrders
    existingKitchenMap.forEach((kOrder, key) => {
      const kKeyStr = String(key);
      const kIdStr = String(kOrder.id || '');
      const kTicketStr = String(kOrder.ticket_code || '');

      if (deletedSet.has(kKeyStr) || deletedSet.has(kIdStr) || deletedSet.has(kTicketStr)) return;

      if (!processedKeys.has(kKeyStr) && !MOCK_ORDER_IDS.has(kOrder.id)) {
        mergedList.push({
          ...kOrder,
          elapsedMinutes: calcElapsedMinutes(kOrder.created_at),
        });
        processedKeys.add(kKeyStr);
      }
    });

    // Ordenar de más reciente a más antiguo
    mergedList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    localStorage.setItem('ohana_kitchen_orders', JSON.stringify(mergedList));
    return mergedList;
  } catch (err) {
    console.error('Error sincronizando órdenes de cocina:', err);
    return [];
  }
};

export const KitchenPage = () => {
  // Cargar órdenes persistidas sincronizadas con el historial del POS
  const [orders, setOrders] = useState(() => syncKitchenOrdersFromStorage());

  // Filtro activo por estado: 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED'
  const [statusFilter, setStatusFilter] = useState('ALL');

  const refreshOrders = useCallback(() => {
    setOrders(syncKitchenOrdersFromStorage());
  }, []);

  // Escuchar órdenes nuevas emitidas desde el Punto de Venta o cambios en almacén local
  useEffect(() => {
    refreshOrders();

    // 1. Escuchar evento directo de nueva orden / cobranza en POS
    const handleNewOrder = () => {
      refreshOrders();
    };

    window.addEventListener('ohana_orders_updated', handleNewOrder);
    window.addEventListener('storage', handleNewOrder);
    window.addEventListener('focus', handleNewOrder);

    // 2. Ticker cada 30 segundos para actualizar los minutos transcurridos en tiempo real
    const interval = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          elapsedMinutes: calcElapsedMinutes(o.created_at),
        }))
      );
    }, 30000);

    // 3. Consultar Supabase en segundo plano si hay nuevas ventas
    cashService.getOrders().then((freshOrders) => {
      if (freshOrders && freshOrders.length > 0) {
        refreshOrders();
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('ohana_orders_updated', handleNewOrder);
      window.removeEventListener('storage', handleNewOrder);
      window.removeEventListener('focus', handleNewOrder);
      clearInterval(interval);
    };
  }, [refreshOrders]);

  // Métricas para las 4 cards
  const metrics = useMemo(() => {
    return {
      iniciar: orders.filter((o) => o.status === 'PENDING').length,
      preparando: orders.filter((o) => o.status === 'PREPARING').length,
      finalizado: orders.filter((o) => o.status === 'READY').length,
      entregado: orders.filter((o) => o.status === 'DELIVERED').length,
    };
  }, [orders]);

  // Actualizar estado de una comanda y persistir de inmediato
  const handleStatusChange = (orderId, newStatus) => {
    setOrders((prev) => {
      const updated = prev.map((o) =>
        (String(o.id) === String(orderId) || String(o.ticket_code) === String(orderId) || String(o.order_id) === String(orderId))
          ? { ...o, status: newStatus }
          : o
      );
      try {
        localStorage.setItem('ohana_kitchen_orders', JSON.stringify(updated));
      } catch (e) {
        console.warn('Error guardando estado de cocina:', e);
      }
      return updated;
    });
  };

  // Eliminar comanda definitivamente de cocina
  const handleDeleteOrder = (orderId) => {
    if (window.confirm('¿Estás seguro de eliminar esta comanda de la pantalla de cocina?')) {
      try {
        const deletedRaw = localStorage.getItem('ohana_deleted_kitchen_orders');
        const deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
        const strId = String(orderId);
        if (!deletedList.includes(strId)) {
          deletedList.push(strId);
          localStorage.setItem('ohana_deleted_kitchen_orders', JSON.stringify(deletedList));
        }
      } catch (e) {
        console.warn('Error guardando comanda eliminada:', e);
      }

      setOrders((prev) => {
        const updated = prev.filter(
          (o) => String(o.id) !== String(orderId) && String(o.ticket_code) !== String(orderId) && String(o.order_id) !== String(orderId)
        );
        try {
          localStorage.setItem('ohana_kitchen_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  // Filtrado de comandas
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  return (
    <div className="kitchen-page">
      {/* Cabecera Principal */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Sistema de Pantalla de Cocina (KDS)</h1>
          <p className="page-subtitle">
            Control de comandas, tiempos de elaboración y despacho en barra de sushi
          </p>
        </div>
        <div className="kitchen-stats-pill">
          <span>{orders.filter((o) => o.status !== 'DELIVERED').length} comandas en curso</span>
        </div>
      </div>

      {/* 4 Cards de Cocina: Iniciar, Preparando, Finalizado, Entregado */}
      <div className="cash-stats-row kitchen-kpi-row" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Iniciar */}
        <div
          className={`cash-stat-card kitchen-stat-card ${statusFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          title="Ver órdenes por iniciar"
        >
          <div className="cash-stat-info">
            <span className="cash-stat-label">Iniciar</span>
            <span className="cash-stat-val text-amber-600">
              {metrics.iniciar}
            </span>
            <span className="cash-stat-sub">
              {metrics.iniciar === 1 ? '1 comanda por preparar' : `${metrics.iniciar} comandas por preparar`}
            </span>
          </div>
          <div className="cash-stat-icon-badge amber-light">
            <Play size={18} className="text-amber-600 fill-amber-600" />
          </div>
        </div>

        {/* Card 2: Preparando */}
        <div
          className={`cash-stat-card kitchen-stat-card ${statusFilter === 'PREPARING' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'PREPARING' ? 'ALL' : 'PREPARING')}
          title="Ver órdenes en preparación"
        >
          <div className="cash-stat-info">
            <span className="cash-stat-label">Preparando</span>
            <span className="cash-stat-val text-orange-600">
              {metrics.preparando}
            </span>
            <span className="cash-stat-sub">
              {metrics.preparando === 1 ? '1 orden en barra' : `${metrics.preparando} órdenes en barra`}
            </span>
          </div>
          <div className="cash-stat-icon-badge orange-light">
            <Flame size={19} className="text-orange-600" />
          </div>
        </div>

        {/* Card 3: Finalizado */}
        <div
          className={`cash-stat-card kitchen-stat-card ${statusFilter === 'READY' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'READY' ? 'ALL' : 'READY')}
          title="Ver órdenes finalizadas"
        >
          <div className="cash-stat-info">
            <span className="cash-stat-label">Finalizado</span>
            <span className="cash-stat-val text-emerald-600">
              {metrics.finalizado}
            </span>
            <span className="cash-stat-sub">
              {metrics.finalizado === 1 ? '1 pedido listo para servir' : `${metrics.finalizado} pedidos listos para servir`}
            </span>
          </div>
          <div className="cash-stat-icon-badge green-light">
            <CheckCircle2 size={19} className="text-emerald-600" />
          </div>
        </div>

        {/* Card 4: Entregado */}
        <div
          className={`cash-stat-card kitchen-stat-card ${statusFilter === 'DELIVERED' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'DELIVERED' ? 'ALL' : 'DELIVERED')}
          title="Ver órdenes entregadas"
        >
          <div className="cash-stat-info">
            <span className="cash-stat-label">Entregado</span>
            <span className="cash-stat-val text-purple-600">
              {metrics.entregado}
            </span>
            <span className="cash-stat-sub">
              {metrics.entregado === 1 ? '1 pedido entregado a mesa' : `${metrics.entregado} pedidos entregados a mesa`}
            </span>
          </div>
          <div className="cash-stat-icon-badge purple-light">
            <Send size={18} className="text-purple-600" />
          </div>
        </div>
      </div>

      {/* Barra de Filtro Activo */}
      <div className="kitchen-filter-toolbar">
        <div className="kitchen-filter-status-info">
          <Layers size={15} color="#64748b" />
          <span>
            {statusFilter === 'ALL'
              ? `Todas las comandas (${orders.length})`
              : statusFilter === 'PENDING'
              ? `Filtrado por: Por Iniciar (${metrics.iniciar})`
              : statusFilter === 'PREPARING'
              ? `Filtrado por: En Preparación (${metrics.preparando})`
              : statusFilter === 'READY'
              ? `Filtrado por: Finalizados (${metrics.finalizado})`
              : `Filtrado por: Entregados (${metrics.entregado})`}
          </span>
        </div>

        {statusFilter !== 'ALL' && (
          <button
            type="button"
            className="btn-kds-reset-filter"
            onClick={() => setStatusFilter('ALL')}
          >
            Mostrar todas ({orders.length})
          </button>
        )}
      </div>

      {/* Grid de Comandas */}
      {filteredOrders.length === 0 ? (
        <div className="kitchen-empty-state">
          <UtensilsCrossed size={42} color="#94a3b8" />
          <h3>
            {orders.length === 0
              ? 'Sin comandas activas en cocina'
              : 'No hay comandas en este estado'}
          </h3>
          <p>
            {orders.length === 0
              ? 'Los pedidos registrados desde el Punto de Venta (POS) aparecerán aquí automáticamente en tiempo real.'
              : 'No se encontraron pedidos con el estado seleccionado en este momento.'}
          </p>
          {orders.length > 0 && statusFilter !== 'ALL' && (
            <button
              type="button"
              className="btn-kds-show-all"
              onClick={() => setStatusFilter('ALL')}
            >
              Ver todas las comandas ({orders.length})
            </button>
          )}
        </div>
      ) : (
        <div className="kitchen-boards-grid">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onDeleteOrder={handleDeleteOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenPage;

