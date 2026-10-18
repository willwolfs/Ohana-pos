import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import DataTable from '../../../components/common/DataTable';
import { formatCurrency } from '../../../utils/formatCurrency';
import {
  Plus,
  BookOpen,
  Search,
  Edit2,
  Trash2,
  Calculator,
  ChefHat,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Package,
  ArrowRight,
  Check,
  Percent,
  Layers,
  UtensilsCrossed,
  Eye,
  SlidersHorizontal,
  FolderPlus,
  Folder,
  Tag,
  X,
  DollarSign,
} from 'lucide-react';

const RECIPES_STORAGE_KEY = 'ohana_recipes';
const RECIPES_CATEGORIES_STORAGE_KEY = 'ohana_recipes_categories';
const SUPPLIES_STORAGE_KEY = 'ohana_supplies';

const DEFAULT_RECIPE_CATEGORIES = [];

export const RecipesPage = () => {
  // Categorías dinámicas de recetas creadas por el usuario
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(RECIPES_CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Si contenía las categorías por defecto de prueba, limpiarlas
        const isMockCategories =
          Array.isArray(parsed) &&
          parsed.some((c) => ['Fusión', 'Furai', 'Clásicos', 'Especiales', 'Niguiris & Gunkan'].includes(c));
        if (isMockCategories) {
          localStorage.removeItem(RECIPES_CATEGORIES_STORAGE_KEY);
          return [];
        }
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => typeof c === 'string' && c.trim() !== '');
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const safeCategories = useMemo(() => {
    return Array.isArray(categories) ? categories : [];
  }, [categories]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Persistir categorías de recetas
  useEffect(() => {
    try {
      localStorage.setItem(RECIPES_CATEGORIES_STORAGE_KEY, JSON.stringify(safeCategories));
    } catch (e) {
      console.error(e);
    }
  }, [safeCategories]);

  // Estado de Recetas: limpio sin datos de prueba por defecto
  const [recipes, setRecipes] = useState(() => {
    try {
      const saved = localStorage.getItem(RECIPES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Si contenía las plantillas de prueba por defecto (rec-01, etc.), limpiarlas
        const isMockData =
          Array.isArray(parsed) &&
          parsed.some((r) => r.id === 'rec-01' && r.name.includes('Acevichado'));
        if (isMockData) {
          localStorage.removeItem(RECIPES_STORAGE_KEY);
          return [];
        }
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error cargando recetas', e);
    }
    return [];
  });

  // Estado de Insumos actuales de inventario
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

  // Guardar recetas en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
    } catch (e) {
      console.error('Error guardando recetas', e);
    }
  }, [recipes]);

  // Sincronizar insumos ante eventos del sistema
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

  // Filtros y Vista
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Porción activa por receta (10 cortes vs 5 cortes) -> { [recipeId]: 10 | 5 }
  const [portionSelection, setPortionSelection] = useState({});

  // Modales
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeFormData, setRecipeFormData] = useState({
    name: '',
    category: 'Fusión',
    price: '',
    notes: '',
    ingredients: [],
  });

  // Modal de Descuento de Stock por Producción / Venta
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountTargetRecipe, setDiscountTargetRecipe] = useState(null);
  const [discountPortion, setDiscountPortion] = useState(10); // 10 cortes o 5 cortes
  const [discountQuantity, setDiscountQuantity] = useState(1); // Cantidad de tablas
  const [discountSuccessMsg, setDiscountSuccessMsg] = useState('');

  // Filtrado de recetas
  const filteredRecipes = useMemo(() => {
    return recipes.filter((item) => {
      if (selectedCategory !== 'Todas' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        const matchIng = item.ingredients.some((ing) => ing.name.toLowerCase().includes(q));
        if (!matchName && !matchCat && !matchIng) return false;
      }
      return true;
    });
  }, [recipes, selectedCategory, searchQuery]);

  // Cálculos y Métricas generales de las recetas
  const metrics = useMemo(() => {
    const total = recipes.length;
    if (total === 0) return { total: 0, avgCost: 0, avgPrice: 0, avgMargin: 0 };

    let sumCost = 0;
    let sumPrice = 0;

    recipes.forEach((r) => {
      const cost = r.ingredients.reduce((acc, ing) => acc + (Number(ing.cost) || 0), 0);
      const price = Number(r.price) || 0;
      sumCost += cost;
      sumPrice += price;
    });

    const avgCost = sumCost / total;
    const avgPrice = sumPrice / total;
    const avgMargin = avgPrice > 0 ? ((avgPrice - avgCost) / avgPrice) * 100 : 0;

    return {
      total,
      avgCost,
      avgPrice,
      avgMargin,
    };
  }, [recipes]);

  // Helper para calcular costos según la porción (10 cortes vs 5 cortes)
  const getRecipeCostDetails = (recipe, portion = 10) => {
    const factor = portion === 5 ? 0.5 : 1.0;
    const foodCost10 = recipe.ingredients.reduce((acc, ing) => acc + (Number(ing.cost) || 0), 0);
    const foodCost = foodCost10 * factor;
    // En sushi, 5 cortes cuesta el 55% de 10 cortes o 50%
    const price = portion === 5 ? Math.round(recipe.price * 0.55 * 10) / 10 : recipe.price;
    const margin = price - foodCost;
    const marginPercent = price > 0 ? (margin / price) * 100 : 0;
    const foodCostPercent = price > 0 ? (foodCost / price) * 100 : 0;

    return {
      factor,
      foodCost,
      price,
      margin,
      marginPercent,
      foodCostPercent,
    };
  };

  // Helper para calcular la capacidad máxima preparable según stock de insumos
  const getCapacityInfo = (recipe) => {
    if (!supplies || supplies.length === 0) {
      return { maxPortions: null, bottleneck: null };
    }

    let minPortions = Infinity;
    let bottleneck = null;

    recipe.ingredients.forEach((ing) => {
      // Buscar en supplies por coincidencia de nombre o código
      const ingLower = ing.name.toLowerCase();
      const match = supplies.find(
        (s) =>
          s.name.toLowerCase().includes(ingLower) ||
          ingLower.includes(s.name.toLowerCase())
      );

      if (match) {
        const supplyStock = Number(match.stock) || 0;
        const requiredQty = Number(ing.qty) || 0;

        // Factor de conversión referencial si la unidad es Kg y el ingrediente está en gramos
        let convertedStock = supplyStock;
        if (match.unit?.toLowerCase() === 'kg' && ing.unit?.toLowerCase() === 'g') {
          convertedStock = supplyStock * 1000;
        } else if (match.unit?.toLowerCase() === 'litro' && ing.unit?.toLowerCase() === 'ml') {
          convertedStock = supplyStock * 1000;
        }

        if (requiredQty > 0) {
          const possible = Math.floor(convertedStock / requiredQty);
          if (possible < minPortions) {
            minPortions = possible;
            bottleneck = match.name;
          }
        }
      }
    });

    if (minPortions === Infinity) {
      return { maxPortions: null, bottleneck: null };
    }

    return { maxPortions: Math.max(0, minPortions), bottleneck };
  };

  // Abrir Modal de Creación
  const handleOpenCreateModal = () => {
    setEditingRecipe(null);
    setRecipeFormData({
      name: '',
      category: categories[0] || 'General',
      price: '',
      notes: '',
      ingredients: [],
    });
    setIsRecipeModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (recipe) => {
    setEditingRecipe(recipe);
    setRecipeFormData({
      name: recipe.name,
      category: recipe.category || categories[0] || 'General',
      price: String(recipe.price || ''),
      notes: recipe.notes || '',
      ingredients: (recipe.ingredients || []).map((ing, i) => ({
        id: ing.id || String(i + 1),
        name: ing.name,
        qty: ing.qty,
        unit: ing.unit,
        cost: ing.cost,
      })),
    });
    setIsRecipeModalOpen(true);
  };

  // Categorías de Recetas: Crear y Eliminar
  const handleCreateCategory = (e) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta categoría de receta ya existe');
      return;
    }
    setCategories((prev) => [...prev, trimmed]);
    setNewCatInput('');
  };

  const handleDeleteCategory = (catToDelete) => {
    if (window.confirm(`¿Eliminar la categoría "${catToDelete}"? Las recetas pasarán a "${categories[0] || 'General'}".`)) {
      setCategories((prev) => prev.filter((c) => c !== catToDelete));
      setRecipes((prev) =>
        prev.map((r) => (r.category === catToDelete ? { ...r, category: categories[0] || 'General' } : r))
      );
      if (selectedCategory === catToDelete) {
        setSelectedCategory('Todas');
      }
    }
  };

  // Guardar Ficha Técnica
  const handleSaveRecipe = (e) => {
    e.preventDefault();
    if (!recipeFormData.name.trim()) return;

    const parsedPrice = Math.max(0, parseFloat(recipeFormData.price) || 0);
    const sanitizedIngredients = recipeFormData.ingredients
      .filter((ing) => ing.name && ing.name.trim())
      .map((ing) => ({
        id: ing.id || Date.now().toString(),
        name: ing.name.trim(),
        qty: Number(ing.qty) || 0,
        unit: ing.unit || 'g',
        cost: Math.max(0, parseFloat(ing.cost) || 0),
      }));

    if (editingRecipe) {
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === editingRecipe.id
            ? {
                ...r,
                name: recipeFormData.name.trim(),
                category: recipeFormData.category,
                price: parsedPrice,
                notes: recipeFormData.notes.trim(),
                ingredients: sanitizedIngredients,
              }
            : r
        )
      );
    } else {
      const newRec = {
        id: `rec-${Date.now().toString().slice(-4)}`,
        name: recipeFormData.name.trim(),
        category: recipeFormData.category,
        price: parsedPrice,
        servings: 10,
        notes: recipeFormData.notes.trim(),
        ingredients: sanitizedIngredients,
      };
      setRecipes((prev) => [newRec, ...prev]);
    }

    setIsRecipeModalOpen(false);
  };

  // Eliminar Ficha Técnica
  const handleDeleteRecipe = (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar la ficha técnica de "${name}"?`)) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Manejo de ingredientes dinámicos en el modal de edición
  const handleAddIngredientRow = () => {
    setRecipeFormData((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { id: Date.now().toString(), name: '', qty: '', unit: 'g', cost: '' },
      ],
    }));
  };

  const handleRemoveIngredientRow = (id) => {
    setRecipeFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ing) => ing.id !== id),
    }));
  };

  const handleIngredientChange = (id, field, value) => {
    setRecipeFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing) => {
        if (ing.id === id) {
          const updated = { ...ing, [field]: value };

          // Si el usuario selecciona un insumo del catálogo de supplies, sugerir unidad y costo proporcional
          if (field === 'name') {
            const matchedSupply = supplies.find((s) => s.name.toLowerCase() === value.toLowerCase());
            if (matchedSupply) {
              updated.unit = matchedSupply.unit === 'Kg' ? 'g' : matchedSupply.unit;
              if (matchedSupply.cost) {
                // Si el costo de compra es por Kg, estimar costo en gramos
                const refCost = Number(matchedSupply.cost) || 0;
                updated.cost = matchedSupply.unit === 'Kg' ? Number((refCost / 1000 * 30).toFixed(2)) : refCost;
              }
            }
          }
          return updated;
        }
        return ing;
      }),
    }));
  };

  // Abrir Modal de Descuento
  const handleOpenDiscountModal = (recipe) => {
    setDiscountTargetRecipe(recipe);
    setDiscountPortion(portionSelection[recipe.id] || 10);
    setDiscountQuantity(1);
    setDiscountSuccessMsg('');
    setIsDiscountModalOpen(true);
  };

  // Ejecutar el Descuento de Stock Real en ohana_supplies
  const handleExecuteStockDiscount = () => {
    if (!discountTargetRecipe) return;

    const portionFactor = (discountPortion === 5 ? 0.5 : 1.0) * Number(discountQuantity);
    let updatedCount = 0;

    // Actualizar stock de insumos coincidentes
    const updatedSupplies = supplies.map((supply) => {
      const matchIng = discountTargetRecipe.ingredients.find((ing) => {
        const sName = supply.name.toLowerCase();
        const iName = ing.name.toLowerCase();
        return sName.includes(iName) || iName.includes(sName);
      });

      if (matchIng) {
        let deductAmount = Number(matchIng.qty) * portionFactor;
        // Ajustar unidad si el inventario está en Kg y el ingrediente en gramos
        if (supply.unit?.toLowerCase() === 'kg' && matchIng.unit?.toLowerCase() === 'g') {
          deductAmount = deductAmount / 1000;
        } else if (supply.unit?.toLowerCase() === 'litro' && matchIng.unit?.toLowerCase() === 'ml') {
          deductAmount = deductAmount / 1000;
        }

        const newStock = Math.max(0, Number((supply.stock - deductAmount).toFixed(3)));
        updatedCount++;
        return { ...supply, stock: newStock };
      }
      return supply;
    });

    try {
      localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(updatedSupplies));
      setSupplies(updatedSupplies);
      window.dispatchEvent(new Event('ohana_supplies_updated'));
      setDiscountSuccessMsg(
        `¡Descuento aplicado con éxito! Se descontaron los insumos proporcionales a ${discountQuantity} tabla(s) de ${discountTargetRecipe.name}.`
      );
      setTimeout(() => {
        setIsDiscountModalOpen(false);
      }, 1400);
    } catch (e) {
      console.error('Error aplicando descuento de stock', e);
    }
  };

  return (
    <div className="module-page">
      {/* Encabezado */}
      <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Fichas Técnicas y Recetas de Makis</h1>
          <p className="page-subtitle">
            Estructura de costos, porcionamiento por cortes y descuento automático de inventario
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            icon={FolderPlus}
            onClick={() => setIsCategoryModalOpen(true)}
          >
            Gestionar Categorías
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
            Nueva Ficha Técnica
          </Button>
        </div>
      </div>

      {/* =========================================================================
          4 CARDS KPI: TOTAL RECETAS | COSTO PROMEDIO | MARGEN BRUTO | ALERTA FOOD COST
          ========================================================================= */}
      <div className="recipe-kpi-grid">
        <div className="recipe-kpi-card">
          <div className="recipe-kpi-header">
            <span className="recipe-kpi-title">Recetas Activas</span>
            <div className="recipe-kpi-icon-wrap" style={{ background: '#f8fafc', color: '#475569' }}>
              <BookOpen size={16} />
            </div>
          </div>
          <div>
            <div className="recipe-kpi-val">{metrics.total}</div>
            <div className="recipe-kpi-sub">{metrics.total} variedades de makis costeadas</div>
          </div>
        </div>

        <div className="recipe-kpi-card">
          <div className="recipe-kpi-header">
            <span className="recipe-kpi-title">Food Cost Promedio</span>
            <div className="recipe-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Calculator size={16} />
            </div>
          </div>
          <div>
            <div className="recipe-kpi-val">{formatCurrency(metrics.avgCost)}</div>
            <div className="recipe-kpi-sub">
              {metrics.avgPrice > 0
                ? `${((metrics.avgCost / metrics.avgPrice) * 100).toFixed(1)}% del precio venta`
                : 'Costo por 10 cortes'}
            </div>
          </div>
        </div>

        <div className="recipe-kpi-card">
          <div className="recipe-kpi-header">
            <span className="recipe-kpi-title">Margen Bruto</span>
            <div className="recipe-kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#16a34a' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="recipe-kpi-val" style={{ color: '#16a34a' }}>
              {metrics.avgMargin.toFixed(1)}%
            </div>
            <div className="recipe-kpi-sub">Ganancia operativa promedio</div>
          </div>
        </div>

        <div className="recipe-kpi-card">
          <div className="recipe-kpi-header">
            <span className="recipe-kpi-title">Precio Promedio</span>
            <div className="recipe-kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <div className="recipe-kpi-val">{formatCurrency(metrics.avgPrice)}</div>
            <div className="recipe-kpi-sub">Por tabla completa (10 cortes)</div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros de Categorías */}
      <div className="supplies-search-section">
        {/* 1. Buscador */}
        <div className="supplies-search-wrapper">
          <Search size={16} className="supplies-search-icon" />
          <input
            type="text"
            placeholder="Buscar maki o ingrediente (ej. Salmón, Palta, Nori)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 2. Botones de Categorías en píldoras directamente debajo del buscador */}
        <div className="supplies-categories-bar">
          {/* Botón 'Todas' */}
          <button
            type="button"
            className={`supplies-cat-btn ${selectedCategory === 'Todas' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('Todas')}
          >
            <Tag size={13} className="supplies-cat-icon" />
            <span>Todas</span>
            <span className="supplies-cat-count">{recipes.length}</span>
          </button>

          {/* Categorías dinámicas */}
          {safeCategories.map((cat) => {
            const count = recipes.filter((r) => r.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`supplies-cat-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <Folder size={13} className="supplies-cat-icon" />
                <span>{cat}</span>
                <span className="supplies-cat-count">{count}</span>
              </button>
            );
          })}

          {(searchQuery || selectedCategory !== 'Todas') && (
            <button
              type="button"
              className="supplies-reset-filter-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todas');
              }}
              title="Restablecer filtros"
            >
              <RotateCcw size={12} />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Fichas Técnicas */}
      {filteredRecipes.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: '#64748b',
            }}
          >
            <ChefHat size={26} strokeWidth={1.75} />
          </div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.35rem' }}>
            No hay fichas técnicas registradas
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 1.25rem', maxWidth: '380px' }}>
            Registra las recetas de tus platos para calcular el food cost, margen de ganancia y controlar el consumo de insumos.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
              Crear Ficha Técnica
            </Button>
          </div>
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => {
            const currentPortion = portionSelection[recipe.id] || 10;
            const costDetails = getRecipeCostDetails(recipe, currentPortion);
            const capacityInfo = getCapacityInfo(recipe);

            return (
              <div key={recipe.id} className="recipe-card">
                {/* Cabecera de la Tarjeta */}
                <div className="recipe-card-header">
                  <div>
                    <h3 className="recipe-title">{recipe.name}</h3>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="recipe-badge-cat">{recipe.category || 'Makis'}</span>
                      {recipe.notes && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }} title={recipe.notes}>
                          • Con notas técnicas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selector 10 cortes vs 5 cortes */}
                  <div className="recipe-portion-pill">
                    <button
                      type="button"
                      className={`recipe-portion-btn ${currentPortion === 10 ? 'active' : ''}`}
                      onClick={() => setPortionSelection((prev) => ({ ...prev, [recipe.id]: 10 }))}
                      title="Porción completa: 10 cortes"
                    >
                      10 cortes
                    </button>
                    <button
                      type="button"
                      className={`recipe-portion-btn ${currentPortion === 5 ? 'active' : ''}`}
                      onClick={() => setPortionSelection((prev) => ({ ...prev, [recipe.id]: 5 }))}
                      title="Media porción: 5 cortes"
                    >
                      5 cortes
                    </button>
                  </div>
                </div>

                {/* Strip de Costos y Margen */}
                <div className="recipe-metrics-strip">
                  <div>
                    <div className="recipe-metric-label">Food Cost ({costDetails.foodCostPercent.toFixed(0)}%)</div>
                    <div className="recipe-metric-value">{formatCurrency(costDetails.foodCost)}</div>
                  </div>
                  <div>
                    <div className="recipe-metric-label">Precio Venta</div>
                    <div className="recipe-metric-value">{formatCurrency(costDetails.price)}</div>
                  </div>
                  <div>
                    <div className="recipe-metric-label">Margen ({costDetails.marginPercent.toFixed(0)}%)</div>
                    <div
                      className={`recipe-metric-value ${
                        costDetails.marginPercent >= 65 ? 'recipe-margin-positive' : 'recipe-margin-warning'
                      }`}
                    >
                      {formatCurrency(costDetails.margin)}
                    </div>
                  </div>
                </div>

                {/* Tabla de Ingredientes y Porciones */}
                <div style={{ flex: 1 }}>
                  <table className="recipe-ingredients-table">
                    <thead>
                      <tr>
                        <th>Ingrediente</th>
                        <th style={{ textAlign: 'right' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipe.ingredients.map((ing, i) => {
                        const calculatedQty =
                          currentPortion === 5 ? Number((ing.qty * 0.5).toFixed(2)) : ing.qty;
                        const calculatedCost =
                          currentPortion === 5 ? Number((ing.cost * 0.5).toFixed(2)) : ing.cost;

                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{ing.name}</td>
                            <td style={{ textAlign: 'right', color: '#64748b' }}>
                              {calculatedQty} {ing.unit}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                              {formatCurrency(calculatedCost)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Banner de Capacidad según Inventario Real */}
                {capacityInfo.maxPortions !== null && (
                  <div
                    className={`recipe-capacity-banner ${
                      capacityInfo.maxPortions === 0
                        ? 'out'
                        : capacityInfo.maxPortions <= 5
                        ? 'low'
                        : ''
                    }`}
                  >
                    <span>
                      Disponibilidad en stock:{' '}
                      <strong>
                        {capacityInfo.maxPortions}{' '}
                        {capacityInfo.maxPortions === 1 ? 'tabla' : 'tablas'}
                      </strong>
                    </span>
                    {capacityInfo.bottleneck && (
                      <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                        Límite: {capacityInfo.bottleneck}
                      </span>
                    )}
                  </div>
                )}

                {/* Acciones de la Tarjeta */}
                <div className="recipe-card-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Calculator}
                    onClick={() => handleOpenDiscountModal(recipe)}
                    title="Simular o aplicar descuento de stock de esta receta"
                  >
                    Descontar Stock
                  </Button>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="supplies-stepper-btn"
                      title="Editar ficha técnica"
                      onClick={() => handleOpenEditModal(recipe)}
                      style={{ width: '28px', height: '28px' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="supplies-stepper-btn"
                      title="Eliminar ficha técnica"
                      onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                      style={{ width: '28px', height: '28px', color: '#ef4444' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL: CREAR / EDITAR FICHA TÉCNICA Y RECETA
          ========================================================================= */}
      <Modal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        title={editingRecipe ? 'Editar Ficha Técnica' : 'Nueva Ficha Técnica de Maki'}
        maxWidth="680px"
      >
        <form onSubmit={handleSaveRecipe} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Nombre del Maki / Plato *
              </label>
              <input
                type="text"
                placeholder="Ej. Acevichado Maki (10 cortes)"
                value={recipeFormData.name}
                onChange={(e) => setRecipeFormData({ ...recipeFormData, name: e.target.value })}
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
                Categoría
              </label>
              <select
                value={recipeFormData.category}
                onChange={(e) => setRecipeFormData({ ...recipeFormData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Precio Venta (S/) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="28.00"
                value={recipeFormData.price}
                onChange={(e) => setRecipeFormData({ ...recipeFormData, price: e.target.value })}
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
          </div>

          {/* Tabla Dinámica de Ingredientes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                Ingredientes y Cantidad por Tabla (10 cortes)
              </label>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#2563eb',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={12} /> Agregar Ingrediente
              </button>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>
                      Insumo / Ingrediente
                    </th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '90px', fontWeight: 600, color: '#64748b' }}>
                      Cant.
                    </th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '85px', fontWeight: 600, color: '#64748b' }}>
                      Unidad
                    </th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '100px', fontWeight: 600, color: '#64748b' }}>
                      Costo (S/)
                    </th>
                    <th style={{ width: '36px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {recipeFormData.ingredients.map((ing) => (
                    <tr key={ing.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="text"
                          list="supplies-datalist"
                          placeholder="Nombre del insumo..."
                          value={ing.name}
                          onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                          }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={ing.qty}
                          onChange={(e) => handleIngredientChange(ing.id, 'qty', e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                          }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <select
                          value={ing.unit}
                          onChange={(e) => handleIngredientChange(ing.id, 'unit', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 4px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            background: '#ffffff',
                          }}
                        >
                          <option value="g">g</option>
                          <option value="Kg">Kg</option>
                          <option value="ml">ml</option>
                          <option value="Litro">Litro</option>
                          <option value="und">und</option>
                          <option value="hoja">hoja</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={ing.cost}
                          onChange={(e) => handleIngredientChange(ing.id, 'cost', e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                          }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(ing.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Datalist de insumos para autocompletar */}
              <datalist id="supplies-datalist">
                {supplies.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Resumen de Costos en Vivo en el Modal */}
          {(() => {
            const tempCost = recipeFormData.ingredients.reduce(
              (acc, ing) => acc + (parseFloat(ing.cost) || 0),
              0
            );
            const tempPrice = parseFloat(recipeFormData.price) || 0;
            const tempMargin = tempPrice - tempCost;
            const tempMarginPct = tempPrice > 0 ? (tempMargin / tempPrice) * 100 : 0;

            return (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Costo Total Insumos</div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                    {formatCurrency(tempCost)}
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Margen de Ganancia</div>
                  <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>
                    {formatCurrency(tempMargin)}
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>% Margen Operativo</div>
                  <strong
                    style={{
                      fontSize: '0.95rem',
                      color: tempMarginPct >= 65 ? '#16a34a' : '#d97706',
                    }}
                  >
                    {tempMarginPct.toFixed(1)}%
                  </strong>
                </div>
              </div>
            );
          })()}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Notas Técnicas / Emplatado (Opcional)
            </label>
            <textarea
              rows="2"
              placeholder="Instrucciones para la barra de sushi, armado de la esterilla, salsas o tiempo de cocción..."
              value={recipeFormData.notes}
              onChange={(e) => setRecipeFormData({ ...recipeFormData, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsRecipeModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingRecipe ? 'Guardar Cambios' : 'Registrar Ficha'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: SIMULADOR DE DESCUENTO DE STOCK POR VENTA / PRODUCCIÓN
          ========================================================================= */}
      <Modal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title="Descuento Automático de Stock de Insumos"
        maxWidth="580px"
      >
        {discountTargetRecipe && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#0f172a' }}>
                {discountTargetRecipe.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Categoría: {discountTargetRecipe.category} • Precio: {formatCurrency(discountTargetRecipe.price)}
              </div>
            </div>

            {/* Configuración del Descuento */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Porción por Tabla
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setDiscountPortion(10)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: `1px solid ${discountPortion === 10 ? '#0f172a' : '#cbd5e1'}`,
                      background: discountPortion === 10 ? '#0f172a' : '#ffffff',
                      color: discountPortion === 10 ? '#ffffff' : '#334155',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    10 cortes (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountPortion(5)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: `1px solid ${discountPortion === 5 ? '#0f172a' : '#cbd5e1'}`,
                      background: discountPortion === 5 ? '#0f172a' : '#ffffff',
                      color: discountPortion === 5 ? '#ffffff' : '#334155',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    5 cortes (50%)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Cantidad de Tablas
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={discountQuantity}
                  onChange={(e) => setDiscountQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* Preview de lo que se descontará del inventario */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Impacto en inventario ({discountQuantity} tabla(s) de {discountPortion} cortes):
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b' }}>Insumo</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b' }}>A descontar</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b' }}>Stock Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discountTargetRecipe.ingredients.map((ing, idx) => {
                      const factor = (discountPortion === 5 ? 0.5 : 1.0) * Number(discountQuantity);
                      const deductQty = Number((ing.qty * factor).toFixed(2));

                      // Buscar stock actual
                      const matched = supplies.find((s) =>
                        s.name.toLowerCase().includes(ing.name.toLowerCase())
                      );

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '5px 8px', fontWeight: 500 }}>{ing.name}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                            -{deductQty} {ing.unit}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', color: '#64748b' }}>
                            {matched ? `${matched.stock} ${matched.unit}` : 'No vinculado'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {discountSuccessMsg && (
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#166534',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={16} />
                {discountSuccessMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" type="button" onClick={() => setIsDiscountModalOpen(false)}>
                Cerrar
              </Button>
              <Button
                variant="primary"
                type="button"
                icon={Check}
                disabled={Boolean(discountSuccessMsg)}
                onClick={handleExecuteStockDiscount}
              >
                Aplicar Descuento a Inventario
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: GESTIONAR CATEGORÍAS DE RECETAS ================= */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Categorías de Fichas Técnicas y Recetas"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Form Crear Categoría */}
          <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Nueva categoría (ej. Fusión, Furai, Clásicos, Entradas)..."
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <Button variant="primary" type="submit" icon={Plus}>
              Agregar
            </Button>
          </form>

          {/* Lista de Categorías */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
              Categorías Activas ({categories.length})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {categories.map((cat) => (
                <div
                  key={cat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Folder size={14} />
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{cat}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    title={`Eliminar categoría "${cat}"`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>
              Listo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RecipesPage;
