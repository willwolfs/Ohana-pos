import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Trash2,
  Receipt,
  TrendingDown,
  Lightbulb,
  ShoppingCart,
  Store,
  Users,
  Tag,
  Folder,
} from 'lucide-react';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { exportExpensesToExcel } from '../../../utils/excelExporter';
import { expenseService } from '../../../services/expenseService';
import '../styles/ExpensesPage.css';

const CATEGORIES = [
  { id: 'todos', label: 'Todos los Gastos', icon: Tag },
  { id: 'compras', label: 'Compras Insumos', icon: Folder },
  { id: 'servicios', label: 'Servicios Básicos', icon: Folder },
  { id: 'local', label: 'Local y Alquiler', icon: Folder },
  { id: 'personal', label: 'Personal y Movilidad', icon: Folder },
  { id: 'otros', label: 'Otros Gastos', icon: Folder },
];

export const ExpensesPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal registrar / editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    concept: '',
    category: 'Compras Insumos',
    amount: '',
    payment_method: 'Efectivo',
    voucher_number: '',
    date: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  // Modal confirmar eliminación
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();

  const monthYearLabel = useMemo(() => {
    const raw = currentDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentDate]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseService.getExpenses({ month: selectedMonth, year: selectedYear });
      setExpenses(data || []);
    } catch (error) {
      console.error('Error cargando gastos:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();

    const handleUpdate = () => loadExpenses();
    window.addEventListener('ohana_expenses_updated', handleUpdate);
    return () => window.removeEventListener('ohana_expenses_updated', handleUpdate);
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const normalizeCat = (cat = '') => {
    const str = cat.toLowerCase();
    if (str.includes('compra') || str.includes('insumo') || str.includes('mercader')) return 'compras';
    if (str.includes('servicio') || str.includes('luz') || str.includes('agua') || str.includes('internet') || str.includes('gas')) return 'servicios';
    if (str.includes('local') || str.includes('alquiler') || str.includes('renta')) return 'local';
    if (str.includes('personal') || str.includes('movilidad') || str.includes('sueldo') || str.includes('pasaje')) return 'personal';
    return 'otros';
  };

  // Contadores y subtotales por categoría para las 5 KPI Cards
  const metrics = useMemo(() => {
    let total = 0;
    let compras = 0;
    let servicios = 0;
    let local = 0;
    let personal = 0;
    let otros = 0;

    const counts = { todos: expenses.length, compras: 0, servicios: 0, local: 0, personal: 0, otros: 0 };

    expenses.forEach((item) => {
      const amt = Number(item.amount) || 0;
      total += amt;
      const norm = normalizeCat(item.category);

      if (norm === 'compras') {
        compras += amt;
        counts.compras++;
      } else if (norm === 'servicios') {
        servicios += amt;
        counts.servicios++;
      } else if (norm === 'local') {
        local += amt;
        counts.local++;
      } else if (norm === 'personal') {
        personal += amt;
        counts.personal++;
      } else {
        otros += amt;
        counts.otros++;
      }
    });

    return {
      total,
      compras,
      servicios,
      local,
      personal,
      otros,
      counts,
    };
  }, [expenses]);

  // Filtro
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (activeCategory !== 'todos') {
        const norm = normalizeCat(exp.category);
        if (norm !== activeCategory) return false;
      }

      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const code = (exp.code || '').toLowerCase();
        const concept = (exp.concept || '').toLowerCase();
        const category = (exp.category || '').toLowerCase();
        const voucher = (exp.voucher_number || '').toLowerCase();
        const payment = (exp.payment_method || '').toLowerCase();
        return (
          code.includes(term) ||
          concept.includes(term) ||
          category.includes(term) ||
          voucher.includes(term) ||
          payment.includes(term)
        );
      }

      return true;
    });
  }, [expenses, activeCategory, searchTerm]);

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    const nextNum = String(expenses.length + 1).padStart(3, '0');
    setFormData({
      code: `EG-${selectedYear}-${nextNum}`,
      concept: '',
      category: 'Compras Insumos',
      amount: '',
      payment_method: 'Efectivo',
      voucher_number: '',
      date: new Date().toISOString().slice(0, 16),
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp) => {
    setEditingExpense(exp);
    const dt = exp.date ? new Date(exp.date) : new Date();
    const formattedDate = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setFormData({
      code: exp.code || `EG-${selectedYear}-001`,
      concept: exp.concept || '',
      category: exp.category || 'Compras Insumos',
      amount: exp.amount || '',
      payment_method: exp.payment_method || 'Efectivo',
      voucher_number: exp.voucher_number || '',
      date: formattedDate,
      notes: exp.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formData.concept.trim()) {
      alert('Por favor, ingresa el concepto del gasto.');
      return;
    }
    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      alert('Por favor, ingresa un monto válido mayor a 0.');
      return;
    }

    try {
      if (editingExpense) {
        await expenseService.updateExpense(editingExpense.id, {
          code: formData.code,
          concept: formData.concept.trim(),
          category: formData.category,
          amount: amt,
          payment_method: formData.payment_method,
          voucher_number: formData.voucher_number.trim(),
          date: new Date(formData.date).toISOString(),
          notes: formData.notes.trim(),
        });
      } else {
        await expenseService.createExpense({
          code: formData.code,
          concept: formData.concept.trim(),
          category: formData.category,
          amount: amt,
          payment_method: formData.payment_method,
          voucher_number: formData.voucher_number.trim(),
          date: new Date(formData.date).toISOString(),
          notes: formData.notes.trim(),
        });
      }
      setIsModalOpen(false);
      loadExpenses();
    } catch (err) {
      console.error('Error guardando gasto:', err);
      alert('Hubo un error al guardar el gasto.');
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await expenseService.deleteExpense(id);
      setDeleteConfirmId(null);
      loadExpenses();
    } catch (err) {
      console.error('Error eliminando:', err);
    }
  };

  const handleExportExcel = () => {
    exportExpensesToExcel({
      expenses: filteredExpenses.length > 0 ? filteredExpenses : expenses,
      periodLabel: monthYearLabel,
      metrics,
    });
  };

  // Helper para el badge de categoría con estilo sobrio y formal
  const renderCategoryPill = (category) => {
    const norm = normalizeCat(category);
    return <span className={`expenses-cat-pill expenses-cat-${norm}`}>{category}</span>;
  };

  return (
    <div className="module-page">
      {/* ================= PAGE HEADER COMPACTO Y FORMAL ================= */}
      <div className="expenses-page-header">
        <div className="expenses-title-wrap">
          <h1 className="expenses-title">Control de Gastos Operativos</h1>
          <p className="expenses-subtitle">Registro y auditoría de egresos, servicios y abastecimiento</p>
        </div>

        <div className="expenses-header-actions">
          {/* Navegador Mes < Mes Año > */}
          <div className="expenses-month-stepper">
            <button
              type="button"
              className="expenses-month-btn"
              onClick={handlePrevMonth}
              title="Mes anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="expenses-month-label">{monthYearLabel}</span>
            <button
              type="button"
              className="expenses-month-btn"
              onClick={handleNextMonth}
              title="Mes siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Botón Exportar Excel */}
          <button
            type="button"
            className="btn-export-excel-formal"
            onClick={handleExportExcel}
            title="Descargar reporte en formato Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar Excel</span>
          </button>

          {/* Botón Principal: Registrar Gasto */}
          <button
            type="button"
            className="btn-new-expense-formal"
            onClick={handleOpenCreateModal}
          >
            <Plus size={14} />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* ================= 5 KPI CARDS COMPACTAS Y FORMALES ================= */}
      <div className="expenses-kpi-grid">
        {/* 1. Total Gastos del Mes */}
        <div className="expenses-kpi-card kpi-total">
          <div className="expenses-kpi-top">
            <span className="expenses-kpi-title">Total Gastos Mes</span>
            <div className="expenses-kpi-badge">
              <TrendingDown size={14} />
            </div>
          </div>
          <div>
            <div className="expenses-kpi-amount">{formatCurrency(metrics.total)}</div>
            <div className="expenses-kpi-sub">{metrics.counts.todos} egresos registrados</div>
          </div>
        </div>

        {/* 2. Servicios Básicos */}
        <div className="expenses-kpi-card kpi-servicios">
          <div className="expenses-kpi-top">
            <span className="expenses-kpi-title">Servicios Básicos</span>
            <div className="expenses-kpi-badge">
              <Lightbulb size={14} />
            </div>
          </div>
          <div>
            <div className="expenses-kpi-amount">{formatCurrency(metrics.servicios)}</div>
            <div className="expenses-kpi-sub">Luz, agua, internet</div>
          </div>
        </div>

        {/* 3. Compras Insumos */}
        <div className="expenses-kpi-card kpi-compras">
          <div className="expenses-kpi-top">
            <span className="expenses-kpi-title">Compras Insumos</span>
            <div className="expenses-kpi-badge">
              <ShoppingCart size={14} />
            </div>
          </div>
          <div>
            <div className="expenses-kpi-amount">{formatCurrency(metrics.compras)}</div>
            <div className="expenses-kpi-sub">Insumos y mercadería</div>
          </div>
        </div>

        {/* 4. Local y Alquiler */}
        <div className="expenses-kpi-card kpi-local">
          <div className="expenses-kpi-top">
            <span className="expenses-kpi-title">Local y Alquiler</span>
            <div className="expenses-kpi-badge">
              <Store size={14} />
            </div>
          </div>
          <div>
            <div className="expenses-kpi-amount">{formatCurrency(metrics.local)}</div>
            <div className="expenses-kpi-sub">Alquiler del local</div>
          </div>
        </div>

        {/* 5. Personal y Movilidad */}
        <div className="expenses-kpi-card kpi-personal">
          <div className="expenses-kpi-top">
            <span className="expenses-kpi-title">Personal / Movilidad</span>
            <div className="expenses-kpi-badge">
              <Users size={14} />
            </div>
          </div>
          <div>
            <div className="expenses-kpi-amount">{formatCurrency(metrics.personal)}</div>
            <div className="expenses-kpi-sub">Movilidad y planilla</div>
          </div>
        </div>
      </div>

      {/* ================= BARRA DE FILTROS SUPERIOR COMPACTA ================= */}
      <div className="expenses-toolbar-row">
        {/* Pills de Categoría */}
        <div className="expenses-category-filters">
          {CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                className={`cat-filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {CatIcon && <CatIcon size={13} className="cat-filter-icon" />}
                <span>{cat.label}</span>
                <span className="cat-filter-badge">{metrics.counts[cat.id] || 0}</span>
              </button>
            );
          })}
        </div>

        {/* Buscador Compacto */}
        <div className="expenses-search-container">
          <Search size={14} className="expenses-search-ico" />
          <input
            type="text"
            className="expenses-search-box-input"
            placeholder="Buscar por concepto, N° o comprobante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ================= TABLA ESTILO FORMAL / CONTABLE ================= */}
      <div className="expenses-table-card">
        <table className="expenses-table">
          <thead>
            <tr>
              <th>N° Gasto</th>
              <th>Concepto</th>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Método Pago</th>
              <th>N° Comprobante</th>
              <th>Total Factura</th>
              <th style={{ textAlign: 'center', width: '80px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="expenses-empty-state">
                    <Receipt size={28} className="expenses-empty-icon" />
                    <div className="expenses-empty-title">
                      No hay gastos operativos registrados
                    </div>
                    <div className="expenses-empty-desc">
                      {searchTerm
                        ? 'No se encontraron resultados para la búsqueda ingresada.'
                        : 'Registra compras, servicios básicos, alquiler o movilidad para tu control financiero.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp, idx) => {
                const codeDisplay = exp.code || `EG-${selectedYear}-${String(filteredExpenses.length - idx).padStart(3, '0')}`;
                return (
                  <tr key={exp.id || idx}>
                    <td>
                      <span className="expenses-code">{codeDisplay}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{exp.concept}</div>
                      {exp.notes && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                          {exp.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {formatDate(exp.date || exp.created_at)}
                    </td>
                    <td>{renderCategoryPill(exp.category)}</td>
                    <td style={{ color: '#475569' }}>{exp.payment_method || 'Efectivo'}</td>
                    <td style={{ color: '#64748b' }}>{exp.voucher_number || '-'}</td>
                    <td>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                        {formatCurrency(exp.amount)}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="expenses-action-btn"
                          onClick={() => handleOpenEditModal(exp)}
                          title="Editar gasto"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="expenses-action-btn delete"
                          onClick={() => setDeleteConfirmId(exp.id)}
                          title="Eliminar gasto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredExpenses.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                <td colSpan={6} style={{ textAlign: 'right', fontWeight: '700', color: '#475569', padding: '1rem 1.25rem' }}>
                  TOTAL GASTOS ({filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'}):
                </td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <strong style={{ fontSize: '1.15rem', color: '#ea580c' }}>
                    {formatCurrency(filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0))}
                  </strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ================= MODAL REGISTRAR / EDITAR GASTO ================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Editar Gasto Operativo' : 'Registrar Nuevo Gasto'}
        maxWidth="540px"
      >
        <form onSubmit={handleSaveExpense} className="expense-modal-form">
          <div className="expense-form-row">
            <div className="expense-form-group">
              <label>N° Registro / Código</label>
              <input
                type="text"
                className="expense-form-input"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
            <div className="expense-form-group">
              <label>Categoría *</label>
              <select
                className="expense-form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Compras Insumos">Compras Insumos</option>
                <option value="Servicios Básicos">Servicios Básicos (Luz/Agua/Gas)</option>
                <option value="Local y Alquiler">Local y Alquiler</option>
                <option value="Personal y Movilidad">Personal y Movilidad</option>
                <option value="Otros Gastos">Otros Gastos</option>
              </select>
            </div>
          </div>

          <div className="expense-form-group">
            <label>Concepto / Detalle *</label>
            <input
              type="text"
              className="expense-form-input"
              placeholder="Ej. Balón de gas para cocina, Arroz extra, etc."
              value={formData.concept}
              onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="expense-form-row">
            <div className="expense-form-group">
              <label>Monto Total *</label>
              <div className="expense-amount-input-wrapper">
                <span className="expense-currency-prefix">S/</span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  className="expense-form-input"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="expense-form-group">
              <label>Método de Pago</label>
              <select
                className="expense-form-select"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia BCP">Transferencia BCP</option>
                <option value="Transferencia BBVA">Transferencia BBVA</option>
                <option value="Tarjeta">Tarjeta Débito/Crédito</option>
              </select>
            </div>
          </div>

          <div className="expense-form-row">
            <div className="expense-form-group">
              <label>N° Comprobante / Factura</label>
              <input
                type="text"
                className="expense-form-input"
                placeholder="Ej. FAC-0012, Boleta, Ref #129"
                value={formData.voucher_number}
                onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
              />
            </div>

            <div className="expense-form-group">
              <label>Fecha y Hora</label>
              <input
                type="datetime-local"
                className="expense-form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="expense-form-group">
            <label>Notas u Observaciones (Opcional)</label>
            <textarea
              rows="2"
              className="expense-form-textarea"
              placeholder="Detalles sobre el proveedor o insumo..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="expense-modal-actions">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingExpense ? 'Actualizar Gasto' : 'Guardar Gasto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL CONFIRMAR ELIMINACIÓN ================= */}
      <Modal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="¿Eliminar este gasto?"
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: '1.5' }}>
            Esta acción eliminará el registro de gasto operativo de forma permanente. ¿Deseas continuar?
          </p>
          <div className="expense-modal-actions">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => handleDeleteExpense(deleteConfirmId)}>
              Sí, Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
