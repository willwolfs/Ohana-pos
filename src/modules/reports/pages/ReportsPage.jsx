import React, { useState } from 'react';
import '../styles/ReportsPage.css';
import {
  ChevronDown,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Utensils,
  Briefcase,
} from 'lucide-react';

export const ReportsPage = () => {
  // Estados para filtros
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [currency, setCurrency] = useState('USD'); // 'USD' ($) o 'PEN' (S/)
  const [chartView, setChartView] = useState('month');
  const [incomeFilter, setIncomeFilter] = useState('all');
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [activeMonth, setActiveMonth] = useState('Mar');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [businessType, setBusinessType] = useState('general'); // 'general' | 'ohana'

  // Función para formatear moneda
  const formatMoney = (val) => {
    const symbol = currency === 'USD' ? '$' : 'S/ ';
    return `${symbol}${val.toLocaleString('en-US')}`;
  };

  const handleExport = (source = 'General') => {
    setToastMessage(`Reporte ${source} exportado exitosamente en formato Excel / PDF`);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3500);
  };

  // Datos para el gráfico mensual (12 meses con altura proporcional de ingresos y gastos)
  const monthlyData = [
    { month: 'Jan', label: 'Ene', income: 20000, expenses: 8000 },
    { month: 'Feb', label: 'Feb', income: 23500, expenses: 10500 },
    { month: 'Mar', label: 'Mar', income: 26500, expenses: 13000 },
    { month: 'Apr', label: 'Abr', income: 26000, expenses: 14500 },
    { month: 'May', label: 'May', income: 29500, expenses: 12500 },
    { month: 'Jun', label: 'Jun', income: 28000, expenses: 18500 },
    { month: 'Jul', label: 'Jul', income: 26000, expenses: 15500 },
    { month: 'Aug', label: 'Ago', income: 25000, expenses: 14000 },
    { month: 'Sep', label: 'Sep', income: 23500, expenses: 13000 },
    { month: 'Oct', label: 'Oct', income: 21000, expenses: 12000 },
    { month: 'Nov', label: 'Nov', income: 15000, expenses: 10000 },
    { month: 'Dec', label: 'Dic', income: 12500, expenses: 8500 },
  ];

  // Desglose de Ingresos
  const incomeItemsGeneral = [
    { name: 'Proyectos de Clientes', en: 'Client Projects', value: 34200 },
    { name: 'Consultoría y Asesorías', en: 'Consulting', value: 9300 },
    { name: 'Suscripciones y Planes', en: 'Subscriptions', value: 6240 },
    { name: 'Ingresos por Afiliados', en: 'Affiliate Revenue', value: 2600 },
  ];

  const incomeItemsOhana = [
    { name: 'Consumo Salón & Sushi Bar', en: 'Dine-in Sales', value: 34200 },
    { name: 'Delivery (App propia & Canales)', en: 'Delivery & Pick-up', value: 9300 },
    { name: 'Catering & Eventos Privados', en: 'Catering Events', value: 6240 },
    { name: 'Venta de Bebidas & Coctelería', en: 'Bar & Beverages', value: 2600 },
  ];

  // Desglose de Gastos
  const expenseItemsGeneral = [
    { name: 'Salarios y Nómina', en: 'Salaries', value: 34200 },
    { name: 'Marketing y Publicidad', en: 'Marketing', value: 9300 },
    { name: 'Software y Licencias', en: 'Software', value: 6240 },
    { name: 'Alquiler de Local / Oficinas', en: 'Office Rent', value: 2600 },
    { name: 'Servicios Básicos (Luz/Agua)', en: 'Utilities', value: 720 },
    { name: 'Otros Gastos Operativos', en: 'Other', value: 700 },
  ];

  const expenseItemsOhana = [
    { name: 'Planilla de Cocina y Salón', en: 'Staff & Chefs', value: 34200 },
    { name: 'Compra de Insumos & Mariscos', en: 'Fish & Produce', value: 9300 },
    { name: 'Sistema POS & Comanderas', en: 'POS Software', value: 6240 },
    { name: 'Alquiler del Local Gastronómico', en: 'Restaurant Rent', value: 2600 },
    { name: 'Servicios (Luz comercial, Gas)', en: 'Gas & Power', value: 720 },
    { name: 'Empaques y Descartables', en: 'Packaging & Misc', value: 700 },
  ];

  // Facturas y Comprobantes (Invoices & Bills)
  const invoicesGeneral = [
    {
      id: '1',
      company: 'Google Sales',
      logoClass: 'logo-google',
      logoInitial: 'G',
      invoiceId: '#INV12501',
      customer: 'Robert Fox',
      service: 'Freelancing / Desarrollo',
      amount: 150.0,
      date: '10 Jun, 2024',
      status: 'Paid',
      statusLabel: 'Pagado',
    },
    {
      id: '2',
      company: 'Flipchart sales',
      logoClass: 'logo-flipkart',
      logoInitial: 'F',
      invoiceId: '#INV12502',
      customer: 'Nicolas Cage',
      service: 'Entretenimiento & Media',
      amount: 100.0,
      date: '07 Jun, 2024',
      status: 'Pending',
      statusLabel: 'Pendiente',
    },
    {
      id: '3',
      company: 'Spotibaba sales',
      logoClass: 'logo-spotify',
      logoInitial: 'S',
      invoiceId: '#INV12503',
      customer: 'Jeson Momoa',
      service: 'Licencia Multimedia',
      amount: 160.0,
      date: '01 Jun, 2024',
      status: 'Overdue',
      statusLabel: 'Vencido',
    },
    {
      id: '4',
      company: 'Amazon Web Srv',
      logoClass: 'logo-ohana',
      logoInitial: 'A',
      invoiceId: '#INV12504',
      customer: 'Esther Howard',
      service: 'Infraestructura Cloud',
      amount: 420.0,
      date: '28 May, 2024',
      status: 'Paid',
      statusLabel: 'Pagado',
    },
  ];

  const invoicesOhana = [
    {
      id: '1',
      company: 'Ohana Salón Central',
      logoClass: 'logo-ohana',
      logoInitial: 'O',
      invoiceId: '#FAC-001-0492',
      customer: 'Robert Fox',
      service: 'Banquete Dúo Makis & Bebidas',
      amount: 150.0,
      date: '10 Jun, 2024',
      status: 'Paid',
      statusLabel: 'Pagado',
    },
    {
      id: '2',
      company: 'Rappi Delivery',
      logoClass: 'logo-rappi',
      logoInitial: 'R',
      invoiceId: '#PED-98231',
      customer: 'Nicolas Cage',
      service: 'Combo Ohana Familiar x40 Cortes',
      amount: 100.0,
      date: '07 Jun, 2024',
      status: 'Pending',
      statusLabel: 'Pendiente',
    },
    {
      id: '3',
      company: 'Catering Corporativo',
      logoClass: 'logo-google',
      logoInitial: 'C',
      invoiceId: '#BOL-002-1823',
      customer: 'Jeson Momoa',
      service: 'Barra Libre de Sushi & Bar',
      amount: 160.0,
      date: '01 Jun, 2024',
      status: 'Overdue',
      statusLabel: 'Vencido',
    },
    {
      id: '4',
      company: 'PedidosYa Partner',
      logoClass: 'logo-flipkart',
      logoInitial: 'P',
      invoiceId: '#FAC-001-0495',
      customer: 'Esther Howard',
      service: 'Box Degustación Premium',
      amount: 240.0,
      date: '28 May, 2024',
      status: 'Paid',
      statusLabel: 'Pagado',
    },
  ];

  const currentIncomes = businessType === 'ohana' ? incomeItemsOhana : incomeItemsGeneral;
  const currentExpenses = businessType === 'ohana' ? expenseItemsOhana : expenseItemsGeneral;
  const currentInvoices = businessType === 'ohana' ? invoicesOhana : invoicesGeneral;

  const maxChartVal = 32000;

  return (
    <div className="pnl-container">
      {/* =========================================================
          HEADER: TÍTULO, SELECTORES PILL Y BOTÓN EXPORTAR
          ========================================================= */}
      <div className="pnl-header">
        <div className="pnl-header-left">
          <button className="pnl-back-btn" title="Volver al panel" onClick={() => window.history.back()}>
            <ArrowLeft size={18} />
          </button>

          <div className="pnl-title-wrap">
            <h1 className="pnl-title">Pérdidas y Ganancias</h1>
            <p className="pnl-subtitle">Estado de resultados, desglose financiero y facturación</p>
          </div>

          <div className="pnl-filters-bar">
            {/* Filtro Clientes */}
            <div className="pnl-dropdown-pill">
              <select
                className="pnl-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="all">Todos los Clientes</option>
                <option value="vip">Clientes Frecuentes / VIP</option>
                <option value="corporate">Cuentas Corporativas</option>
                <option value="channel">Canales de Venta</option>
              </select>
              <ChevronDown size={14} className="pnl-select-chevron" />
            </div>

            {/* Filtro Período */}
            <div className="pnl-dropdown-pill">
              <select
                className="pnl-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="30d">Últimos 30 Días</option>
                <option value="7d">Últimos 7 Días</option>
                <option value="this-month">Este Mes</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Año 2024</option>
              </select>
              <ChevronDown size={14} className="pnl-select-chevron" />
            </div>

            {/* Selector de Moneda */}
            <div className="pnl-dropdown-pill">
              <select
                className="pnl-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">Moneda (USD $)</option>
                <option value="PEN">Soles (PEN S/)</option>
              </select>
              <ChevronDown size={14} className="pnl-select-chevron" />
            </div>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="pnl-header-actions">
          {/* Selector de contexto para empresa (Cualquier Empresa vs Ohana) */}
          <div className="pnl-business-mode-toggle" title="Cambiar datos de muestra">
            <button
              className={`pnl-mode-btn ${businessType === 'general' ? 'active' : ''}`}
              onClick={() => setBusinessType('general')}
            >
              <Briefcase size={12} style={{ display: 'inline', marginRight: 4 }} />
              Cualquier Empresa
            </button>
            <button
              className={`pnl-mode-btn ${businessType === 'ohana' ? 'active' : ''}`}
              onClick={() => setBusinessType('ohana')}
            >
              <Utensils size={12} style={{ display: 'inline', marginRight: 4 }} />
              Ohana Makis
            </button>
          </div>

          <button className="pnl-btn-export" onClick={() => handleExport('Pérdidas y Ganancias')}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          TOP 4 KPI CARDS (COLORES Y ESTILO EXACTO DEL DISEÑO)
          ========================================================= */}
      <div className="pnl-kpi-grid">
        {/* Card 1: Ingresos Totales */}
        <div className="pnl-kpi-card pnl-card-revenue">
          <div className="pnl-kpi-badge">
            <span className="pnl-kpi-icon-pill icon-purple">
              <DollarSign size={13} />
            </span>
            <span>Ingresos Totales</span>
          </div>
          <div className="pnl-kpi-value">{formatMoney(52340)}</div>
        </div>

        {/* Card 2: Gastos Totales */}
        <div className="pnl-kpi-card pnl-card-expenses">
          <div className="pnl-kpi-badge">
            <span className="pnl-kpi-icon-pill icon-pink">
              <DollarSign size={13} />
            </span>
            <span>Gastos Totales</span>
          </div>
          <div className="pnl-kpi-value">{formatMoney(21920)}</div>
        </div>

        {/* Card 3: Ganancia Bruta */}
        <div className="pnl-kpi-card pnl-card-profit">
          <div className="pnl-kpi-badge">
            <span className="pnl-kpi-icon-pill icon-pink">
              <DollarSign size={13} />
            </span>
            <span>Ganancia Bruta</span>
          </div>
          <div className="pnl-kpi-value">{formatMoney(30420)}</div>
        </div>

        {/* Card 4: Margen de Ganancia Neta */}
        <div className="pnl-kpi-card pnl-card-margin">
          <div className="pnl-kpi-badge">
            <span className="pnl-kpi-icon-pill icon-magenta">
              <Percent size={12} />
            </span>
            <span>Margen de Ganancia Neto</span>
          </div>
          <div className="pnl-kpi-value">58%</div>
        </div>
      </div>

      {/* =========================================================
          MIDDLE SECTION: CHART + INCOME TABLE + EXPENSE TABLE
          ========================================================= */}
      <div className="pnl-middle-grid">
        {/* Gráfico de Ganancias vs Gastos */}
        <div className="pnl-box">
          <div className="pnl-chart-header">
            <div>
              <div className="pnl-chart-title">Gráfico de Ganancias vs Gastos</div>
              <div className="pnl-chart-metric-row">
                <span className="pnl-chart-metric">{formatMoney(275)}</span>
                <span className="pnl-trend-badge trend-up">
                  18% <ArrowUpRight size={12} />
                </span>
              </div>
            </div>

            <div className="pnl-dropdown-pill">
              <select
                className="pnl-chart-filter-select"
                value={chartView}
                onChange={(e) => setChartView(e.target.value)}
              >
                <option value="month">Por Mes</option>
                <option value="quarter">Por Trimestre</option>
              </select>
              <ChevronDown size={13} className="pnl-select-chevron" />
            </div>
          </div>

          {/* Gráfico de barras apiladas elegante */}
          <div className="pnl-chart-canvas-wrap">
            {/* Eje Y */}
            <div className="pnl-chart-y-axis">
              <span>{formatMoney(30000)}</span>
              <span>{formatMoney(25000)}</span>
              <span>{formatMoney(20000)}</span>
              <span>{formatMoney(15000)}</span>
              <span>{formatMoney(10000)}</span>
              <span>{formatMoney(5000)}</span>
              <span>0</span>
            </div>

            {/* Contenedor de barras */}
            <div className="pnl-chart-bars-container">
              {/* Líneas guía horizontales */}
              <div className="pnl-chart-gridlines">
                <div className="pnl-gridline"></div>
                <div className="pnl-gridline"></div>
                <div className="pnl-gridline"></div>
                <div className="pnl-gridline"></div>
                <div className="pnl-gridline"></div>
                <div className="pnl-gridline"></div>
                <div className="pnl-gridline"></div>
              </div>

              {/* Barras de cada mes */}
              {monthlyData.map((item) => {
                const expenseHeightPercent = (item.expenses / maxChartVal) * 100;
                const profitHeightPercent = ((item.income - item.expenses) / maxChartVal) * 100;
                const isSelected = activeMonth === item.month;

                return (
                  <div
                    key={item.month}
                    className={`pnl-bar-col ${isSelected ? 'active' : ''}`}
                    onClick={() => setActiveMonth(item.month)}
                  >
                    {/* Tooltip */}
                    <div className="pnl-bar-tooltip">
                      <strong>{item.label} 2024</strong>
                      <div>Ingresos: {formatMoney(item.income)}</div>
                      <div>Gastos: {formatMoney(item.expenses)}</div>
                      <div>Ganancia: {formatMoney(item.income - item.expenses)}</div>
                    </div>

                    <div className="pnl-bar-stack">
                      {/* Porción Gastos (Abajo) */}
                      <div
                        className="pnl-bar-bottom-expense"
                        style={{ height: `${expenseHeightPercent}%` }}
                      ></div>
                      {/* Porción Ganancia (Arriba) */}
                      <div
                        className="pnl-bar-top-profit"
                        style={{ height: `${profitHeightPercent}%` }}
                      ></div>
                    </div>

                    <span className="pnl-bar-label">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabla de Desglose de Ingresos */}
        <div className="pnl-box">
          <div className="pnl-side-header">
            <div>
              <div className="pnl-side-title">Desglose de Ingresos</div>
              <div className="pnl-side-metric-row">
                <span className="pnl-side-metric">{formatMoney(52340)}</span>
                <span className="pnl-trend-badge trend-up">
                  18% <ArrowUpRight size={12} />
                </span>
              </div>
            </div>

            <div className="pnl-dropdown-pill">
              <select
                className="pnl-chart-filter-select"
                value={incomeFilter}
                onChange={(e) => setIncomeFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="direct">Directos</option>
              </select>
              <ChevronDown size={13} className="pnl-select-chevron" />
            </div>
          </div>

          <div className="pnl-side-list">
            {currentIncomes.map((item, idx) => (
              <div key={idx} className="pnl-side-item">
                <span className="pnl-side-name">{item.name}</span>
                <span className="pnl-side-value">{formatMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla de Desglose de Gastos */}
        <div className="pnl-box">
          <div className="pnl-side-header">
            <div>
              <div className="pnl-side-title">Desglose de Gastos</div>
              <div className="pnl-side-metric-row">
                <span className="pnl-side-metric">{formatMoney(21920)}</span>
                <span className="pnl-trend-badge trend-down">
                  12% <ArrowDownRight size={12} />
                </span>
              </div>
            </div>

            <div className="pnl-dropdown-pill">
              <select
                className="pnl-chart-filter-select"
                value={expenseFilter}
                onChange={(e) => setExpenseFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="fixed">Fijos</option>
              </select>
              <ChevronDown size={13} className="pnl-select-chevron" />
            </div>
          </div>

          <div className="pnl-side-list">
            {currentExpenses.map((item, idx) => (
              <div key={idx} className="pnl-side-item">
                <span className="pnl-side-name">{item.name}</span>
                <span className="pnl-side-value">{formatMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================
          BOTTOM SECTION: FACTURAS Y COMPROBANTES (INVOICES & BILLS)
          ========================================================= */}
      <div className="pnl-table-card">
        <div className="pnl-table-header">
          <h2 className="pnl-table-title">Facturas y Comprobantes</h2>
          <button className="pnl-btn-export" onClick={() => handleExport('Facturas y Comprobantes')}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
        </div>

        <div className="pnl-table-responsive">
          <table className="pnl-table">
            <thead>
              <tr>
                <th>Empresa / Canal</th>
                <th>ID Comprobante</th>
                <th>Nombre del Cliente</th>
                <th>Servicio / Concepto</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {currentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div className="pnl-company-cell">
                      <span className={`pnl-company-logo ${inv.logoClass}`}>
                        {inv.logoInitial}
                      </span>
                      <span>{inv.company}</span>
                    </div>
                  </td>
                  <td>
                    <span className="pnl-invoice-id">{inv.invoiceId}</span>
                  </td>
                  <td>
                    <span className="pnl-customer-name">{inv.customer}</span>
                  </td>
                  <td>
                    <span className="pnl-service-name">{inv.service}</span>
                  </td>
                  <td>
                    <span className="pnl-amount">{formatMoney(inv.amount)}</span>
                  </td>
                  <td>
                    <span className="pnl-date">{inv.date}</span>
                  </td>
                  <td>
                    <span
                      className={`pnl-status-pill ${
                        inv.status === 'Paid'
                          ? 'status-paid'
                          : inv.status === 'Pending'
                          ? 'status-pending'
                          : 'status-overdue'
                      }`}
                    >
                      {inv.status === 'Paid' && <CheckCircle2 size={13} />}
                      {inv.status === 'Pending' && <Clock size={13} />}
                      {inv.status === 'Overdue' && <AlertTriangle size={13} />}
                      {inv.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Toast */}
      {showToast && (
        <div className="pnl-export-toast">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
