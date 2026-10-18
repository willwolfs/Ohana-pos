import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Search, X, Plus, AlertCircle, Lock, Coins, Banknote, ArrowRight, Receipt, ShoppingCart } from 'lucide-react';
import OrderCart from '../components/OrderCart';
import { printBothTicketsDirectly } from '../components/PrintTicketModal';
import CategoryFilter from '../components/CategoryFilter';
import ProductGrid from '../components/ProductGrid';
import { usePOS } from '../../../hooks/usePOS';
import { ShiftContext } from '../../../context/ShiftContext';
import { AuthContext } from '../../../context/AuthContext';
import { syncAndGetNextBoletaNumber, sanitizeOrderTicketCode, sanitizeOrderItemsForStorage } from '../../../utils/storageUtils';
import { getNextTurnNumber } from '../../../utils/turnHelper';
import { cashService } from '../../../services/cashService';
import { DEFAULT_CATEGORIES } from '../../products/pages/ProductsPage';

export const POSPage = () => {
  const navigate = useNavigate();
  const { addItem, items, orderType, tableNumber, customerName, clearCart, total, showToast, activeOrderId, activeOrderTicketCode } = usePOS();
  const { currentShift } = useContext(ShiftContext);
  const { user } = useContext(AuthContext);



  // Categorías de localStorage
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('ohana_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CATEGORIES;
  });

  // Productos de localStorage
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('ohana_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const mockIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
          return parsed.filter((p) => !mockIds.includes(p.id));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronización en tiempo real si se agregan productos o categorías
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedCats = localStorage.getItem('ohana_categories');
        if (savedCats) {
          const parsedCats = JSON.parse(savedCats);
          if (Array.isArray(parsedCats) && parsedCats.length > 0) {
            setCategories(parsedCats);
          }
        }
        const savedProds = localStorage.getItem('ohana_products');
        if (savedProds) {
          const parsedProds = JSON.parse(savedProds);
          if (Array.isArray(parsedProds)) {
            const mockIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
            setProducts(parsedProds.filter((p) => !mockIds.includes(p.id)));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Mapear cantidades en el carrito para mostrar badges
  const cartItemCounts = useMemo(() => {
    const counts = {};
    (items || []).forEach((item) => {
      counts[item.id] = (counts[item.id] || 0) + item.quantity;
    });
    return counts;
  }, [items]);

  // Contadores por categoría
  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    products.forEach((p) => {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Productos filtrados
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        selectedCategory === 'all' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // BLOQUEO TOTAL SI LA CAJA ESTÁ CERRADA (DISEÑO IDÉNTICO A CONTROL DE CAJA CON ICONO POS)
  if (!currentShift?.isOpen) {
    return (
      <div className="pos-closed-shift-viewport">
        {/* Título h1 de la vista */}
        <div className="pos-page-header-row pos-closed-header">
          <h1 className="pos-main-title">POS Venta</h1>
        </div>

        <div className="cash-closed-wrapper pos-closed-centered-wrapper">
          <div className="cash-closed-card pos-closed-card-styled">
            <div className="cash-closed-main-content">
              <div className="lock-icon-outer-ring">
                <div className="lock-icon-badge">
                  <ShoppingCart size={24} className="lock-svg" />
                </div>
              </div>

              <h2 className="cash-closed-title">POS Venta Cerrada</h2>
              <p className="cash-closed-desc">
                Cerrado hasta que aperturen la caja con el monto inicial para comenzar a registrar pedidos y ventas.
              </p>

              <button 
                type="button"
                className="btn-cash-red"
                onClick={() => navigate('/cash-register')}
              >
                <Coins size={16} />
                <span>Ir a Control de Caja</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-layout">
      {/* Columna Izquierda: Catálogo de Productos y Categorías */}
      <div className="pos-products-panel">
        {products.length === 0 ? (
          <div className="pos-catalog-empty-state">
            <div className="catalog-empty-circle">
              <UtensilsCrossed size={40} className="catalog-empty-icon" />
            </div>
            <h3 className="catalog-empty-title">Aún no hay productos registrados</h3>
            <p className="catalog-empty-desc">
              Crea tus productos y asígnales una categoría en la sección de Productos para comenzar a vender en el punto de venta.
            </p>
            <button
              type="button"
              className="btn-pos-go-products"
              onClick={() => navigate('/products')}
            >
              <Plus size={16} /> Ir a Productos
            </button>
          </div>
        ) : (
          <div className="pos-catalog-wrapper">
            {/* Título de la vista */}
            <div className="pos-page-header-row">
              <h1 className="pos-main-title">POS Venta</h1>
            </div>

            {/* Barra superior de Búsqueda y Estadísticas */}
            <div className="pos-catalog-header">
              <div className="pos-search-box">
                <Search size={16} className="pos-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar producto en la carta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pos-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="pos-search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="pos-catalog-badge-count">
                <span>{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'producto' : 'productos'}
              </div>
            </div>

            {/* Filtro de Categorías */}
            <CategoryFilter
              categories={categories}
              activeCategory={selectedCategory}
              onSelectCategory={(catName) => setSelectedCategory(catName)}
              counts={categoryCounts}
            />

            {/* Listado / Cuadrícula de Productos */}
            {filteredProducts.length === 0 ? (
              <div className="pos-no-results-state">
                <AlertCircle size={32} color="#94a3b8" />
                <h4>No se encontraron productos</h4>
                <p>
                  {searchQuery 
                    ? `No hay productos que coincidan con "${searchQuery}" en la categoría seleccionada.` 
                    : 'No hay productos registrados en esta categoría.'}
                </p>
                <button
                  type="button"
                  className="btn-pos-clear-filters"
                  onClick={() => navigate('/products')}
                >
                  <Plus size={16} />
                  Agregar productos
                </button>
              </div>
            ) : (
              <div className="pos-grid-scroll-area">
                <ProductGrid
                  products={filteredProducts}
                  onAddToCart={addItem}
                  cartItemCounts={cartItemCounts}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Columna Derecha: Carrito con cobro directo a impresión */}
      <OrderCart
        onOpenPayment={async (checkoutData) => {
          if (!currentShift?.isOpen) {
            alert('La caja se encuentra cerrada. Debes aperturar la caja para registrar ventas.');
            return;
          }

          const modalityLabel = orderType === 'DINE_IN'
            ? 'Mesa'
            : orderType === 'TAKE_AWAY'
            ? 'Llevar'
            : 'Delivery';

          const methodMap = {
            efectivo: 'Efectivo',
            tarjeta: 'Tarjeta',
            yape: 'Yape',
            mixto: 'Mixto',
          };
          const methodLabel = methodMap[checkoutData?.paymentMethod] || 'Efectivo';
          const cashierName = user?.name || user?.user_metadata?.name || currentShift?.cashierName || 'Admin Ohana';

          const turnNumber = getNextTurnNumber();

          const selectedDocType = checkoutData?.docType || 'nota';
          const boletaNumber = syncAndGetNextBoletaNumber(null, selectedDocType);

          let defaultPrefix = 'NV01';
          if (selectedDocType === 'boleta') defaultPrefix = 'B001';
          else if (selectedDocType === 'factura') defaultPrefix = 'F001';

          let ticketCode = checkoutData?.ticket_code || `${defaultPrefix}-${String(boletaNumber || 1).padStart(4, '0')}`;
          ticketCode = sanitizeOrderTicketCode(ticketCode);


          const effectiveTotal = checkoutData?.finalTotal !== undefined ? checkoutData.finalTotal : total;

          const orderPayload = {
            id: activeOrderId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`),
            ticket_code: ticketCode,
            turn_number: turnNumber,
            docType: selectedDocType,
            customer_name: checkoutData?.customerName || customerName || 'CLIENTE GENERAL',
            doc_number: checkoutData?.doc_number || checkoutData?.customerDni || '',
            customer_address: checkoutData?.customer_address || '',
            modality: modalityLabel,
            table_number: modalityLabel === 'Mesa' ? tableNumber : '',
            payment_method: methodLabel,
            cash_given: checkoutData?.cashGiven || 0,
            change: checkoutData?.changeAmount || 0,
            subtotal: total,
            discount: checkoutData?.discountVal || 0,
            total: effectiveTotal,
            status: 'Completado',
            shift_id: currentShift?.id || null,
            cashier_name: cashierName,
            mixed_cash: checkoutData?.mixedCash || 0,
            mixed_card: checkoutData?.mixedCard || 0,
            mixed_yape: checkoutData?.mixedYape || 0,
            items: sanitizeOrderItemsForStorage(items),
            order_items: sanitizeOrderItemsForStorage(items),
            created_at: new Date().toISOString(),
          };

          try {
            const res = await cashService.recordOrder(orderPayload);
            const savedOrder = res?.order || orderPayload;

            // Sincronizar el nuevo correlativo para el siguiente pedido y notificar
            syncAndGetNextBoletaNumber();
            window.dispatchEvent(new CustomEvent('ohana_boleta_num_updated'));

            // Limpiamos el carrito en modo silencioso
            clearCart(true);

            // Mostramos el mensaje de cobro exitoso arriba a la derecha con animación
            const ticketDisplay = savedOrder?.ticket_code || ticketCode || '';
            showToast(`¡Pedido cobrado con éxito! #${ticketDisplay}`, 'payment');

            // Imprimir directamente la Boleta de Venta y la Comanda de Cocina con todos los productos y cantidades
            try {
              const printPayload = {
                ...savedOrder,
                items: (savedOrder.items && savedOrder.items.length > 0)
                  ? savedOrder.items
                  : (orderPayload.items || []),
              };
              printBothTicketsDirectly(printPayload);
            } catch (printErr) {
              console.error('Error al generar impresión de ticket:', printErr);
            }

          } catch (err) {
            console.error('Error registrando cobro directo:', err);
            alert('Hubo un error al registrar el cobro.');
          }
        }}
        onParkOrder={async (parkData) => {
          const modalityLabel = orderType === 'DINE_IN'
            ? 'Mesa'
            : orderType === 'TAKE_AWAY'
            ? 'Llevar'
            : 'Delivery';

          const cashierName = user?.name || user?.user_metadata?.name || currentShift?.cashierName || 'Admin Ohana';

          const selectedDocType = parkData?.docType || 'nota';
          const boletaNumber = syncAndGetNextBoletaNumber(null, selectedDocType);

          let defaultPrefix = 'NV01';
          if (selectedDocType === 'boleta') defaultPrefix = 'B001';
          else if (selectedDocType === 'factura') defaultPrefix = 'F001';

          let ticketCode = activeOrderTicketCode || parkData?.ticket_code || `${defaultPrefix}-${String(boletaNumber || 1).padStart(4, '0')}`;
          ticketCode = sanitizeOrderTicketCode(ticketCode);

          const orderPayload = {
            id: activeOrderId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`),
            ticket_code: ticketCode,
            turn_number: 1,
            docType: selectedDocType,
            customer_name: parkData?.customerName || customerName || 'CLIENTE GENERAL',
            doc_number: parkData?.doc_number || parkData?.customerDni || '',
            modality: modalityLabel,
            table_number: modalityLabel === 'Mesa' ? tableNumber : '',
            payment_method: 'Pendiente',
            cash_given: 0,
            change: 0,
            subtotal: total,
            discount: 0,
            total: total,
            status: 'Pendiente',
            shift_id: currentShift?.isOpen ? (currentShift?.id || null) : null,
            cashier_name: cashierName,
            items: sanitizeOrderItemsForStorage(items),
            order_items: sanitizeOrderItemsForStorage(items),
            created_at: new Date().toISOString(),
          };

          try {
            const res = await cashService.recordOrder(orderPayload);
            const savedOrder = res?.order || orderPayload;

            // Sincronizar nuevo correlativo si es una nueva orden
            if (!activeOrderId) {
              syncAndGetNextBoletaNumber();
              window.dispatchEvent(new CustomEvent('ohana_boleta_num_updated'));
            }
            window.dispatchEvent(new CustomEvent('ohana_orders_updated', { detail: savedOrder }));

            // Limpiamos el carrito
            clearCart(true);

            showToast(`¡Venta aparcada como pendiente! #${savedOrder?.ticket_code || ticketCode}`, 'payment');
            return savedOrder;
          } catch (err) {
            console.error('Error aparcando venta:', err);
            alert('Hubo un error al aparcar el pedido.');
            throw err;
          }
        }}
      />
    </div>

  );
};

export default POSPage;


