import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../../components/common/DataTable';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { formatCurrency } from '../../../utils/formatCurrency';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  Filter,
  RotateCcw,
  Boxes,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Scale,
  Calendar,
  UserCheck,
  CheckCircle2,
  Trash2,
  History,
  Sparkles,
} from 'lucide-react';

const KARDEX_STORAGE_KEY = 'ohana_kardex';
const SUPPLIES_STORAGE_KEY = 'ohana_supplies';

const MOVEMENT_TYPES = {
  IN_PURCHASE: { label: 'Ingreso (Compra)', sign: 1, class: 'in-purchase', isEntry: true },
  OUT_SALE: { label: 'Salida (Venta POS)', sign: -1, class: 'out-sale', isEntry: false },
  OUT_WASTE: { label: 'Merma Operativa', sign: -1, class: 'out-waste', isEntry: false },
  OUT_DAMAGE: { label: 'Desperdicio / Vencimiento', sign: -1, class: 'out-damage', isEntry: false },
  ADJUST_POS: { label: 'Ajuste Sobrante (+)', sign: 1, class: 'adjust', isEntry: true },
  ADJUST_NEG: { label: 'Ajuste Faltante (-)', sign: -1, class: 'adjust', isEntry: false },
};

// Formato de fecha y hora: ej. 18/10/26 2:30 pm
const formatKardexDateTime = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
};

const DEFAULT_SAMPLE_MOVEMENTS = [];

