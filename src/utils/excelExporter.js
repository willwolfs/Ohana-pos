/**
 * Generador de reportes de Excel para Ohana POS
 * Genera un archivo Excel compatible con Microsoft Excel, Google Sheets y LibreOffice
 * con formato enriquecido, cabeceras estilizadas y totales numéricos.
 */

export const exportSalesToExcel = ({
  sales = [],
  title = 'Reporte de Ventas',
  periodLabel = 'General',
  metrics = null,
}) => {
  const sanitize = (text) => {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const currentDate = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalSoles = sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

  // Generamos un archivo Excel basado en XML Spreadsheet / HTML con estilos CSS para máxima fidelidad
  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Ventas Ohana</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .title-cell { font-size: 16pt; font-weight: bold; color: #0f172a; }
        .meta-cell { font-size: 9pt; color: #475569; }
        .header-col { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: center; border: 1px solid #000000; padding: 8px; }
        .header-total { background-color: #ea580c; color: #ffffff; font-weight: bold; text-align: right; }
        .data-row td { border: 0.5pt solid #cbd5e1; font-size: 9.5pt; padding: 6px; }
        .data-text { text-align: left; mso-number-format:"\\@"; }
        .data-center { text-align: center; }
        .data-num { text-align: right; mso-number-format:"0\\.00"; }
        .data-currency { text-align: right; font-weight: bold; mso-number-format:"\\S\\/\\ #\\,##0\\.00"; }
        .kpi-table { margin-bottom: 12px; }
        .kpi-title { font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1; }
        .kpi-val { text-align: center; font-weight: bold; border: 1px solid #cbd5e1; }
        .footer-total-label { font-weight: bold; font-size: 11pt; text-align: right; background-color: #f8fafc; border-top: 2pt solid #0f172a; }
        .footer-total-val { font-weight: bold; font-size: 12pt; color: #ea580c; text-align: right; background-color: #f8fafc; border-top: 2pt solid #0f172a; mso-number-format:"\\S\\/\\ #\\,##0\\.00"; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="10" class="title-cell">OHANA SUSHI - REPORTE DETALLADO DE VENTAS</td>
        </tr>
        <tr>
          <td colspan="10" class="meta-cell">Periodo: <b>${sanitize(periodLabel)}</b> | Fecha de exportación: ${sanitize(currentDate)}</td>
        </tr>
        <tr></tr>

        <!-- Resumen de KPIs -->
        <tr>
          <td colspan="2" class="kpi-title">Total Comprobantes:</td>
          <td class="kpi-val">${sales.length}</td>
          <td colspan="2" class="kpi-title">Recaudado (Pagadas):</td>
          <td colspan="2" class="kpi-val">S/ ${(metrics ? metrics.pagadasMonto : totalSoles).toFixed(2)}</td>
          <td class="kpi-title">Total Facturado:</td>
          <td colspan="2" class="kpi-val" style="color: #059669; font-size: 11pt;">S/ ${totalSoles.toFixed(2)}</td>
        </tr>
        <tr></tr>

        <!-- Cabecera de la tabla -->
        <thead>
          <tr>
            <th class="header-col">N° Comprobante</th>
            <th class="header-col">Tipo Comprobante</th>
            <th class="header-col">Cliente</th>
            <th class="header-col">DNI / RUC</th>
            <th class="header-col">Modalidad</th>
            <th class="header-col">Fecha y Hora</th>
            <th class="header-col">Método de Pago</th>
            <th class="header-col">Estado Venta</th>
            <th class="header-col">Estado SUNAT</th>
            <th class="header-col header-total">Total (S/)</th>
          </tr>
        </thead>
        <tbody>
          ${sales.length === 0 ? `
            <tr>
              <td colspan="10" style="text-align: center; color: #64748b; padding: 20px;">
                No hay ventas registradas en este periodo
              </td>
            </tr>
          ` : sales.map((sale) => `
            <tr class="data-row">
              <td class="data-text" style="font-weight: bold;">${sanitize(sale.number)}</td>
              <td class="data-center">${sanitize(sale.docType)}</td>
              <td class="data-text">${sanitize(sale.customer)}</td>
              <td class="data-center">${sanitize(sale.docNumber || '-')}</td>
              <td class="data-center">${sanitize(sale.type || sale.modality || 'Salón')}</td>
              <td class="data-center">${sanitize(sale.date ? new Date(sale.date).toLocaleString('es-PE') : '-')}</td>
              <td class="data-center" style="font-weight: 600;">${sanitize(sale.payment)}</td>
              <td class="data-center">${sanitize(sale.status)}</td>
              <td class="data-center">${sanitize(sale.sunat)}</td>
              <td class="data-currency">${(Number(sale.total) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="9" class="footer-total-label">MONTO TOTAL FACTURADO:</td>
            <td class="footer-total-val">S/ ${totalSoles.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  // Crear Blob y disparar descarga
  const blob = new Blob(['\ufeff' + template], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  // Limpiar nombre para archivo
  const cleanPeriod = periodLabel.replace(/[\s/\\:*?"<>|]/g, '_');
  a.download = `Ohana_Reporte_Ventas_${cleanPeriod}.xls`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportExpensesToExcel = ({
  expenses = [],
  periodLabel = 'General',
  metrics = null,
}) => {
  const sanitize = (text) => {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const currentDate = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalGastos = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .title-cell { font-size: 16pt; font-weight: bold; color: #0f172a; }
        .meta-cell { font-size: 9pt; color: #475569; }
        .header-col { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: center; border: 1px solid #000000; padding: 8px; }
        .data-row td { border: 0.5pt solid #cbd5e1; font-size: 9.5pt; padding: 6px; }
        .data-currency { text-align: right; color: #dc2626; font-weight: 600; }
        .data-center { text-align: center; }
        .data-text { text-align: left; }
        .footer-total-label { background-color: #f1f5f9; font-weight: bold; text-align: right; border: 1px solid #94a3b8; font-size: 10pt; padding: 8px; }
        .footer-total-val { background-color: #fee2e2; color: #b91c1c; font-weight: bold; text-align: right; border: 1px solid #94a3b8; font-size: 11pt; padding: 8px; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="7" class="title-cell">OHANA RESTOBAR - CONTROL DE GASTOS OPERATIVOS</td>
        </tr>
        <tr>
          <td colspan="7" class="meta-cell">Periodo: <b>${sanitize(periodLabel)}</b> | Exportado el: ${sanitize(currentDate)} | Total de Registros: ${expenses.length}</td>
        </tr>
        <tr></tr>
        <thead>
          <tr>
            <th class="header-col" style="width: 140px;">FECHA</th>
            <th class="header-col" style="width: 250px;">CONCEPTO / MOTIVO</th>
            <th class="header-col" style="width: 160px;">CATEGORÍA</th>
            <th class="header-col" style="width: 140px;">MÉTODO PAGO</th>
            <th class="header-col" style="width: 160px;">Nº COMPROBANTE / REF</th>
            <th class="header-col" style="width: 140px;">REGISTRADO POR</th>
            <th class="header-col" style="width: 120px;">MONTO (S/)</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.length === 0 ? `
            <tr>
              <td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">
                No hay gastos registrados en este periodo
              </td>
            </tr>
          ` : expenses.map((exp) => `
            <tr class="data-row">
              <td class="data-center">${sanitize(exp.date ? new Date(exp.date).toLocaleString('es-PE') : '-')}</td>
              <td class="data-text" style="font-weight: 600;">${sanitize(exp.concept)}</td>
              <td class="data-center">${sanitize(exp.category)}</td>
              <td class="data-center">${sanitize(exp.payment_method || 'Efectivo')}</td>
              <td class="data-center">${sanitize(exp.voucher_number || '-')}</td>
              <td class="data-center">${sanitize(exp.user_name || 'Admin')}</td>
              <td class="data-currency">S/ ${(Number(exp.amount) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="footer-total-label">TOTAL GASTOS:</td>
            <td class="footer-total-val">S/ ${totalGastos.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + template], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanPeriod = periodLabel.replace(/[\s/\\:*?"<>|]/g, '_');
  a.download = `Ohana_Gastos_Operativos_${cleanPeriod}.xls`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportCustomersToExcel = ({
  customers = [],
  title = 'Directorio de Clientes - Ohana Makis & Sushi Bar',
}) => {
  const sanitize = (text) => {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const currentDate = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalSpentAll = customers.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0);
  const totalVisitsAll = customers.reduce((acc, c) => acc + (Number(c.visits) || 0), 0);

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .title-cell { font-size: 15pt; font-weight: bold; color: #0f172a; }
        .meta-cell { font-size: 9pt; color: #475569; }
        .header-col { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: center; border: 1px solid #000000; padding: 8px; }
        .header-total { background-color: #ea580c; color: #ffffff; font-weight: bold; text-align: right; }
        .data-row td { border: 0.5pt solid #cbd5e1; font-size: 9.5pt; padding: 6px; }
        .data-center { text-align: center; }
        .data-currency { text-align: right; font-weight: 600; color: #0f172a; }
        .footer-total-label { background-color: #f1f5f9; font-weight: bold; text-align: right; font-size: 10pt; padding: 8px; border-top: 2px solid #0f172a; }
        .footer-total-val { background-color: #ea580c; color: #ffffff; font-weight: bold; text-align: right; font-size: 10pt; padding: 8px; border-top: 2px solid #0f172a; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="9" class="title-cell">${sanitize(title)}</td>
        </tr>
        <tr>
          <td colspan="9" class="meta-cell">Fecha de Emisión: ${currentDate} | Total Registros: ${customers.length}</td>
        </tr>
        <tr><td colspan="9"></td></tr>
        <thead>
          <tr>
            <th class="header-col">CLIENTE</th>
            <th class="header-col">RAZÓN SOCIAL</th>
            <th class="header-col">TIPO DOC</th>
            <th class="header-col">N° DOCUMENTO</th>
            <th class="header-col">TELÉFONO</th>
            <th class="header-col">EMAIL</th>
            <th class="header-col">CATEGORÍA</th>
            <th class="header-col">PEDIDOS / VISITAS</th>
            <th class="header-col">MAKI PREFERIDO</th>
            <th class="header-col header-total">TOTAL CONSUMIDO</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map((c) => `
            <tr class="data-row">
              <td style="font-weight: 600;">${sanitize(c.name)}</td>
              <td>${sanitize(c.business_name || c.razon_social || '-')}</td>
              <td class="data-center">${sanitize(c.doc_type || 'DNI')}</td>
              <td class="data-center">${sanitize(c.doc_number || '-')}</td>
              <td class="data-center">${sanitize(c.phone || '-')}</td>
              <td>${sanitize(c.email || '-')}</td>
              <td class="data-center">${sanitize(c.category || 'Nuevo')}</td>
              <td class="data-center">${Number(c.visits) || 0}</td>
              <td>${sanitize(c.favorite_roll || '-')}</td>
              <td class="data-currency">S/ ${(Number(c.total_spent) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7" class="footer-total-label">TOTAL GENERAL (${customers.length} CLIENTES):</td>
            <td class="data-center" style="font-weight: bold; background-color: #f1f5f9;">${totalVisitsAll} visitas</td>
            <td class="footer-total-label"></td>
            <td class="footer-total-val">S/ ${totalSpentAll.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + template], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `Ohana_Directorio_Clientes_${new Date().toISOString().split('T')[0]}.xls`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


