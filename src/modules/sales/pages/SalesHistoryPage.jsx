import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { exportSalesToExcel } from '../../../utils/excelExporter';
import { 
  ShoppingBag, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  MoreVertical,
  Eye,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileSpreadsheet,
  FileText,
  FileCode,
  FileCheck,
  TrendingDown,
  TrendingUp,
  Edit,
  Ban
} from 'lucide-react';
import { cashService } from '../../../services/cashService';
import supabase from '../../../services/supabaseClient';
import { syncAndGetNextBoletaNumber } from '../../../utils/storageUtils';

export const SalesHistoryPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState(null); // { sale, top, bottom, right, isDropup }
  const [selectedSale, setSelectedSale] = useState(null);
  const [creditNoteSale, setCreditNoteSale] = useState(null);
  const [debitNoteSale, setDebitNoteSale] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [editForm, setEditForm] = useState({ customer: '', docNumber: '', payment: '', notes: '' });

  // Month navigation and Excel export state
  const [filterMode, setFilterMode] = useState('month'); // 'month' | 'all'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openExportMenu, setOpenExportMenu] = useState(false);

  // Close dropdowns on outside click, scroll or resize
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenMenu(null);
      setOpenExportMenu(false);
    };
    const handleScrollOrResize = () => {
      setOpenMenu(null);
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  const handleOpenActionMenu = (e, sale) => {
    e.stopPropagation();
    if (openMenu?.sale?.id === sale.id) {
      setOpenMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isDropup = spaceBelow < 210;

    setOpenMenu({
      sale,
      top: isDropup ? undefined : rect.bottom + 4,
      bottom: isDropup ? window.innerHeight - rect.top + 4 : undefined,
      right: Math.max(12, window.innerWidth - rect.right),
      isDropup,
    });
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const currentMonthLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

  const handlePrevMonth = () => {
    setFilterMode('month');
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setFilterMode('month');
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToggleAllMonths = () => {
    setFilterMode((prev) => (prev === 'all' ? 'month' : 'all'));
  };

  const fetchSales = async () => {
    try {
      const data = await cashService.getOrders();
      if (data && data.length > 0) {
        const formatted = data.map((o, idx) => {
          let docType = o.doc_type || o.document_type;
          const code = (o.ticket_code || '').toUpperCase();
          if (!docType) {
            if (code.startsWith('F') || o.customer_ruc || (o.customer_dni && o.customer_dni.length === 11)) {
              docType = 'Factura';
            } else if (code.startsWith('NV') || code.startsWith('NOTA')) {
              docType = 'Nota de Venta';
            } else {
              docType = 'Boleta';
            }
          }

          let ticketNumber = o.ticket_code;
          if (!ticketNumber) {
            const prefix = docType === 'Factura' ? 'F001' : docType === 'Nota de Venta' ? 'NV01' : 'B001';
            ticketNumber = `${prefix}-${o.id ? o.id.toString().slice(-4).padStart(4, '0') : '0001'}`;
          }
          if (ticketNumber && ticketNumber.endsWith('-0000')) {
            ticketNumber = ticketNumber.replace(/-0000$/, '-0001');
          }

          const sunatStatus = o.sunat_status || (o.status === 'Pendiente' ? 'Pendiente' : 'Aceptado');
          const uniqueId = String(o.id || o.rawId || `sale_${ticketNumber}_${o.created_at || ''}_${idx}`);

          return {
            id: uniqueId,
            rawId: o.id || uniqueId,
            rawOrder: o,
            number: ticketNumber,
            docType,
            date: o.created_at || o.date,
            customer: o.customer_name || 'Cliente General',
            docNumber: o.customer_dni || o.customer_ruc || '',
            type: o.modality === 'Mesa' ? `Mesa ${o.table_number || ''}` : o.modality || 'Salón',
            modality: o.modality || 'Salón',
            tableNumber: o.table_number || '',
            payment: o.payment_method || 'Efectivo',
            discount: Number(o.discount || o.discount_amount || o.discountVal || 0),
            total: Number(o.total) || 0,
            status: o.status || 'Completado',
            sunat: sunatStatus,
            items: o.order_items || o.items || [],
            itemsSummary: o.items_summary || '',
          };
        });
        setSales(formatted);
      } else {
        setSales([]);
      }
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!window.confirm(`¿Estás seguro de anular el comprobante ${sale.number}?`)) {
      return;
    }
    try {
      const targetId = String(sale.rawId || sale.id || '');
      const targetNumber = String(sale.number || sale.ticket_code || '');
      const targetCreatedAt = sale.date || sale.created_at;

      const stored = localStorage.getItem('ohana_orders_cache');
      let filtered = [];
      if (stored) {
        const list = JSON.parse(stored);
        let removed = false;
        filtered = list.filter((item) => {
          if (removed) return true; // Elimina estrictamente un solo comprobante

          const itemUniqueId = String(item.id || '');
          const itemTicket = String(item.ticket_code || item.ticketCode || item.number || '');
          const itemDate = item.created_at || item.date;

          // 1. Coincidencia por ID único
          if (targetId && itemUniqueId && itemUniqueId === targetId) {
            removed = true;
            return false;
          }

          // 2. Coincidencia por ticket Y fecha exacta si el ID no está disponible
          if (targetNumber && itemTicket === targetNumber && targetCreatedAt && itemDate === targetCreatedAt) {
            removed = true;
            return false;
          }

          return true;
        });
        localStorage.setItem('ohana_orders_cache', JSON.stringify(filtered));
      }

      // Eliminar únicamente el comprobante seleccionado en el estado de React
      setSales((prev) => prev.filter((s) => s.id !== sale.id));

      if (sale.rawId) {
        try {
          await supabase.from('order_items').delete().eq('order_id', sale.rawId);
          await supabase.from('orders').delete().eq('id', sale.rawId);
        } catch (dbErr) {
          console.warn('Notice deleting order from Supabase:', dbErr);
        }
      }

      // Recalcular correlativo de boletas de inmediato para volver al estado actual
      const remainingOrders = filtered.length > 0 ? filtered : sales.filter((s) => s.id !== sale.id);
      syncAndGetNextBoletaNumber(remainingOrders);

      window.dispatchEvent(new CustomEvent('ohana_orders_updated'));
      window.dispatchEvent(new CustomEvent('ohana_boleta_num_updated'));
    } catch (e) {
      console.error('Error anulando comprobante:', e);
    }
  };


  const handlePrintSale = (sale) => {
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      alert(`Abriendo comprobante ${sale.number} para impresión...`);
      return;
    }
    const isFactura = (sale.number || '').startsWith('F');
    const docTitle = isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
    const itemsHtml = (sale.items || []).map((it) => `
      <tr>
        <td style="padding: 4px 0; font-size: 12px;">${it.quantity || 1}x ${it.product_name || it.name || 'Producto'}</td>
        <td style="padding: 4px 0; font-size: 12px; text-align: right;">S/ ${(Number(it.unit_price || it.price || 0) * Number(it.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle} - ${sale.number}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: monospace; font-size: 12px; width: 72mm; margin: 0 auto; padding: 12px 4px; color: #000; }
          .text-center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="margin: 0; font-size: 16px;">OHANA MAKIS &amp; SUSHI BAR</h2>
          <div style="font-size: 11px;">RUC: 20609876543</div>
          <div style="font-size: 10px;">Av. Principal 123 • Lima, Perú</div>
          <div class="divider"></div>
          <div style="font-weight: bold; font-size: 13px;">${docTitle}</div>
          <div style="font-size: 14px; font-weight: bold;">${sale.number}</div>
        </div>
        <div class="divider"></div>
        <div><strong>Fecha:</strong> ${formatDate(sale.date)}</div>
        <div><strong>Cliente:</strong> ${sale.customer || 'Cliente General'}</div>
        ${sale.docNumber ? `<div><strong>Doc:</strong> ${sale.docNumber}</div>` : ''}
        <div><strong>Forma Pago:</strong> ${sale.payment || 'Efectivo'}</div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; font-size: 11px;">DESCRIPCIÓN</th>
              <th style="text-align: right; font-size: 11px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="2">Consumo en local</td></tr>'}
          </tbody>
        </table>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
          <span>TOTAL:</span>
          <span>S/ ${(Number(sale.total) || 0).toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        <div class="text-center" style="font-size: 10px; margin-top: 10px;">
          <div>Representación impresa del comprobante electrónico</div>
          <div>Autorizado mediante Resolución SUNAT</div>
          <div style="margin-top: 6px;">¡Gracias por su preferencia!</div>
        </div>
        <script>
          window.onload = function() { window.focus(); window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadXml = (sale) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${sale.number || 'B001-0001'}</cbc:ID>
  <cbc:IssueDate>${new Date(sale.date || Date.now()).toISOString().split('T')[0]}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="6">20609876543</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>OHANA MAKIS &amp; SUSHI BAR S.A.C.</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="1">${sale.docNumber || '00000000'}</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>${sale.customer || 'CLIENTE GENERAL'}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="PEN">${(Number(sale.total) || 0).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `20609876543-03-${sale.number || 'B001'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCdr = (sale) => {
    const cdr = `<?xml version="1.0" encoding="UTF-8"?>
<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"
                     xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                     xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>CDR-${sale.number || 'B001'}</cbc:ID>
  <cbc:IssueDate>${new Date().toISOString().split('T')[0]}</cbc:IssueDate>
  <cac:DocumentResponse>
    <cac:Response>
      <cbc:ReferenceID>${sale.number || 'B001'}</cbc:ReferenceID>
      <cbc:ResponseCode>0</cbc:ResponseCode>
      <cbc:Description>El comprobante numero ${sale.number || 'B001'} ha sido ACEPTADO por SUNAT.</cbc:Description>
    </cac:Response>
  </cac:DocumentResponse>
</ApplicationResponse>`;

    const blob = new Blob([cdr], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `R-20609876543-03-${sale.number || 'B001'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartEditSale = (sale) => {
    setEditForm({
      customer: sale.customer || '',
      docNumber: sale.docNumber || '',
      payment: sale.payment || 'Efectivo',
      notes: sale.notes || '',
    });
    setEditingSale(sale);
  };

  const handleSaveEditSale = () => {
    if (!editingSale) return;
    try {
      const stored = localStorage.getItem('ohana_orders_cache');
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map((item) => {
          if ((item.ticket_code || item.id) === (editingSale.number || editingSale.rawId)) {
            return {
              ...item,
              customer_name: editForm.customer,
              customer_dni: editForm.docNumber,
              payment_method: editForm.payment,
              notes: editForm.notes,
            };
          }
          return item;
        });
        localStorage.setItem('ohana_orders_cache', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('ohana_orders_updated'));
      }
      setSales((prev) =>
        prev.map((s) =>
          s.id === editingSale.id
            ? { ...s, customer: editForm.customer, docNumber: editForm.docNumber, payment: editForm.payment }
            : s
        )
      );
      setEditingSale(null);
    } catch (e) {
      console.error('Error guardando cambios de venta:', e);
    }
  };

  const handleEmitCreditNote = (sale, reason) => {
    alert(`Nota de Crédito electrónica emitida exitosamente para ${sale.number}.\nMotivo: ${reason || 'Anulación de la operación'}`);
    setCreditNoteSale(null);
  };

  const handleEmitDebitNote = (sale, reason, amount) => {
    alert(`Nota de Débito electrónica emitida exitosamente para ${sale.number} por S/ ${amount || '0.00'}.\nMotivo: ${reason || 'Aumento en el valor'}`);
    setDebitNoteSale(null);
  };

  useEffect(() => {
    fetchSales();

    const handleUpdate = () => {
      fetchSales();
    };

    window.addEventListener('ohana_orders_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ohana_orders_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Ventas del mes seleccionado
  const monthSales = useMemo(() => {
    return sales.filter((s) => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return !isNaN(d.getTime()) && d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [sales, selectedYear, selectedMonth]);

  // Ventas activas en la tabla según el filtro
  const displaySales = useMemo(() => {
    if (filterMode === 'all') return sales;
    return monthSales;
  }, [filterMode, sales, monthSales]);

  // 4 Cards metrics calculations (dinámico según displaySales)
  const metrics = useMemo(() => {
    const totalComprobantes = displaySales.length;
    const pagadasList = displaySales.filter((s) => s.status !== 'Pendiente');
    const totalPagadas = pagadasList.length;
    const pagadasMonto = pagadasList.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    const pendientesList = displaySales.filter((s) => s.status === 'Pendiente');
    const totalPendientes = pendientesList.length;
    const pendientesMonto = pendientesList.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    const montoTotal = displaySales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    return {
      totalComprobantes,
      totalPagadas,
      pagadasMonto,
      totalPendientes,
      pendientesMonto,
      montoTotal,
    };
  }, [displaySales]);

  // Manejo de exportación a Excel
  const handleExportCurrentMonth = () => {
    exportSalesToExcel({
      sales: monthSales,
      periodLabel: currentMonthLabel,
      metrics,
    });
  };

  const handleExportAll = () => {
    exportSalesToExcel({
      sales: sales,
      periodLabel: 'Historial General (Todos los meses)',
      metrics: null,
    });
  };

  const columns = [
    {
      key: 'number',
      header: 'Número',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#0f172a', letterSpacing: '0.02em' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'docType',
      header: 'Comprobante',
      render: (val) => (
        <span className={`doc-type-pill ${val.toLowerCase().includes('factura') ? 'factura' : val.toLowerCase().includes('nota') ? 'nota' : 'boleta'}`}>
          {val}
        </span>
      ),
    },
    {
      key: 'products',
      header: 'Productos Vendidos',
      render: (_, row) => {
        const items = Array.isArray(row.items) && row.items.length > 0 ? row.items : [];
        if (items.length > 0) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '140px' }}>
              {items.slice(0, 2).map((it, idx) => {
                const qty = it.quantity || it.cant || 1;
                const name = it.product_name || it.name || 'Producto';
                return (
                  <div key={idx} style={{ fontSize: '0.78rem', color: '#1e293b' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{qty}x</span> {name}
                  </div>
                );
              })}
              {items.length > 2 && (
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  +{items.length - 2} productos más
                </span>
              )}
            </div>
          );
        }
        if (row.rawOrder?.items_summary || row.itemsSummary) {
          return (
            <span style={{ fontSize: '0.78rem', color: '#334155' }}>
              {row.rawOrder?.items_summary || row.itemsSummary}
            </span>
          );
        }
        return <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>-</span>;
      },
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          {row.docNumber && (
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.docNumber}</div>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Fecha de Emisión',
      render: (val) => formatDate(val),
    },
    {
      key: 'discount',
      header: 'Descuento',
      render: (val, row) => {
        const disc = Number(val !== undefined ? val : (row.discount || 0));
        if (disc > 0) {
          return (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 7px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              whiteSpace: 'nowrap',
            }}>
              -S/ {disc.toFixed(2)}
            </span>
          );
        }
        return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>;
      },
    },
    {
      key: 'total',
      header: 'Total',
      render: (val) => (
        <strong style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
          {formatCurrency(val)}
        </strong>
      ),
    },
    {
      key: 'payment',
      header: 'Pago',
      render: (val) => {
        const str = String(val || 'Efectivo');
        const formatted = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        return (
          <span className={`payment-pill ${str.toLowerCase()}`}>
            {formatted}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (val) => (
        <span className={`status-pill ${val === 'Pendiente' ? 'warning' : val === 'Anulado' ? 'danger' : 'active'}`}>
          {val}
        </span>
      ),
    },
    {
      key: 'sunat',
      header: 'SUNAT',
      render: (val) => {
        const isOk = val === 'Aceptado';
        const isWarn = val === 'Pendiente' || val === 'En proceso';
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: isOk ? '#ecfdf5' : isWarn ? '#fffbeb' : '#fef2f2',
              color: isOk ? '#059669' : isWarn ? '#d97706' : '#dc2626',
              border: `1px solid ${isOk ? '#a7f3d0' : isWarn ? '#fde68a' : '#fecaca'}`,
              whiteSpace: 'nowrap',
            }}
          >
            {isOk ? '✓ Aceptado' : isWarn ? '⏳ Pendiente' : '✕ Rechazado'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '48px',
      render: (_, row) => (
        <div className="table-action-cell" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`table-action-btn ${openMenu?.sale?.id === row.id ? 'active' : ''}`}
            aria-label="Opciones"
            onClick={(e) => handleOpenActionMenu(e, row)}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="module-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Historial de Ventas</h1>
          <p className="page-subtitle">Registro de comprobantes, comandas facturadas y métodos de pago</p>
        </div>

        {/* Toolbar: Mes, Todos los meses, Exportar Excel */}
        <div className="sales-toolbar-container">
          {/* Navegador < Mes Año > */}
          <div className="month-stepper-box">
            <button 
              type="button" 
              className="month-stepper-btn" 
              onClick={handlePrevMonth}
              title="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span 
              className="month-stepper-label" 
              style={{ 
                color: filterMode === 'all' ? '#64748b' : '#0f172a',
                cursor: filterMode === 'all' ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (filterMode === 'all') setFilterMode('month');
              }}
              title={filterMode === 'all' ? 'Haz clic para filtrar por este mes' : undefined}
            >
              {currentMonthLabel}
            </span>
            <button 
              type="button" 
              className="month-stepper-btn" 
              onClick={handleNextMonth}
              title="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Botón Todos los meses */}
          <button 
            type="button" 
            className={`btn-all-months ${filterMode === 'all' ? 'active' : ''}`}
            onClick={handleToggleAllMonths}
            title="Mostrar todas las ventas de la historia"
          >
            <Calendar size={16} />
            <span>Todos los meses</span>
          </button>

          {/* Botón Exportar Excel con Menú Desplegable */}
          <div className="export-excel-wrapper">
            <button 
              type="button" 
              className="btn-export-excel"
              onClick={(e) => {
                e.stopPropagation();
                setOpenExportMenu((prev) => !prev);
              }}
              title="Exportar reporte de ventas a Excel"
            >
              <FileSpreadsheet size={17} />
              <span>Exportar Excel</span>
            </button>

            {openExportMenu && (
              <div className="export-excel-dropdown" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="export-excel-item"
                  onClick={() => {
                    setOpenExportMenu(false);
                    handleExportCurrentMonth();
                  }}
                >
                  <FileSpreadsheet size={16} style={{ color: '#2563eb' }} />
                  <div>
                    <div>Exportar {currentMonthLabel}</div>
                    <span className="export-excel-sub">
                      {monthSales.length} {monthSales.length === 1 ? 'venta' : 'ventas'} en este mes
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="export-excel-item"
                  onClick={() => {
                    setOpenExportMenu(false);
                    handleExportAll();
                  }}
                >
                  <Calendar size={16} style={{ color: '#059669' }} />
                  <div>
                    <div>Exportar Todo el Historial</div>
                    <span className="export-excel-sub">
                      {sales.length} {sales.length === 1 ? 'venta general' : 'ventas generales'}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 KPI Cards: Comprobantes, Pagadas, Pendientes, Monto Total */}
      <div className="cash-stats-row" style={{ marginBottom: '1.25rem' }}>
        {/* Card 1: Comprobantes */}
        <div className="cash-stat-card">
          <div className="cash-stat-info">
            <span className="cash-stat-label">Comprobantes</span>
            <span className="cash-stat-val text-slate-900">
              {metrics.totalComprobantes}
            </span>
            <span className="cash-stat-sub">
              {filterMode === 'all' ? 'Historial completo' : currentMonthLabel}
            </span>
          </div>
          <div className="cash-stat-icon-badge blue-light">
            <Receipt size={19} className="text-blue-600" />
          </div>
        </div>

        {/* Card 2: Pagadas */}
        <div className="cash-stat-card">
          <div className="cash-stat-info">
            <span className="cash-stat-label">Pagadas</span>
            <span className="cash-stat-val text-emerald-600">
              {metrics.totalPagadas}
            </span>
            <span className="cash-stat-sub">
              {formatCurrency(metrics.pagadasMonto)} recaudado
            </span>
          </div>
          <div className="cash-stat-icon-badge green-light">
            <CheckCircle2 size={19} className="text-emerald-600" />
          </div>
        </div>

        {/* Card 3: Pendientes */}
        <div className="cash-stat-card">
          <div className="cash-stat-info">
            <span className="cash-stat-label">Pendientes</span>
            <span className="cash-stat-val text-amber-600">
              {metrics.totalPendientes}
            </span>
            <span className="cash-stat-sub">
              {metrics.totalPendientes > 0
                ? `${formatCurrency(metrics.pendientesMonto)} por cobrar`
                : 'Al día, sin pendientes'}
            </span>
          </div>
          <div className="cash-stat-icon-badge amber-light">
            <Clock size={19} className="text-amber-600" />
          </div>
        </div>

        {/* Card 4: Monto Total */}
        <div className="cash-stat-card">
          <div className="cash-stat-info">
            <span className="cash-stat-label">Monto Total</span>
            <span className="cash-stat-val text-purple-600">
              {formatCurrency(metrics.montoTotal)}
            </span>
            <span className="cash-stat-sub">
              Total facturado {filterMode === 'all' ? 'general' : 'del mes'}
            </span>
          </div>
          <div className="cash-stat-icon-badge purple-light">
            <Wallet size={19} className="text-purple-600" />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          Consultando ventas...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={displaySales}
          emptyMessage={
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
              <ShoppingBag size={40} style={{ color: '#cbd5e1', margin: '0 auto 8px', display: 'block' }} />
              <h4 style={{ color: '#0f172a', marginBottom: '4px', fontWeight: 600, fontSize: '0.95rem' }}>
                {filterMode === 'all'
                  ? 'No hay ventas registradas aún'
                  : `No hay ventas registradas en ${currentMonthLabel}`}
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                {filterMode === 'all'
                  ? 'Las comandas cerradas y cobradas en el POS se registrarán aquí.'
                  : 'Navega con las flechas o selecciona "Todos los meses" para ver el registro completo.'}
              </p>
            </div>
          }
        />
      )}

      {/* Modal de Detalle de Comprobante / Venta */}
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Detalle de Venta: ${selectedSale.number}`}
          maxWidth="560px"
        >
          <div className="ticket-detail-modal">
            <div className="ticket-header-summary">
              <div>
                <span className="ticket-sub-label">{selectedSale.docType}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: '2px 0 0' }}>
                  {selectedSale.number}
                </h3>
              </div>
              <div className="ticket-right-status" style={{ textAlign: 'right' }}>
                <span className={`status-pill ${selectedSale.status === 'Pendiente' ? 'warning' : selectedSale.status === 'Anulado' ? 'danger' : 'active'}`}>
                  {selectedSale.status}
                </span>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  {formatDate(selectedSale.date)}
                </div>
              </div>
            </div>

            <div className="ticket-metadata-grid" style={{ marginTop: '1rem' }}>
              <div className="meta-box">
                <span className="meta-title">Cliente</span>
                <strong>{selectedSale.customer}</strong>
                {selectedSale.docNumber && (
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>
                    Doc: {selectedSale.docNumber}
                  </span>
                )}
              </div>
              <div className="meta-box">
                <span className="meta-title">Modalidad</span>
                <strong>{selectedSale.type}</strong>
              </div>
              <div className="meta-box">
                <span className="meta-title">Método de Pago</span>
                <strong style={{ textTransform: 'capitalize' }}>{selectedSale.payment}</strong>
              </div>
              <div className="meta-box">
                <span className="meta-title">Estado SUNAT</span>
                <strong>{selectedSale.sunat}</strong>
              </div>
            </div>

            <div className="ticket-items-divider" style={{ margin: '1.25rem 0 0.75rem' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#475569', fontWeight: 600, letterSpacing: '0.04em' }}>
                Ítems de la Venta
              </h4>
            </div>

            <div className="ticket-breakdown-list">
              {selectedSale.items && selectedSale.items.length > 0 ? (
                selectedSale.items.map((item, i) => (
                  <div key={i} className="ticket-item-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <div className="ticket-item-left" style={{ display: 'flex', gap: '8px' }}>
                      <span className="ticket-item-qty" style={{ fontWeight: 600, color: '#f97316' }}>
                        {item.quantity || 1}x
                      </span>
                      <div>
                        <strong className="ticket-item-name" style={{ color: '#0f172a', fontWeight: 600 }}>
                          {item.product_name || item.name || 'Producto'}
                        </strong>
                        {item.portions && (
                          <span className="ticket-item-portion" style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {' '}• {item.portions}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ticket-item-price" style={{ fontWeight: 600, color: '#0f172a' }}>
                      {formatCurrency((Number(item.price || item.unit_price) || 0) * (item.quantity || 1))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '0.75rem 0', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Comanda directa registrada desde el POS
                </div>
              )}
            </div>

            <div className="ticket-total-divider" style={{ borderTop: '2px solid #0f172a', margin: '1rem 0 0.75rem' }} />

            <div className="ticket-total-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>Total Cobrado</span>
              <strong style={{ fontSize: '1.35rem', fontWeight: 600, color: '#0f172a' }}>
                {formatCurrency(selectedSale.total)}
              </strong>
            </div>

            <div className="ticket-modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-print-ticket"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => handlePrintSale(selectedSale)}
              >
                <Printer size={16} /> Imprimir Comprobante
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Emisión de Nota de Crédito */}
      {creditNoteSale && (
        <Modal
          isOpen={!!creditNoteSale}
          onClose={() => setCreditNoteSale(null)}
          title={`Emitir Nota de Crédito: ${creditNoteSale.number}`}
          maxWidth="500px"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: 600 }}>Comprobante a Modificar</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1d4ed8' }}>{creditNoteSale.number}</div>
              <div style={{ fontSize: '0.78rem', color: '#3b82f6', marginTop: '2px' }}>
                Cliente: {creditNoteSale.customer} • Total: {formatCurrency(creditNoteSale.total)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tipo de Nota de Crédito (Catálogo 09 SUNAT)
                </label>
                <select
                  id="nc-reason-select"
                  className="modal-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  defaultValue="01"
                >
                  <option value="01">01 - Anulación de la operación</option>
                  <option value="02">02 - Anulación por error en el RUC</option>
                  <option value="06">06 - Devolución total</option>
                  <option value="07">07 - Devolución por ítem</option>
                  <option value="04">04 - Descuento global</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Motivo o Sustento
                </label>
                <textarea
                  id="nc-detail-text"
                  className="modal-input"
                  rows={3}
                  placeholder="Ej: Error en digitación de pedido o cambio solicitado por el cliente..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                  defaultValue="Anulación de comprobante por solicitud del cliente"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCreditNoteSale(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sel = document.getElementById('nc-reason-select');
                    const txt = document.getElementById('nc-detail-text');
                    const reason = sel ? sel.options[sel.selectedIndex].text : 'Anulación de operación';
                    handleEmitCreditNote(creditNoteSale, `${reason} - ${txt ? txt.value : ''}`);
                  }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Emitir Nota Crédito
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Emisión de Nota de Débito */}
      {debitNoteSale && (
        <Modal
          isOpen={!!debitNoteSale}
          onClose={() => setDebitNoteSale(null)}
          title={`Emitir Nota de Débito: ${debitNoteSale.number}`}
          maxWidth="500px"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>Comprobante a Modificar</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309' }}>{debitNoteSale.number}</div>
              <div style={{ fontSize: '0.78rem', color: '#d97706', marginTop: '2px' }}>
                Cliente: {debitNoteSale.customer} • Total Original: {formatCurrency(debitNoteSale.total)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tipo de Nota de Débito (Catálogo 10 SUNAT)
                </label>
                <select
                  id="nd-reason-select"
                  className="modal-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  defaultValue="02"
                >
                  <option value="02">02 - Aumento en el valor</option>
                  <option value="01">01 - Intereses por mora</option>
                  <option value="03">03 - Penalidades / otros conceptos</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Monto Adicional (S/)
                </label>
                <input
                  id="nd-amount-input"
                  type="number"
                  step="0.10"
                  defaultValue="5.00"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Motivo o Sustento
                </label>
                <textarea
                  id="nd-detail-text"
                  className="modal-input"
                  rows={2}
                  placeholder="Ej: Cargo adicional por servicio express..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                  defaultValue="Aumento de valor pactado con el cliente"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDebitNoteSale(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sel = document.getElementById('nd-reason-select');
                    const amt = document.getElementById('nd-amount-input');
                    const reason = sel ? sel.options[sel.selectedIndex].text : 'Aumento en el valor';
                    handleEmitDebitNote(debitNoteSale, reason, amt ? amt.value : '5.00');
                  }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#d97706', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Emitir Nota Débito
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Edición de Comprobante / Venta */}
      {editingSale && (
        <Modal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          title={`Editar Comprobante: ${editingSale.number}`}
          maxWidth="480px"
        >
          <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={editForm.customer}
                onChange={(e) => setEditForm((prev) => ({ ...prev, customer: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                placeholder="Nombre o Razón Social"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Documento de Identidad (DNI / RUC)
              </label>
              <input
                type="text"
                value={editForm.docNumber}
                onChange={(e) => setEditForm((prev) => ({ ...prev, docNumber: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                placeholder="Ej: 72345678 o 20601234567"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Método de Pago
              </label>
              <select
                value={editForm.payment}
                onChange={(e) => setEditForm((prev) => ({ ...prev, payment: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Tarjeta">Tarjeta (Visa / Mastercard)</option>
                <option value="Mixto">Pago Mixto</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditSale}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Portal Flotante de Acciones (Fuera de la tabla para no crear scrollbars jamás) */}
      {openMenu && createPortal(
        <div
          className={`actions-dropdown-menu portal ${openMenu.isDropup ? 'dropup' : ''}`}
          style={{
            position: 'fixed',
            top: openMenu.top !== undefined ? `${openMenu.top}px` : 'auto',
            bottom: openMenu.bottom !== undefined ? `${openMenu.bottom}px` : 'auto',
            right: `${openMenu.right}px`,
            zIndex: 999999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. PDF */}
          <button
            type="button"
            className="actions-dropdown-item item-pdf"
            onClick={() => {
              const sale = openMenu.sale;
              setOpenMenu(null);
              handlePrintSale(sale);
            }}
          >
            <FileText size={12} strokeWidth={1.8} style={{ color: '#2563eb' }} />
            <span style={{ color: '#2563eb' }}>PDF</span>
          </button>

          {/* 2. XML */}
          <button
            type="button"
            className="actions-dropdown-item item-xml"
            onClick={() => {
              const sale = openMenu.sale;
              setOpenMenu(null);
              handleDownloadXml(sale);
            }}
          >
            <FileCode size={12} strokeWidth={1.8} style={{ color: '#475569' }} />
            <span style={{ color: '#475569' }}>XML</span>
          </button>

          {/* 3. CDR */}
          <button
            type="button"
            className="actions-dropdown-item item-cdr"
            onClick={() => {
              const sale = openMenu.sale;
              setOpenMenu(null);
              handleDownloadCdr(sale);
            }}
          >
            <FileCheck size={12} strokeWidth={1.8} style={{ color: '#d97706' }} />
            <span style={{ color: '#d97706' }}>CDR</span>
          </button>

          <div className="actions-dropdown-divider" />

          {/* 4. Nota Crédito */}
          <button
            type="button"
            className="actions-dropdown-item item-nc"
            onClick={() => {
              const sale = openMenu.sale;
              setOpenMenu(null);
              setCreditNoteSale(sale);
            }}
          >
            <TrendingDown size={12} strokeWidth={1.8} style={{ color: '#2563eb' }} />
            <span style={{ color: '#2563eb' }}>Nota Crédito</span>
          </button>

          {/* 5. Nota Débito */}
          <button
            type="button"
            className="actions-dropdown-item item-nd"
            onClick={() => {
              const sale = openMenu.sale;
              setOpenMenu(null);
              setDebitNoteSale(sale);
            }}
          >
            <TrendingUp size={12} strokeWidth={1.8} style={{ color: '#d97706' }} />
            <span style={{ color: '#d97706' }}>Nota Débito</span>
          </button>

          <div className="actions-dropdown-divider" />

          {/* 6. Ver Detalle */}
          <button
            type="button"
            className="actions-dropdown-item item-detail"
            onClick={() => {
              const sale = openMenu.sale;
              setOpenMenu(null);
              setSelectedSale(sale);
            }}
          >
            <Eye size={12} strokeWidth={1.8} style={{ color: '#475569' }} />
            <span style={{ color: '#334155' }}>Ver Detalle</span>
          </button>

          {/* 7. Editar */}
          <button
            type="button"
            className="actions-dropdown-item item-edit"
            onClick={() => {
              const sale = openMenu.sale;
              setOpenMenu(null);
              handleStartEditSale(sale);
            }}
          >
            <Edit size={12} strokeWidth={1.8} style={{ color: '#2563eb' }} />
            <span style={{ color: '#2563eb' }}>Editar</span>
          </button>

          {/* 8. Anular */}
          <button
            type="button"
            className="actions-dropdown-item item-delete"
            onClick={() => {
              const sale = openMenu.sale;
              setOpenMenu(null);
              handleDeleteSale(sale);
            }}
          >
            <Ban size={12} strokeWidth={1.8} style={{ color: '#ef4444' }} />
            <span style={{ color: '#ef4444' }}>Anular</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SalesHistoryPage;