export const KardexPage = () => {
  // Lista de movimientos (sin datos de prueba por defecto)
  const [movements, setMovements] = useState(() => {
    try {
      const saved = localStorage.getItem(KARDEX_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Si contenía los movimientos de muestra iniciales (k-01 a k-05), limpiarlos
        const isMockSample =
          Array.isArray(parsed) &&
          parsed.some((m) => ['k-01', 'k-02', 'k-03', 'k-04', 'k-05'].includes(m.id));

        if (isMockSample) {
          localStorage.setItem(KARDEX_STORAGE_KEY, JSON.stringify([]));
          return [];
        }

        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error cargando movimientos de Kardex', e);
    }
    return [];
  });

  // Lista de insumos registrados
  const [supplies, setSupplies] = useState(() => {
    try {
      const saved = localStorage.getItem(SUPPLIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Guardar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(KARDEX_STORAGE_KEY, JSON.stringify(movements));
    } catch (e) {
      console.error('Error guardando kardex en localStorage', e);
    }
  }, [movements]);

  // Sincronizar insumos
  useEffect(() => {
    const handleSuppliesSync = () => {
      try {
        const saved = localStorage.getItem(SUPPLIES_STORAGE_KEY);
        if (saved) setSupplies(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('ohana_supplies_updated', handleSuppliesSync);
    window.addEventListener('storage', handleSuppliesSync);
    return () => {
      window.removeEventListener('ohana_supplies_updated', handleSuppliesSync);
      window.removeEventListener('storage', handleSuppliesSync);
    };
  }, []);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplyFilter, setSelectedSupplyFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Modal de Nuevo Movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplyName: '',
    type: 'OUT_WASTE',
    qty: '',
    unit: 'Kg',
    unitCost: '',
    docRef: '',
    responsible: 'Chef Barra',
    notes: '',
  });

  // Opciones únicas de insumos para el filtro
  const uniqueSupplyNames = useMemo(() => {
    const names = new Set();
    supplies.forEach((s) => s.name && names.add(s.name));
    movements.forEach((m) => m.supplyName && names.add(m.supplyName));
    return Array.from(names).sort();
  }, [supplies, movements]);

  // Filtrado de movimientos
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Filtro por insumo
      if (selectedSupplyFilter !== 'ALL' && m.supplyName !== selectedSupplyFilter) {
        return false;
      }

      // Filtro por tipo
      if (selectedTypeFilter !== 'ALL') {
        if (selectedTypeFilter === 'ENTRIES' && !MOVEMENT_TYPES[m.type]?.isEntry) return false;
        if (selectedTypeFilter === 'SALES' && m.type !== 'OUT_SALE') return false;
        if (selectedTypeFilter === 'WASTE' && m.type !== 'OUT_WASTE' && m.type !== 'OUT_DAMAGE') return false;
        if (selectedTypeFilter === 'ADJUST' && m.type !== 'ADJUST_POS' && m.type !== 'ADJUST_NEG') return false;
      }

      // Búsqueda libre
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSupply = (m.supplyName || '').toLowerCase().includes(q);
        const matchDoc = (m.docRef || '').toLowerCase().includes(q);
        const matchResp = (m.responsible || '').toLowerCase().includes(q);
        const matchNotes = (m.notes || '').toLowerCase().includes(q);
        if (!matchSupply && !matchDoc && !matchResp && !matchNotes) return false;
      }

      return true;
    });
  }, [movements, selectedSupplyFilter, selectedTypeFilter, searchQuery]);

  // Cálculos de KPIs generales
  const metrics = useMemo(() => {
    // 1. Valor total del inventario actual
    const inventoryValue = supplies.reduce((acc, s) => {
      return acc + (Number(s.stock) || 0) * (Number(s.cost) || 0);
    }, 0);

    // 2. Total compras (entradas) valorizadas
    const totalPurchases = movements
      .filter((m) => m.type === 'IN_PURCHASE' || m.type === 'ADJUST_POS')
      .reduce((acc, m) => acc + (Number(m.totalCost) || Math.abs(Number(m.qty)) * (Number(m.unitCost) || 0)), 0);

    // 3. Total salidas por ventas
    const totalSalesOut = movements
      .filter((m) => m.type === 'OUT_SALE')
      .reduce((acc, m) => acc + (Number(m.totalCost) || Math.abs(Number(m.qty)) * (Number(m.unitCost) || 0)), 0);

    // 4. Total mermas y pérdidas
    const totalWaste = movements
      .filter((m) => m.type === 'OUT_WASTE' || m.type === 'OUT_DAMAGE')
      .reduce((acc, m) => acc + (Number(m.totalCost) || Math.abs(Number(m.qty)) * (Number(m.unitCost) || 0)), 0);

    return {
      inventoryValue,
      totalPurchases,
      totalSalesOut,
      totalWaste,
    };
  }, [supplies, movements]);

  // Estadísticas del insumo enfocado (cuando se filtra por 1 insumo en particular)
  const focusedSupplyStats = useMemo(() => {
    if (selectedSupplyFilter === 'ALL') return null;

    const matchedSupply = supplies.find((s) => s.name === selectedSupplyFilter);
    const supplyMovements = movements.filter((m) => m.supplyName === selectedSupplyFilter);

    let totalEntries = 0;
    let totalSales = 0;
    let totalWaste = 0;
    const unit = matchedSupply?.unit || supplyMovements[0]?.unit || 'Kg';

    supplyMovements.forEach((m) => {
      const q = Math.abs(Number(m.qty)) || 0;
      if (MOVEMENT_TYPES[m.type]?.isEntry) totalEntries += q;
      else if (m.type === 'OUT_SALE') totalSales += q;
      else if (m.type === 'OUT_WASTE' || m.type === 'OUT_DAMAGE') totalWaste += q;
    });

    const currentStock = matchedSupply ? matchedSupply.stock : (supplyMovements[0]?.balanceQty || 0);

    return {
      name: selectedSupplyFilter,
      unit,
      currentStock,
      totalEntries: Number(totalEntries.toFixed(2)),
      totalSales: Number(totalSales.toFixed(2)),
      totalWaste: Number(totalWaste.toFixed(2)),
    };
  }, [selectedSupplyFilter, supplies, movements]);

  // Abrir Modal
  const handleOpenCreateModal = () => {
    const defaultSupply = supplies[0]?.name || uniqueSupplyNames[0] || '';
    const matched = supplies.find((s) => s.name === defaultSupply);

    setFormData({
      supplyName: defaultSupply,
      type: 'OUT_WASTE',
      qty: '',
      unit: matched?.unit || 'Kg',
      unitCost: matched?.cost ? String(matched.cost) : '',
      docRef: `MERMA-${Date.now().toString().slice(-4)}`,
      responsible: 'Chef Barra',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Al cambiar de insumo en el formulario
  const handleSelectSupplyInForm = (name) => {
    const matched = supplies.find((s) => s.name === name);
    setFormData((prev) => ({
      ...prev,
      supplyName: name,
      unit: matched?.unit || prev.unit,
      unitCost: matched?.cost ? String(matched.cost) : prev.unitCost,
    }));
  };

  // Guardar nuevo movimiento y actualizar stock real
  const handleSaveMovement = (e) => {
    e.preventDefault();
    if (!formData.supplyName.trim() || !formData.qty) return;

    const typeConfig = MOVEMENT_TYPES[formData.type] || MOVEMENT_TYPES.OUT_WASTE;
    const inputQty = Math.max(0, parseFloat(formData.qty) || 0);
    const signedQty = Number((inputQty * typeConfig.sign).toFixed(3));
    const unitCost = Math.max(0, parseFloat(formData.unitCost) || 0);
    const totalCost = Number((inputQty * unitCost).toFixed(2));

    // Obtener saldo previo del insumo
    let prevBalance = 0;
    const existingSupply = supplies.find(
      (s) => s.name.toLowerCase() === formData.supplyName.trim().toLowerCase()
    );

    if (existingSupply) {
      prevBalance = Number(existingSupply.stock) || 0;
    } else {
      const lastMov = movements.find(
        (m) => m.supplyName.toLowerCase() === formData.supplyName.trim().toLowerCase()
      );
      if (lastMov) prevBalance = Number(lastMov.balanceQty) || 0;
    }

    const newBalance = Math.max(0, Number((prevBalance + signedQty).toFixed(3)));

    const newMovement = {
      id: `k-${Date.now()}`,
      date: new Date().toISOString(),
      supplyName: formData.supplyName.trim(),
      type: formData.type,
      qty: signedQty,
      unit: formData.unit,
      unitCost,
      totalCost,
      balanceQty: newBalance,
      docRef: formData.docRef.trim() || 'REG-MANUAL',
      responsible: formData.responsible.trim() || 'Admin',
      notes: formData.notes.trim() || typeConfig.label,
    };

    // Actualizar inventario si el insumo existe
    if (existingSupply) {
      const updatedSupplies = supplies.map((s) =>
        s.id === existingSupply.id ? { ...s, stock: newBalance } : s
      );
      setSupplies(updatedSupplies);
      localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(updatedSupplies));
      window.dispatchEvent(new Event('ohana_supplies_updated'));
    }

    setMovements((prev) => [newMovement, ...prev]);
    setIsModalOpen(false);
  };

  // Eliminar movimiento
  const handleDeleteMovement = (id) => {
    if (window.confirm('¿Deseas eliminar este registro del historial del Kardex?')) {
      setMovements((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Exportar a Excel
  const handleExportToExcel = () => {
    if (filteredMovements.length === 0) {
      alert('No hay registros para exportar con los filtros seleccionados.');
      return;
    }

    const currentDate = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const sanitize = (text) => {
      if (text === null || text === undefined) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .title { font-size: 15pt; font-weight: bold; color: #0f172a; }
          .meta { font-size: 9pt; color: #64748b; margin-bottom: 10px; }
          .header-th { background-color: #0f172a; color: #ffffff; font-size: 9.5pt; font-weight: bold; padding: 6px 8px; border: 1px solid #000; text-align: left; }
          .data-td { border: 0.5pt solid #cbd5e1; font-size: 9pt; padding: 5px 6px; }
          .qty-in { color: #0f172a; font-weight: bold; }
          .qty-out { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="8" class="title">Kardex de Movimientos - Ohana Makis & Sushi Bar</td></tr>
          <tr><td colspan="8" class="meta">Fecha de Emisión: ${currentDate} | Total Registros: ${filteredMovements.length}</td></tr>
          <tr><td colspan="8"></td></tr>
          <thead>
            <tr>
              <th class="header-th">FECHA Y HORA</th>
              <th class="header-th">INSUMO</th>
              <th class="header-th">TIPO DE MOVIMIENTO</th>
              <th class="header-th">DOC / REF</th>
              <th class="header-th" style="text-align: right;">CANTIDAD</th>
              <th class="header-th" style="text-align: right;">SALDO FINAL</th>
              <th class="header-th">RESPONSABLE</th>
              <th class="header-th">OBSERVACIÓN</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMovements.map((m) => `
              <tr>
                <td class="data-td">${formatKardexDateTime(m.date)}</td>
                <td class="data-td" style="font-weight: 600;">${sanitize(m.supplyName)}</td>
                <td class="data-td">${sanitize(MOVEMENT_TYPES[m.type]?.label || m.type)}</td>
                <td class="data-td">${sanitize(m.docRef)}</td>
                <td class="data-td ${Number(m.qty) >= 0 ? 'qty-in' : 'qty-out'}" style="text-align: right;">
                  ${Number(m.qty) > 0 ? '+' : ''}${m.qty} ${sanitize(m.unit)}
                </td>
                <td class="data-td" style="text-align: right; font-weight: bold;">
                  ${m.balanceQty} ${sanitize(m.unit)}
                </td>
                <td class="data-td">${sanitize(m.responsible)}</td>
                <td class="data-td">${sanitize(m.notes || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + template], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `Ohana_Kardex_${new Date().toISOString().split('T')[0]}.xls`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Definición de columnas de la tabla DataTable
  const columns = [
    {
      key: 'date',
      header: 'Fecha y Hora',
      width: '145px',
      render: (val) => (
        <span style={{ fontSize: '0.82rem', color: '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formatKardexDateTime(val)}
        </span>
      ),
    },
    {
      key: 'supplyName',
      header: 'Insumo',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>{val}</div>
          {row.notes && (
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>{row.notes}</div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo de Movimiento',
      width: '180px',
      render: (val) => {
        const config = MOVEMENT_TYPES[val] || { label: val, class: 'adjust' };
        return (
          <span className={`kardex-type-badge ${config.class}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'docRef',
      header: 'Doc. / Referencia',
      width: '130px',
      render: (val) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: '0.82rem',
            color: '#334155',
          }}
        >
          {val || '-'}
        </span>
      ),
    },
    {
      key: 'qty',
      header: 'Cantidad',
      width: '120px',
      render: (val, row) => {
        const num = Number(val);
        const isNegative = num < 0;
        return (
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.86rem',
              color: isNegative ? '#dc2626' : '#0f172a',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {num > 0 ? `+${val}` : val} {row.unit}
          </span>
        );
      },
    },
    {
      key: 'balanceQty',
      header: 'Saldo Final',
      width: '120px',
      render: (val, row) => (
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
          {val} {row.unit}
        </span>
      ),
    },
    {
      key: 'responsible',
      header: 'Responsable',
      width: '120px',
      render: (val) => (
        <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
          {val || 'Admin'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleDeleteMovement(row.id)}
          title="Eliminar registro"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <Trash2 size={13} />
        </button>
      ),
    },
  ];

  return (
    <div className="module-page">
      {/* Encabezado */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Kardex de Movimientos</h1>
          <p className="page-subtitle">
            Trazabilidad permanente de entradas, salidas por ventas, mermas de cocina y auditoría de inventario
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExportToExcel}>
            Exportar Excel
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* =========================================================================
          4 CARDS KPI: VALOR INVENTARIO | COMPRAS DEL MES | SALIDAS VENTA | MERMAS
          ========================================================================= */}
      <div className="recipe-kpi-grid">
        <div className="recipe-kpi-card">
          <div className="recipe-kpi-header">
            <span className="recipe-kpi-title">Valor en Almacén</span>
            <div className="recipe-kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#16a34a' }}>
              <Boxes size={16} />
            </div>
          </div>
          <div>
            <div className="recipe-kpi-val">{formatCurrency(metrics.inventoryValue)}</div>
            <div className="recipe-kpi-sub">{supplies.length} materias primas valorizadas</div>
          </div>
        </div>

        <div className="recipe-kpi-card">
          <div className="recipe-kpi-header">
            <span className="recipe-kpi-title">Entradas / Compras</span>
            <div className="recipe-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="recipe-kpi-val">{formatCurrency(metrics.totalPurchases)}</div>
            <div className="recipe-kpi-sub">Ingresos registrados en kardex</div>
          </div>
        </div>

        <div className="recipe-kpi-card">
          <div className="recipe-kpi-header">
            <span className="recipe-kpi-title">Salidas por Venta</span>
            <div className="recipe-kpi-icon-wrap" style={{ background: '#f8fafc', color: '#475569' }}>
              <TrendingDown size={16} />
            </div>
          </div>
          <div>
            <div className="recipe-kpi-val">{formatCurrency(metrics.totalSalesOut)}</div>
            <div className="recipe-kpi-sub">Deducción de insumos por platos</div>
          </div>
        </div>

        <div className="recipe-kpi-card">
          <div className="recipe-kpi-header">
            <span className="recipe-kpi-title">Mermas y Pérdidas</span>
            <div className="recipe-kpi-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div>
            <div className="recipe-kpi-val" style={{ color: '#dc2626' }}>
              {formatCurrency(metrics.totalWaste)}
            </div>
            <div className="recipe-kpi-sub">Limpieza, mermas y descartes</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="supplies-toolbar" style={{ marginBottom: '1.25rem' }}>
        <div className="supplies-search-wrapper">
          <Search size={16} className="supplies-search-icon" />
          <input
            type="text"
            placeholder="Buscar por insumo, documento, responsable..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="supplies-filter-chips">
          {/* Selector de Insumo Específico */}
          <select
            value={selectedSupplyFilter}
            onChange={(e) => setSelectedSupplyFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              color: '#334155',
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <option value="ALL">Todos los Insumos</option>
            {uniqueSupplyNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {/* Filtro por Tipo de Movimiento */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              color: '#334155',
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Todos los Movimientos</option>
            <option value="ENTRIES">Solo Ingresos (Compras)</option>
            <option value="SALES">Solo Salidas por Venta POS</option>
            <option value="WASTE">Solo Mermas y Desperdicio</option>
            <option value="ADJUST">Solo Ajustes de Auditoría</option>
          </select>

          {(searchQuery || selectedSupplyFilter !== 'ALL' || selectedTypeFilter !== 'ALL') && (
            <button
              type="button"
              className="supplies-filter-reset"
              onClick={() => {
                setSearchQuery('');
                setSelectedSupplyFilter('ALL');
                setSelectedTypeFilter('ALL');
              }}
            >
              <RotateCcw size={12} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Banner Resumen cuando se selecciona un insumo específico */}
      {focusedSupplyStats && (
        <div className="kardex-supply-summary-card">
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>HISTORIAL DE INSUMO</div>
            <div style={{ fontSize: '1.08rem', fontWeight: 700, color: '#0f172a' }}>
              {focusedSupplyStats.name}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div className="kardex-summary-stat">
              <span className="kardex-summary-stat-label">Total Compras (+)</span>
              <span className="kardex-summary-stat-val" style={{ color: '#0f172a' }}>
                +{focusedSupplyStats.totalEntries} {focusedSupplyStats.unit}
              </span>
            </div>

            <div className="kardex-summary-stat">
              <span className="kardex-summary-stat-label">Total Ventas (-)</span>
              <span className="kardex-summary-stat-val" style={{ color: '#dc2626' }}>
                -{focusedSupplyStats.totalSales} {focusedSupplyStats.unit}
              </span>
            </div>

            <div className="kardex-summary-stat">
              <span className="kardex-summary-stat-label">Total Mermas (-)</span>
              <span className="kardex-summary-stat-val" style={{ color: '#dc2626' }}>
                -{focusedSupplyStats.totalWaste} {focusedSupplyStats.unit}
              </span>
            </div>

            <div className="kardex-summary-stat">
              <span className="kardex-summary-stat-label">Saldo Actual</span>
              <span className="kardex-summary-stat-val" style={{ color: '#0f172a' }}>
                {focusedSupplyStats.currentStock} {focusedSupplyStats.unit}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabla con listado del Kardex */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={filteredMovements}
          emptyMessage={
            movements.length === 0
              ? 'No hay movimientos registrados en el Kardex aún. Haz clic en "Nuevo Movimiento" para registrar entradas, salidas o mermas.'
              : 'No se encontraron movimientos con los filtros seleccionados.'
          }
        />
      </div>

      {/* =========================================================================
          MODAL: REGISTRAR NUEVO MOVIMIENTO EN KARDEX (MERMA / AJUSTE / ENTRADA)
          ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Movimiento en Kardex"
        maxWidth="540px"
      >
        <form onSubmit={handleSaveMovement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tipo de movimiento */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Tipo de Movimiento *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#ffffff',
                fontWeight: 600,
              }}
            >
              <option value="OUT_WASTE">Merma Operativa de Cocina (-)</option>
              <option value="OUT_DAMAGE">Desperdicio / Vencimiento (-)</option>
              <option value="IN_PURCHASE">Ingreso por Compra (+)</option>
              <option value="ADJUST_POS">Ajuste de Conteo Físico Sobrante (+)</option>
              <option value="ADJUST_NEG">Ajuste de Conteo Físico Faltante (-)</option>
            </select>
          </div>

          {/* Insumo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Insumo *
            </label>
            <input
              type="text"
              list="kardex-supplies-list"
              placeholder="Escribe o selecciona el insumo..."
              value={formData.supplyName}
              onChange={(e) => handleSelectSupplyInForm(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
            <datalist id="kardex-supplies-list">
              {uniqueSupplyNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {/* Cantidad, Unidad y Costo Referencial */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Cantidad *
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                placeholder="0.00"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Unidad
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              >
                <option value="Kg">Kg</option>
                <option value="Gramos">Gramos</option>
                <option value="Litro">Litro</option>
                <option value="Unidad">Unidad</option>
                <option value="Paquete x100">Paquete x100</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Costo Unit. (S/)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* Doc Ref y Responsable */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Doc. / N° Referencia
              </label>
              <input
                type="text"
                placeholder="Ej. MERMA-015 o FAC-129"
                value={formData.docRef}
                onChange={(e) => setFormData({ ...formData, docRef: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Responsable
              </label>
              <input
                type="text"
                placeholder="Ej. Chef Barra / Admin"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Motivo u Observación
            </label>
            <input
              type="text"
              placeholder="Ej. Limpieza de salmón (espinas y piel) antes del servicio"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Registrar Movimiento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default KardexPage;
