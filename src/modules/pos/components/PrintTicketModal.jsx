import React, { useState, useEffect } from 'react';
import {
  FileText,
  ChefHat,
  Printer,
  CheckCircle,
  Layers,
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { formatCurrency } from '../../../utils/formatCurrency';
import { getCurrentTurnNumber } from '../../../utils/turnHelper';
import '../styles/PrintTicketModal.css';

/**
 * Función que abre la ventana de impresión nativa del navegador con el formato exacto de 80mm
 */
export const printThermalTicket = (contentHtml, title = 'Imprimir Ticket Ohana') => {
  try {
    let iframe = document.getElementById('ohana-print-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'ohana-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow || iframe.contentDocument;
    const documentObj = doc.document || doc;
    documentObj.open();
    documentObj.write(getPrintHTML(contentHtml, title));
    documentObj.close();

    setTimeout(() => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      } catch (err) {
        console.warn('Fallback a window.open para impresión:', err);
        const printWindow = window.open('', '_blank', 'width=450,height=700');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(getPrintHTML(contentHtml, title));
          printWindow.document.close();
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 300);
        }
      }
    }, 350);
  } catch (e) {
    console.error('Error al imprimir ticket:', e);
  }
};

export const buildBoletaHTML = (orderData) => {
  if (!orderData) return '';
  const {
    docType = 'boleta',
    customer_name = 'CLIENTE GENERAL',
    doc_number = '',
    customer_address = '',
    modality = 'MESA',
    table_number = '',
    payment_method = 'EFECTIVO',
    total = 0,
    created_at = new Date().toISOString(),
    cashier_name = 'ADMIN OHANA',
  } = orderData;

  const docNumber = doc_number || orderData.doc_number || orderData.customerDni || orderData.ruc || '';
  const customerAddress = customer_address || orderData.customer_address || '';

  const rawTicketCode = orderData.ticket_code || (docType === 'factura' ? 'F001-0001' : (docType === 'nota' || docType === 'nota_venta') ? 'NV01-0001' : 'B001-0001');
  const ticket_code = rawTicketCode.endsWith('-0000') ? rawTicketCode.replace(/-0000$/, '-0001') : rawTicketCode;

  const turnNumber = getCurrentTurnNumber(orderData);

  const d = new Date(created_at);
  const formattedDateTime = d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

  const modalityDisplay = modality === 'Mesa'
    ? `MESA ${table_number ? table_number.replace(/mesa\s*/i, '') : ''}`.trim()
    : modality.toUpperCase();

  const docTitle = docType === 'factura' 
    ? 'FACTURA ELECTRÓNICA' 
    : (docType === 'nota' || docType === 'nota_venta') 
      ? 'NOTA DE VENTA' 
      : 'BOLETA DE VENTA';

  let itemsList = orderData.items || orderData.order_items || [];
  if ((!itemsList || itemsList.length === 0) && orderData.items_summary && typeof orderData.items_summary === 'string') {
    itemsList = orderData.items_summary.split(',').map((part) => {
      const match = part.trim().match(/^(\d+)x\s+(.+)$/i);
      if (match) {
        return { quantity: parseInt(match[1], 10), name: match[2].trim(), price: 0 };
      }
      return { quantity: 1, name: part.trim(), price: 0 };
    });
  }

  const ticketLogo = (() => {
    try {
      return localStorage.getItem('ohana_ticket_logo') || localStorage.getItem('ohana_app_logo') || '/assets/logo-ohana.png';
    } catch {
      return '/assets/logo-ohana.png';
    }
  })();

  const companyConfig = (() => {
    try {
      const stored = localStorage.getItem('ohana_company_config');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const companyRuc = companyConfig?.ruc || '20606488506';
  const companyAddress = companyConfig?.address || 'JR. 2 DE MAYO - YARINACOCHA';
  const companyName = companyConfig?.commercial_name || companyConfig?.business_name || '';

  return `
    <div class="dolce-ticket-container">
      <div class="dolce-header">
        <img src="${ticketLogo}" alt="Ohana" class="dolce-logo" onerror="this.style.display='none'" />
        ${companyName ? `<div style="font-size: 12.5px; font-weight: 900; text-transform: uppercase; color: #000; margin: 4px 0 2px;">${companyName}</div>` : ''}
        <div class="dolce-ruc">RUC: ${companyRuc}</div>
        <div class="dolce-address">${companyAddress}</div>
      </div>

      <div class="dolce-dashed-line"></div>

      <div class="dolce-doc-box">
        <div class="dolce-doc-title">${docTitle}</div>
        <div class="dolce-folio">FOLIO: ${ticket_code}</div>
        <div class="dolce-datetime">${formattedDateTime}</div>
      </div>

      ${(docType === 'factura' || docType === 'boleta' || customer_name !== 'CLIENTE GENERAL') ? `
        <div class="dolce-dashed-line"></div>
        <div class="dolce-meta-box" style="text-align: left; font-size: 11px;">
          ${docType === 'factura' ? `
            <div class="dolce-meta-row"><span>RUC:</span><span style="font-weight: bold;">${docNumber || '-'}</span></div>
            <div class="dolce-meta-row"><span>RAZÓN SOCIAL:</span><span style="font-weight: bold;">${(customer_name || '').toUpperCase()}</span></div>
            ${customerAddress ? `<div class="dolce-meta-row"><span>DIR. FISCAL:</span><span>${(customerAddress || '').toUpperCase()}</span></div>` : ''}
          ` : `
            ${docNumber ? `<div class="dolce-meta-row"><span>DNI:</span><span style="font-weight: bold;">${docNumber}</span></div>` : ''}
            <div class="dolce-meta-row"><span>CLIENTE:</span><span style="font-weight: bold;">${(customer_name || 'CLIENTE GENERAL').toUpperCase()}</span></div>
          `}
        </div>
      ` : ''}

      <div class="dolce-dashed-line"></div>

      <table class="dolce-items-table">
        <thead>
          <tr>
            <th style="width: 28px; text-align: left;">CANT</th>
            <th style="text-align: left;">PRODUCTO</th>
            <th style="width: 58px; text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${(itemsList || []).map((it) => {
            const qty = it.quantity || it.cant || 1;
            const name = (it.name || it.product_name || 'PRODUCTO').toUpperCase();
            const unitPrice = Number(it.price !== undefined ? it.price : (it.unit_price !== undefined ? it.unit_price : 0));
            const subtotal = Number(it.total !== undefined ? it.total : (unitPrice * qty));
            return `
            <tr>
              <td style="font-weight: bold;">${qty}</td>
              <td style="font-weight: 600;">${name}</td>
              <td style="text-align: right; font-weight: bold;">S/ ${subtotal.toFixed(2)}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>


      <div class="dolce-dashed-line"></div>

      ${docType === 'factura' || docType === 'boleta' ? `
        <div class="dolce-meta-box" style="font-size: 11px; margin-bottom: 4px;">
          <div class="dolce-meta-row"><span>OP. GRAVADA:</span><span>S/ ${(Number(total) / 1.18).toFixed(2)}</span></div>
          <div class="dolce-meta-row"><span>I.G.V. (18%):</span><span>S/ ${(Number(total) - (Number(total) / 1.18)).toFixed(2)}</span></div>
        </div>
      ` : ''}

      <div class="dolce-total-row">
        <span>TOTAL:</span>
        <span>S/ ${Number(total).toFixed(2)}</span>
      </div>

      <div class="dolce-dashed-line"></div>

      <div class="dolce-meta-box">
        <div class="dolce-meta-row">
          <span>Forma de Pago:</span>
          <span style="font-weight: bold;">${String(payment_method).toUpperCase()}</span>
        </div>
        <div class="dolce-meta-row">
          <span>Modalidad:</span>
          <span style="font-weight: bold;">${modalityDisplay}</span>
        </div>
        <div class="dolce-meta-row">
          <span>Atendido por:</span>
          <span style="font-weight: bold;">${String(cashier_name).toUpperCase()}</span>
        </div>
      </div>

      <div class="dolce-turn-box" style="margin-top: 8px;">
        <div class="dolce-turn-sub">TICKET DE COCINA</div>
        <div class="dolce-turn-num">TURNO #${turnNumber}</div>
        <div class="dolce-turn-note">Atento al llamado en pantalla / barra</div>
      </div>

      <div class="dolce-footer">
        <div>¡Gracias por tu preferencia!</div>
        <div style="font-weight: bold;">Ohana POS</div>
      </div>
    </div>
  `;
};

export const buildComandaHTML = (orderData) => {
  if (!orderData) return '';
  const {
    ticket_code = 'B001-0001',
    customer_name = 'CLIENTE GENERAL',
    modality = 'MESA',
    table_number = '',
    created_at = new Date().toISOString(),
  } = orderData;

  const turnNumber = getCurrentTurnNumber(orderData);

  const d = new Date(created_at);
  const formattedDateTimeSeconds = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ` +
    d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const formattedTimeSeconds = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const formattedFullDate = d.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const modalityDisplay = modality === 'Mesa'
    ? `MESA ${table_number ? table_number.replace(/mesa\s*/i, '') : ''}`.trim()
    : modality.toUpperCase();

  let itemsList = orderData.items || orderData.order_items || [];
  if ((!itemsList || itemsList.length === 0) && orderData.items_summary && typeof orderData.items_summary === 'string') {
    itemsList = orderData.items_summary.split(',').map((part) => {
      const match = part.trim().match(/^(\d+)x\s+(.+)$/i);
      if (match) {
        return { quantity: parseInt(match[1], 10), name: match[2].trim(), price: 0 };
      }
      return { quantity: 1, name: part.trim(), price: 0 };
    });
  }

  return `
    <div class="dolce-ticket-container dolce-comanda-container">
      <div class="dolce-comanda-header">
        <div class="dolce-comanda-title">OHANA</div>
        <div class="dolce-comanda-sub">Comanda de Cocina</div>
        <div class="dolce-turn-box-outline">
          TURNO #${turnNumber}
        </div>
      </div>

      <div style="font-size: 11.5px; font-weight: 800; margin-top: 6px; text-align: center; color: #000000;">
        ${formattedDateTimeSeconds}
      </div>

      <div style="font-size: 14px; font-weight: 900; text-align: center; margin: 5px 0; color: #000000; letter-spacing: 0.5px;">
        ${modalityDisplay}
      </div>

      <div class="dolce-meta-row" style="font-size: 11px; font-weight: 800; color: #000000;">
        <span>Nombre Cliente:</span>
        <span style="font-weight: 900;">${String(customer_name).toUpperCase()}</span>
      </div>
      <div class="dolce-meta-row" style="font-size: 11px; font-weight: 800; color: #000000;">
        <span>Hora:</span>
        <span style="font-weight: 900;">${formattedTimeSeconds}</span>
      </div>

      <div class="dolce-equal-line" style="font-weight: 900;">================================</div>
      <div style="text-align: center; font-weight: 900; font-size: 12px; margin: 3px 0; color: #000000; letter-spacing: 0.5px;">
        DETALLE DEL PEDIDO
      </div>
      <div class="dolce-equal-line" style="font-weight: 900;">================================</div>

      <table class="dolce-items-table" style="font-size: 11px; font-weight: 800;">
        <thead>
          <tr>
            <th style="width: 28px; text-align: left; font-weight: 900; color: #000000;">CANT.</th>
            <th style="text-align: left; font-weight: 900; color: #000000;">DESCRIPCION.</th>
            <th style="width: 58px; text-align: right; font-weight: 900; color: #000000;">IMPORTE.</th>
          </tr>
        </thead>
        <tbody>
          ${(itemsList || []).map((it) => {
            const qty = it.quantity || it.cant || 1;
            const name = (it.name || it.product_name || 'PRODUCTO').toUpperCase();
            const unitPrice = Number(it.price !== undefined ? it.price : (it.unit_price !== undefined ? it.unit_price : 0));
            const subtotal = Number(it.total !== undefined ? it.total : (unitPrice * qty));
            return `
            <tr>
              <td style="font-weight: 900; color: #000000;">${qty}</td>
              <td>
                <div style="font-weight: 900; color: #000000;">${name}</div>
                ${it.notes ? `<div style="font-size: 10px; font-weight: 800; color: #000000;">(${it.notes})</div>` : ''}
              </td>
              <td style="text-align: right; font-weight: 900; color: #000000;">${subtotal.toFixed(2)}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>


      <div class="dolce-equal-line" style="font-weight: 900;">================================</div>

      <div style="text-align: center; font-size: 10.5px; font-weight: 800; margin-top: 6px; color: #000000;">
        <div style="text-transform: capitalize; font-weight: 800;">${formattedFullDate}</div>
        <div style="font-weight: 900; margin: 2px 0;">Folio: ${ticket_code}</div>
        <div style="font-weight: 800; margin-top: 3px;">* Hecho con amor por Ohana *</div>
      </div>
    </div>
  `;
};

/**
 * Imprime directamente la Boleta de Venta y la Comanda de Cocina juntas sin necesidad de abrir un modal
 */
export const printBothTicketsDirectly = (orderData) => {
  if (!orderData) return;
  const boletaHTML = buildBoletaHTML(orderData);
  const comandaHTML = buildComandaHTML(orderData);

  const combinedHTML = `
    ${boletaHTML}
    <div style="page-break-before: always; height: 10mm;"></div>
    ${comandaHTML}
  `;

  printThermalTicket(combinedHTML, `Boleta_y_Comanda_${orderData.ticket_code || 'Ohana'}`);
};

const getPrintHTML = (contentHtml, title) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          width: 74mm;
          margin: 0 auto;
          padding: 3mm 1mm;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 11px;
          line-height: 1.35;
          color: #000000;
          background: #ffffff;
        }
        .dolce-header { text-align: center; margin-bottom: 6px; }
        .dolce-logo { max-width: 140px; max-height: 58px; object-fit: contain; margin: 0 auto 4px auto; display: block; }
        .dolce-ruc { font-size: 9.5px; font-weight: 700; color: #000; }
        .dolce-address { font-size: 9px; color: #111; text-transform: uppercase; }
        .dolce-dashed-line { border-top: 1px dashed #000; margin: 6px 0; }
        .dolce-equal-line { font-size: 10px; letter-spacing: -0.05em; text-align: center; margin: 4px 0; color: #000; }
        .dolce-doc-box { text-align: center; margin: 3px 0; }
        .dolce-doc-title { font-size: 12.5px; font-weight: 900; color: #000; }
        .dolce-folio { font-size: 11px; font-weight: 800; margin: 1px 0; }
        .dolce-datetime { font-size: 9.5px; color: #222; }
        .dolce-items-table { width: 100%; border-collapse: collapse; margin: 5px 0; }
        .dolce-items-table th { font-size: 9.5px; font-weight: 800; color: #000; padding: 3px 0; text-transform: uppercase; }
        .dolce-items-table td { padding: 3px 0; font-size: 10.5px; vertical-align: top; }
        .dolce-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; font-weight: 900; color: #000; padding: 3px 0; }
        .dolce-meta-box { font-size: 10.5px; margin: 4px 0; }
        .dolce-meta-row { display: flex; justify-content: space-between; margin: 2px 0; }
        .dolce-qr-box { border: 1px dashed #000; border-radius: 4px; padding: 8px 6px; text-align: center; margin-top: 6px; }
        .dolce-qr-title { font-size: 10px; font-weight: 900; color: #000; margin-bottom: 2px; }
        .dolce-qr-desc { font-size: 8.5px; color: #333; line-height: 1.25; margin-bottom: 5px; }
        .dolce-qr-img-wrapper { display: flex; justify-content: center; margin: 3px 0; }
        .dolce-qr-img { width: 95px; height: 95px; display: block; margin: 0 auto; }
        .dolce-turn-box { border: 1.5px solid #000; border-radius: 4px; padding: 6px 8px; margin-top: 8px; background: #fff; text-align: center; }
        .dolce-turn-sub { font-size: 8.5px; font-weight: 800; letter-spacing: 0.5px; color: #000; }
        .dolce-turn-num { font-size: 16px; font-weight: 900; color: #000; margin: 2px 0; }
        .dolce-turn-note { font-size: 8px; color: #333; }
        .dolce-footer { text-align: center; font-size: 9px; color: #333; margin-top: 8px; }
        /* COMANDA COCINA - MÁXIMA NITIDEZ TÉRMICA Y FUENTE OSCURA */
        .dolce-comanda-container {
          font-family: Arial, 'Segoe UI', Tahoma, sans-serif !important;
          font-weight: 800 !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .dolce-comanda-container * {
          color: #000000 !important;
        }
        .dolce-comanda-header {
          text-align: center;
          border-top: 2.5px solid #000000;
          padding-top: 6px;
        }
        .dolce-comanda-title {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #000000 !important;
        }
        .dolce-comanda-sub {
          font-size: 12px;
          font-weight: 800;
          color: #000000 !important;
          text-transform: uppercase;
        }
        .dolce-turn-box-outline {
          display: inline-block;
          border: 2px solid #000000;
          padding: 3px 12px;
          font-size: 15px;
          font-weight: 900;
          margin: 6px 0;
          color: #000000 !important;
        }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
  </html>
`;

export const PrintTicketModal = ({ isOpen, onClose, orderData }) => {
  const [activeTab, setActiveTab] = useState('boleta'); // 'boleta' | 'comanda'

  if (!isOpen || !orderData) return null;

  const rawTicketCode = orderData.ticket_code || 'B001-0001';
  const ticketCode = rawTicketCode.endsWith('-0000') ? rawTicketCode.replace(/-0000$/, '-0001') : rawTicketCode;
  const docType = orderData.docType || 'boleta';

  // Disparar diálogo de impresión nativo del navegador
  const handlePrintBoleta = () => {
    printThermalTicket(buildBoletaHTML(orderData), `Boleta_${ticketCode}`);
  };

  const handlePrintComanda = () => {
    printThermalTicket(buildComandaHTML(orderData), `Comanda_${ticketCode}`);
  };

  const handlePrintAmbos = () => {
    printBothTicketsDirectly(orderData);
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Imprimir Comprobante y Comanda"
      maxWidth="480px"
    >
      <div className="print-modal-container">
        {/* Pestañas: Boleta vs Comanda */}
        <div className="print-tabs-header">
          <button
            type="button"
            className={`print-tab-btn ${activeTab === 'boleta' ? 'active tab-boleta' : ''}`}
            onClick={() => setActiveTab('boleta')}
          >
            <FileText size={16} />
            <span>{docType === 'factura' ? 'Factura Electrónica' : (docType === 'nota' || docType === 'nota_venta') ? 'Nota de Venta' : 'Boleta de Venta'}</span>
          </button>
          <button
            type="button"
            className={`print-tab-btn ${activeTab === 'comanda' ? 'active tab-comanda' : ''}`}
            onClick={() => setActiveTab('comanda')}
          >
            <ChefHat size={16} />
            <span>Comanda de Cocina</span>
          </button>
        </div>

        {/* Vista previa en ticket térmico */}
        <div className="thermal-ticket-wrapper">
          {activeTab === 'boleta' ? (
            <div className="dolce-ticket-container" dangerouslySetInnerHTML={{ __html: buildBoletaHTML(orderData) }} />
          ) : (
            <div className="dolce-ticket-container" dangerouslySetInnerHTML={{ __html: buildComandaHTML(orderData) }} />
          )}
        </div>

        {/* Acciones para disparar la ventana de impresión nativa */}
        <div className="print-actions-grid">
          <div className="print-actions-left">
            <button
              type="button"
              className="btn-print-action blue"
              onClick={handlePrintBoleta}
              title={`Abrir diálogo de impresión para ${docType === 'factura' ? 'la Factura' : (docType === 'nota' || docType === 'nota_venta') ? 'la Nota de Venta' : 'la Boleta'}`}
            >
              <Printer size={16} />
              <span>Imprimir {docType === 'factura' ? 'Factura' : (docType === 'nota' || docType === 'nota_venta') ? 'Nota de Venta' : 'Boleta'}</span>
            </button>

            <button
              type="button"
              className="btn-print-action orange"
              onClick={handlePrintComanda}
              title="Abrir diálogo de impresión para la Comanda"
            >
              <ChefHat size={16} />
              <span>Imprimir Comanda</span>
            </button>

            <button
              type="button"
              className="btn-print-action secondary"
              onClick={handlePrintAmbos}
              title="Imprimir Boleta y Comanda juntas"
            >
              <Layers size={16} />
              <span>Imprimir Ambos</span>
            </button>
          </div>

          <button
            type="button"
            className="btn-print-action secondary"
            onClick={onClose}
          >
            <span>Cerrar</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PrintTicketModal;
