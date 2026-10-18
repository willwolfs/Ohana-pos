import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  MoreVertical,
  X,
  AlertTriangle,
  Check,
  Package,
  HelpCircle,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  Upload,
  Camera,
  Folder,
  DollarSign,
  ArrowUpRight,
  TrendingDown,
  Edit3,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Pizza,
  UtensilsCrossed,
  Sparkles,
  Coffee,
  Cake,
  Tag,
  Boxes,
  AlignJustify,
  ChevronUp,
  FolderPlus,
  Hash,
  Flame,
  Fish,
  Wine,
  GlassWater,
  IceCream2,
  Sandwich,
  Apple,
  Cookie,
  Soup,
  Beer,
  CupSoda,
  Percent,
  Zap,
  ShoppingBag,
  Salad,
  Citrus,
  Candy
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import '../styles/ProductsPage.css';

// Lista completa de iconos seleccionables para categorías
export const ALL_CATEGORY_ICONS = [
  { id: 'UtensilsCrossed', label: 'Platos / General', icon: UtensilsCrossed },
  { id: 'Pizza', label: 'Pizzas / Horno', icon: Pizza },
  { id: 'CupSoda', label: 'Gaseosas / Bebidas', icon: CupSoda },
  { id: 'Citrus', label: 'Jugos / Cítricos', icon: Citrus },
  { id: 'GlassWater', label: 'Frappes / Batidos', icon: GlassWater },
  { id: 'IceCream2', label: 'Helados / Fríos', icon: IceCream2 },
  { id: 'Fish', label: 'Makis / Sushi / Pescados', icon: Fish },
  { id: 'Sandwich', label: 'Hamburguesas / Sandwiches', icon: Sandwich },
  { id: 'Layers', label: 'Combos / Packs', icon: Layers },
  { id: 'Percent', label: 'Promos / Ofertas', icon: Percent },
  { id: 'Coffee', label: 'Café / Calientes', icon: Coffee },
  { id: 'Cake', label: 'Postres / Tortas', icon: Cake },
  { id: 'Flame', label: 'A la Parrilla / Brasas', icon: Flame },
  { id: 'Salad', label: 'Ensaladas / Guarnición', icon: Salad },
  { id: 'Beer', label: 'Cervezas / Licores', icon: Beer },
  { id: 'Wine', label: 'Vinos / Copas', icon: Wine },
  { id: 'Soup', label: 'Sopas / Caldos', icon: Soup },
  { id: 'Cookie', label: 'Galletas / Snacks', icon: Cookie },
  { id: 'Candy', label: 'Dulces / Golosinas', icon: Candy },
  { id: 'Apple', label: 'Frutas / Saludable', icon: Apple },
  { id: 'Sparkles', label: 'Especial / Favoritos', icon: Sparkles },
  { id: 'Zap', label: 'Rápidos / Express', icon: Zap },
  { id: 'Tag', label: 'Etiquetas', icon: Tag },
  { id: 'Package', label: 'Caja / Para llevar', icon: Package },
];

export const getCategoryIconComponent = (iconId, catName = '') => {
  if (iconId) {
    const found = ALL_CATEGORY_ICONS.find((opt) => opt.id === iconId);
    if (found) return found.icon;
  }
  const n = (catName || '').toLowerCase();
  if (n.includes('pizza')) return Pizza;
  if (n.includes('maki') || n.includes('sushi') || n.includes('roll') || n.includes('pescado')) return Fish;
  if (n.includes('gaseosa') || n.includes('soda')) return CupSoda;
  if (n.includes('jugo') || n.includes('fruta') || n.includes('citrico')) return Citrus;
  if (n.includes('frappe') || n.includes('smoothie') || n.includes('batido')) return GlassWater;
  if (n.includes('helado')) return IceCream2;
  if (n.includes('combo') || n.includes('pack') || n.includes('tabla')) return Layers;
  if (n.includes('promo') || n.includes('oferta') || n.includes('descuento')) return Percent;
  if (n.includes('hamburguesa') || n.includes('sandwich') || n.includes('pan')) return Sandwich;
  if (n.includes('cerveza') || n.includes('trago')) return Beer;
  if (n.includes('vino') || n.includes('coctel') || n.includes('bar')) return Wine;
  if (n.includes('bebida') || n.includes('cafe')) return Coffee;
  if (n.includes('postre') || n.includes('dulce') || n.includes('torta')) return Cake;
  if (n.includes('brasa') || n.includes('parrilla') || n.includes('carne')) return Flame;
  if (n.includes('ensalada') || n.includes('guarnicion')) return Salad;
  if (n.includes('sopa') || n.includes('caldo')) return Soup;
  if (n.includes('snack') || n.includes('caja')) return Package;
  return UtensilsCrossed;
};

// Categorías iniciales basadas en el sistema
export const DEFAULT_CATEGORIES = [
  { id: 'cat_combos', name: 'Combos' },
  { id: 'cat_pizzas', name: 'Pizzas' },
  { id: 'cat_guarniciones', name: 'Guarniciones' },
  { id: 'cat_gaseosas', name: 'Gaseosas' },
  { id: 'cat_hamburguesas', name: 'Hamburguesas' },
  { id: 'cat_jugos', name: 'Jugos' },
];

export const ProductsPage = () => {
  // Categorías
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('ohana_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  // Productos
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('ohana_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Limpiar semillas antiguas si las hay
          const mockIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
          const cleaned = parsed.filter((p) => !mockIds.includes(p.id));
          return cleaned.map((p) => ({
            ...p,
            stock: p.stock !== undefined ? Number(p.stock) : 0,
            cost: p.cost !== undefined ? Number(p.cost) : 0,
            price: Number(p.price || 0),
            sku: p.sku || p.code || '',
            brand: p.brand || '',
            description: p.description || p.pieces || '',
          }));
        }
      }
    } catch {}
    return [];
  });

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'none' | category.name
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Modo de vista: 'table' (filas) | 'cards' (carta)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('ohana_products_view_mode') || 'table';
    } catch {
      return 'table';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('ohana_products_view_mode', mode);
    } catch {}
  };

  // Ordenamiento
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newBrandInput, setNewBrandInput] = useState('');
  const [customBrands, setCustomBrands] = useState(() => {
    try {
      const saved = localStorage.getItem('ohana_custom_brands');
      return saved ? JSON.parse(saved) : ['Sin marca'];
    } catch {
      return ['Sin marca'];
    }
  });

  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [bulkPriceType, setBulkPriceType] = useState('PERCENT_INCREASE'); // PERCENT_INCREASE | PERCENT_DECREASE | FIXED_AMOUNT
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [bulkPriceCategory, setBulkPriceCategory] = useState('all');

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [stockToAdjustProd, setStockToAdjustProd] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');

  // Menús desplegables
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const optionsRef = useRef(null);
  const importFileRef = useRef(null);
  const scrollRef = useRef(null);

  const handleScrollCategories = (direction) => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Form states producto (Información Básica)
  const [prodName, setProdName] = useState('');
  const [prodImages, setProdImages] = useState([]);
  const [prodImage, setProdImage] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodBrand, setProdBrand] = useState('Sin marca');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [additionalBarcodes, setAdditionalBarcodes] = useState([]);
  const [newAdditionalBarcode, setNewAdditionalBarcode] = useState('');

  // Form states producto (Precios y Clasificación)
  const [prodCost, setProdCost] = useState('');
  const [prodWeight, setProdWeight] = useState('');
  const [prodPurchaseDate, setProdPurchaseDate] = useState('');
  const [prodPrice, setProdPrice] = useState(''); // Público
  const [prodWholesalePrice, setProdWholesalePrice] = useState(''); // Mayorista
  const [prodVipPrice, setProdVipPrice] = useState(''); // VIP
  const [prodSpecialPrice, setProdSpecialPrice] = useState(''); // Especial
  const [prodAutoPrice, setProdAutoPrice] = useState(false); // Aplicar precio automático según cantidad
  const [prodUnit, setProdUnit] = useState('Unidad');
  const [prodIgvType, setProdIgvType] = useState('Exonerado');
  const [prodSunatCode, setProdSunatCode] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodStock, setProdStock] = useState('0');

  // Marcas disponibles
  const availableBrands = useMemo(() => {
    const set = new Set(['Sin marca', ...customBrands]);
    products.forEach((p) => {
      if (p.brand && p.brand.trim() && p.brand.trim() !== 'Sin marca') {
        set.add(p.brand.trim());
      }
    });
    return Array.from(set);
  }, [products, customBrands]);

  // Form state categoría nueva
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState('UtensilsCrossed');

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setIsOptionsOpen(false);
      }
      if (!e.target.closest('.row-actions-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Persistir cambios
  useEffect(() => {
    localStorage.setItem('ohana_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('ohana_products', JSON.stringify(products));
    window.dispatchEvent(new Event('storage'));
  }, [products]);

  // Cálculos de métricas KPI
  const metrics = useMemo(() => {
    const total = products.length;

    // Valor de inventario: suma de (precio * stock) si stock > 0, o suma de precios
    const inventoryVal = products.reduce((acc, p) => {
      const s = Number(p.stock) || 0;
      return acc + (Number(p.price || 0) * s);
    }, 0);

    const costVal = products.reduce((acc, p) => {
      const s = Number(p.stock) || 0;
      return acc + (Number(p.cost || 0) * s);
    }, 0);

    const lowStockCount = products.filter((p) => {
      const s = Number(p.stock) || 0;
      const min = Number(p.minStock) || 5;
      return s <= min;
    }).length;

    return {
      total,
      inventoryVal,
      costVal,
      lowStockCount,
    };
  }, [products]);

  // Filtrado y ordenamiento de productos
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      // Categoría
      if (selectedCategory === 'none') {
        if (p.category && p.category !== 'Sin categoría' && p.category !== 'General') return false;
      } else if (selectedCategory !== 'all') {
        if ((p.category || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = (p.name || '').toLowerCase().includes(q);
        const mCat = (p.category || '').toLowerCase().includes(q);
        const mSku = (p.sku || p.code || '').toLowerCase().includes(q);
        const mBrand = (p.brand || '').toLowerCase().includes(q);
        if (!mName && !mCat && !mSku && !mBrand) return false;
      }

      return true;
    });

    // Ordenar
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'price' || sortField === 'cost' || sortField === 'stock') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
        return sortAsc ? valA - valB : valB - valA;
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [products, selectedCategory, searchQuery, sortField, sortAsc]);

  const handleToggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Selección múltiple
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedProductIds.length === 0) return;
    if (window.confirm(`¿Estás seguro de eliminar ${selectedProductIds.length} producto(s) seleccionado(s)?`)) {
      setProducts((prev) => prev.filter((p) => !selectedProductIds.includes(p.id)));
      setSelectedProductIds([]);
      showToast('Productos eliminados');
    }
  };

  // Generar SKU automático
  const handleGenerateSku = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setProdSku(`SKU-${randomNum}`);
  };

  // Agregar y remover códigos de barras adicionales
  const handleAddAdditionalBarcode = (e) => {
    if (e) e.preventDefault();
    const trimmed = newAdditionalBarcode.trim();
    if (!trimmed) return;
    if (!additionalBarcodes.includes(trimmed)) {
      setAdditionalBarcodes([...additionalBarcodes, trimmed]);
    }
    setNewAdditionalBarcode('');
  };

  const handleRemoveAdditionalBarcode = (codeToRemove) => {
    setAdditionalBarcodes(additionalBarcodes.filter((c) => c !== codeToRemove));
  };

  // Subir hasta 5 imágenes
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - prodImages.length;
    if (remainingSlots <= 0) {
      showToast('Máximo 5 imágenes permitidas', 'error');
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        setProdImages((prev) => {
          if (prev.length >= 5) return prev;
          const next = [...prev, result];
          if (!prodImage) setProdImage(result);
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove) => {
    const updated = prodImages.filter((_, idx) => idx !== indexToRemove);
    setProdImages(updated);
    if (prodImage === prodImages[indexToRemove]) {
      setProdImage(updated[0] || '');
    }
  };

  // Modal Producto
  const handleOpenProductModal = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProdName(prod.name || '');
      const existingImgs = Array.isArray(prod.images) && prod.images.length > 0
        ? prod.images
        : (prod.image ? [prod.image] : []);
      setProdImages(existingImgs);
      setProdImage(prod.image || existingImgs[0] || '');
      setProdDescription(prod.description || prod.pieces || '');
      setProdBrand(prod.brand || 'Sin marca');
      setProdSku(prod.sku || prod.code || '');
      setProdBarcode(prod.barcode || '');
      setAdditionalBarcodes(Array.isArray(prod.additionalBarcodes) ? prod.additionalBarcodes : []);
      setNewAdditionalBarcode('');
      setProdCost(prod.cost !== undefined && prod.cost !== '' ? String(prod.cost) : '');
      setProdWeight(prod.weight !== undefined && prod.weight !== '' ? String(prod.weight) : '');
      setProdPurchaseDate(prod.purchaseDate || '');
      setProdPrice(prod.price !== undefined && prod.price !== '' ? String(prod.price) : '');
      setProdWholesalePrice(prod.wholesalePrice !== undefined && prod.wholesalePrice !== '' ? String(prod.wholesalePrice) : '');
      setProdVipPrice(prod.vipPrice !== undefined && prod.vipPrice !== '' ? String(prod.vipPrice) : '');
      setProdSpecialPrice(prod.specialPrice !== undefined && prod.specialPrice !== '' ? String(prod.specialPrice) : '');
      setProdAutoPrice(!!prod.autoPriceByQty);
      setProdUnit(prod.unit || 'Unidad');
      setProdIgvType(prod.igvType || 'Exonerado');
      setProdSunatCode(prod.sunatCode || '');
      setProdCategory(prod.category || 'Sin categoría');
      setProdStock(prod.stock !== undefined ? String(prod.stock) : '0');
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdImages([]);
      setProdImage('');
      setProdDescription('');
      setProdBrand('Sin marca');
      setProdSku('');
      setProdBarcode('');
      setAdditionalBarcodes([]);
      setNewAdditionalBarcode('');
      setProdCost('');
      setProdWeight('');
      setProdPurchaseDate('');
      setProdPrice('');
      setProdWholesalePrice('');
      setProdVipPrice('');
      setProdSpecialPrice('');
      setProdAutoPrice(false);
      setProdUnit('Unidad');
      setProdIgvType('Exonerado');
      setProdSunatCode('');
      setProdCategory(selectedCategory !== 'all' && selectedCategory !== 'none' ? selectedCategory : 'Sin categoría');
      setProdStock('0');
    }
    setActiveMenuId(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast('Ingresa el nombre del producto', 'error');
      return;
    }

    const priceNum = prodPrice !== '' ? parseFloat(prodPrice) || 0 : 0;
    const costNum = prodCost !== '' ? parseFloat(prodCost) || 0 : 0;
    const stockNum = parseInt(prodStock, 10) || 0;
    const primaryImg = prodImages.length > 0 ? prodImages[0] : (prodImage || '');

    const productPayload = {
      name: prodName.trim(),
      category: prodCategory || 'Sin categoría',
      price: priceNum,
      cost: costNum,
      sku: prodSku.trim(),
      brand: prodBrand.trim() === 'Sin marca' ? '' : prodBrand.trim(),
      stock: stockNum,
      description: prodDescription.trim(),
      pieces: prodDescription.trim(),
      image: primaryImg,
      images: prodImages,
      weight: prodWeight !== '' ? parseFloat(prodWeight) || 0 : 0,
      purchaseDate: prodPurchaseDate,
      wholesalePrice: prodWholesalePrice !== '' ? parseFloat(prodWholesalePrice) || 0 : null,
      vipPrice: prodVipPrice !== '' ? parseFloat(prodVipPrice) || 0 : null,
      specialPrice: prodSpecialPrice !== '' ? parseFloat(prodSpecialPrice) || 0 : null,
      autoPriceByQty: prodAutoPrice,
      unit: prodUnit,
      igvType: prodIgvType,
      sunatCode: prodSunatCode.trim(),
      barcode: prodBarcode.trim(),
      additionalBarcodes: additionalBarcodes,
    };

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, ...productPayload }
            : p
        )
      );
      showToast('Producto actualizado correctamente');
    } else {
      const newProd = {
        id: 'p_' + Date.now(),
        ...productPayload,
      };
      setProducts((prev) => [newProd, ...prev]);
      showToast('Producto creado con éxito');
    }

    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (prodId) => {
    if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
      setActiveMenuId(null);
      showToast('Producto eliminado');
    }
  };

  // Ajuste rápido de stock
  const handleOpenStockModal = (prod = null) => {
    if (prod) {
      setStockToAdjustProd(prod);
      setNewStockValue(String(prod.stock || 0));
    } else if (selectedProductIds.length > 0) {
      const firstSelected = products.find((p) => selectedProductIds.includes(p.id));
      if (firstSelected) {
        setStockToAdjustProd(firstSelected);
        setNewStockValue(String(firstSelected.stock || 0));
      }
    }
    setActiveMenuId(null);
    setIsAdjustStockModalOpen(true);
  };

  const handleSaveAdjustStock = (e) => {
    e.preventDefault();
    if (!stockToAdjustProd) return;

    const val = parseInt(newStockValue, 10) || 0;
    
    // Si se abrió desde la barra de selección múltiple y hay varios seleccionados que incluyen este producto
    if (selectedProductIds.length > 1 && selectedProductIds.includes(stockToAdjustProd.id)) {
      setProducts((prev) =>
        prev.map((p) => (selectedProductIds.includes(p.id) ? { ...p, stock: val } : p))
      );
      setIsAdjustStockModalOpen(false);
      showToast(`Stock de ${selectedProductIds.length} productos actualizado a ${val}`);
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === stockToAdjustProd.id ? { ...p, stock: val } : p))
      );
      setIsAdjustStockModalOpen(false);
      showToast(`Stock de "${stockToAdjustProd.name}" actualizado a ${val}`);
    }
  };

  // Exportar catálogo CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      showToast('No hay productos para exportar', 'error');
      return;
    }
    const headers = ['SKU', 'Nombre', 'Categoria', 'Precio', 'Costo', 'Stock', 'Marca'];
    const rows = products.map((p) => [
      `"${p.sku || p.code || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      p.price || 0,
      p.cost || 0,
      p.stock || 0,
      `"${p.brand || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalogo_productos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOptionsOpen(false);
    showToast('Catálogo descargado en CSV');
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const trimmed = newCategoryName.trim();
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('La categoría ya existe', 'error');
      return;
    }
    const newCat = {
      id: 'cat_' + Date.now(),
      name: trimmed,
      icon: selectedCategoryIcon || 'UtensilsCrossed',
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCategoryName('');
    showToast(`Categoría "${trimmed}" creada con éxito`);
  };

  const handleUpdateCategoryIcon = (catIdOrName, newIconId) => {
    setCategories((prev) =>
      prev.map((c) => {
        if ((c.id && c.id === catIdOrName) || c.name === catIdOrName) {
          return { ...c, icon: newIconId };
        }
        return c;
      })
    );
    showToast('Icono de categoría actualizado');
  };

  const handleDeleteCategory = (catName) => {
    if (window.confirm(`¿Eliminar la categoría "${catName}"? Los productos pasarán a 'General'.`)) {
      setCategories((prev) => prev.filter((c) => c.name !== catName));
      setProducts((prev) =>
        prev.map((p) => (p.category === catName ? { ...p, category: 'General' } : p))
      );
      if (selectedCategory === catName) setSelectedCategory('all');
      showToast(`Categoría "${catName}" eliminada`);
    }
  };

  // Importar productos desde CSV
  const handleImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          showToast('El archivo no contiene filas válidas', 'error');
          return;
        }

        const startIdx = lines[0].toLowerCase().includes('nombre') || lines[0].toLowerCase().includes('sku') ? 1 : 0;
        let importedCount = 0;
        const newProductsList = [...products];

        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
          if (cols.length >= 2 && cols[1]) {
            const skuVal = cols[0] || `SKU-${Date.now().toString().slice(-4)}${i}`;
            const nameVal = cols[1];
            const catVal = cols[2] || 'General';
            const priceVal = parseFloat(cols[3]) || 0;
            const costVal = parseFloat(cols[4]) || 0;
            const stockVal = parseInt(cols[5], 10) || 0;
            const brandVal = cols[6] || '';

            const existingIdx = newProductsList.findIndex(
              (p) => (p.sku && p.sku === skuVal) || p.name.toLowerCase() === nameVal.toLowerCase()
            );

            const prodObj = {
              id: existingIdx >= 0 ? newProductsList[existingIdx].id : 'p_' + (Date.now() + i),
              name: nameVal,
              sku: skuVal,
              category: catVal,
              price: priceVal,
              cost: costVal,
              stock: stockVal,
              brand: brandVal,
            };

            if (existingIdx >= 0) {
              newProductsList[existingIdx] = { ...newProductsList[existingIdx], ...prodObj };
            } else {
              newProductsList.push(prodObj);
            }
            importedCount++;
          }
        }

        setProducts(newProductsList);
        showToast(`¡Se importaron/actualizaron ${importedCount} productos con éxito!`);
      } catch (err) {
        console.error('Error importando catálogo:', err);
        showToast('Error al procesar el archivo CSV/Excel', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Actualizar precios masivamente
  const handleApplyBulkPrices = (e) => {
    e.preventDefault();
    const val = parseFloat(bulkPriceValue);
    if (isNaN(val) || val <= 0) {
      showToast('Ingresa un valor numérico válido mayor a 0', 'error');
      return;
    }

    let updatedCount = 0;
    const updated = products.map((p) => {
      if (bulkPriceCategory !== 'all' && p.category !== bulkPriceCategory) {
        return p;
      }

      let newPrice = p.price || 0;
      if (bulkPriceType === 'PERCENT_INCREASE') {
        newPrice = Math.round((newPrice * (1 + val / 100)) * 100) / 100;
      } else if (bulkPriceType === 'PERCENT_DECREASE') {
        newPrice = Math.max(0, Math.round((newPrice * (1 - val / 100)) * 100) / 100);
      } else if (bulkPriceType === 'FIXED_AMOUNT') {
        newPrice = Math.round((newPrice + val) * 100) / 100;
      }

      updatedCount++;
      return { ...p, price: newPrice };
    });

    setProducts(updated);
    setIsBulkPriceModalOpen(false);
    setBulkPriceValue('');
    showToast(`¡Precios actualizados en ${updatedCount} productos!`);
  };

  // Gestión de marcas
  const handleCreateBrand = (e) => {
    e.preventDefault();
    const trimmed = newBrandInput.trim();
    if (!trimmed) return;
    if (customBrands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      showToast('La marca ya existe', 'error');
      return;
    }
    const updated = [...customBrands, trimmed];
    setCustomBrands(updated);
    localStorage.setItem('ohana_custom_brands', JSON.stringify(updated));
    setNewBrandInput('');
    showToast(`Marca "${trimmed}" agregada`);
  };

  const handleDeleteBrand = (brandName) => {
    if (brandName === 'Sin marca') return;
    const updated = customBrands.filter((b) => b !== brandName);
    setCustomBrands(updated);
    localStorage.setItem('ohana_custom_brands', JSON.stringify(updated));
    showToast(`Marca "${brandName}" eliminada`);
  };

  // Unificar códigos SKU y de barras
  const handleUnifyCodes = () => {
    let modified = 0;
    const updated = products.map((p, idx) => {
      let changed = false;
      let newSku = p.sku;
      let newBarcode = p.barcode;

      if (!newSku || newSku.trim() === '') {
        newSku = `SKU-${String(1001 + idx).padStart(4, '0')}`;
        changed = true;
      }
      if (newBarcode && typeof newBarcode === 'string') {
        const cleanBc = newBarcode.trim();
        if (cleanBc !== newBarcode) {
          newBarcode = cleanBc;
          changed = true;
        }
      }

      if (changed) {
        modified++;
        return { ...p, sku: newSku, barcode: newBarcode };
      }
      return p;
    });

    if (modified > 0) {
      setProducts(updated);
      showToast(`¡Códigos unificados! Se asignaron códigos a ${modified} productos.`);
    } else {
      showToast('Todos los productos ya cuentan con códigos unificados.');
    }
  };

  return (
    <div className="products-page-wrapper">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 18px',
          background: toastMessage.type === 'error' ? '#ef4444' : '#0f172a',
          color: '#ffffff',
          borderRadius: '8px',
          fontSize: '0.84rem',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
        }}>
          {toastMessage.msg}
        </div>
      )}

      {/* 1. Header Principal */}
      <div className="products-top-header">
        <div className="products-title-group">
          <div className="products-title-row">
            <h1 className="products-main-title">Productos y Servicios</h1>
            <button
              type="button"
              className="products-help-link"
              onClick={() => setIsHelpModalOpen(true)}
            >
              <HelpCircle size={14} />
              <span>¿Cómo funciona esta página?</span>
            </button>
          </div>
          <p className="products-main-subtitle">Gestiona tu catálogo de productos y servicios</p>
        </div>

        <div className="products-header-actions" ref={optionsRef}>
          {/* Input oculto para importar productos desde archivo CSV / Excel */}
          <input
            type="file"
            ref={importFileRef}
            accept=".csv, text/csv, .txt"
            style={{ display: 'none' }}
            onChange={handleImportCSV}
          />

          {/* Contenedor relativo del Botón Opciones y su Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`btn-options-dropdown ${isOptionsOpen ? 'active' : ''}`}
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            >
              <MoreVertical size={15} />
              <span>Opciones</span>
              {isOptionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isOptionsOpen && (
              <div className="options-popover-menu">
              {/* 1. Importar productos */}
              <button
                type="button"
                className="options-popover-item"
                onClick={() => {
                  setIsOptionsOpen(false);
                  importFileRef.current?.click();
                }}
              >
                <Upload size={15} color="#475569" />
                <span>Importar productos</span>
              </button>

              {/* 2. Exportar a Excel */}
              <button
                type="button"
                className="options-popover-item"
                onClick={() => {
                  setIsOptionsOpen(false);
                  handleExportCSV();
                }}
              >
                <FileSpreadsheet size={15} color="#475569" />
                <span>Exportar a Excel</span>
              </button>

              <div className="options-popover-divider" />

              {/* 3. Actualizar precios */}
              <button
                type="button"
                className="options-popover-item"
                onClick={() => {
                  setIsOptionsOpen(false);
                  setIsBulkPriceModalOpen(true);
                }}
              >
                <DollarSign size={15} color="#475569" />
                <span>Actualizar precios</span>
              </button>

              <div className="options-popover-divider" />

              {/* 4. Gestionar categorías */}
              <button
                type="button"
                className="options-popover-item"
                onClick={() => {
                  setIsOptionsOpen(false);
                  setIsCategoryModalOpen(true);
                }}
              >
                <FolderPlus size={15} color="#475569" />
                <span>Gestionar categorías</span>
              </button>

              {/* 5. Gestionar marcas */}
              <button
                type="button"
                className="options-popover-item"
                onClick={() => {
                  setIsOptionsOpen(false);
                  setIsBrandModalOpen(true);
                }}
              >
                <Tag size={15} color="#475569" />
                <span>Gestionar marcas</span>
              </button>

              {/* 6. Unificar códigos */}
              <button
                type="button"
                className="options-popover-item"
                onClick={() => {
                  setIsOptionsOpen(false);
                  handleUnifyCodes();
                }}
              >
                <Hash size={15} color="#475569" />
                <span>Unificar códigos</span>
              </button>
            </div>
          )}
          </div>

          {/* Botón Nuevo Producto */}
          <button
            type="button"
            className="btn-new-product-primary"
            onClick={() => handleOpenProductModal()}
          >
            <Plus size={16} />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* 2. Top 3 KPI Cards */}
      <div className="products-kpi-grid">
        {/* Card 1: Total Productos */}
        <div className="products-kpi-card">
          <div className="products-kpi-info">
            <span className="products-kpi-label">Total Productos</span>
            <span className="products-kpi-value">{metrics.total}</span>
          </div>
          <div className="products-kpi-icon icon-blue-box">
            <Package size={20} />
          </div>
        </div>

        {/* Card 2: Valor Inventario */}
        <div className="products-kpi-card">
          <div className="products-kpi-info">
            <span className="products-kpi-label">Valor Inventario</span>
            <span className="products-kpi-value">
              {formatCurrency(metrics.inventoryVal)}
            </span>
            <span className="products-kpi-subtext">
              Costo: {formatCurrency(metrics.costVal)}
            </span>
          </div>
          <div className="products-kpi-icon icon-green-currency">
            <span>$</span>
          </div>
        </div>

        {/* Card 3: Stock Bajo */}
        <div className="products-kpi-card">
          <div className="products-kpi-info">
            <span className="products-kpi-label">Stock Bajo</span>
            <span className="products-kpi-value val-amber">{metrics.lowStockCount}</span>
            <span className="products-kpi-subtext">Conviene reabastecer pronto</span>
          </div>
          <div className="products-kpi-icon icon-amber-alert">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* 3. Barra de Búsqueda */}
      <div className="products-search-bar-wrapper">
        <Search size={16} className="products-search-icon" />
        <input
          type="text"
          className="products-search-input"
          placeholder="Buscar por código, nombre, categoría..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 4. Categorías Rectangulares con Iconos */}
      {categories.length > 0 && (
        <div className="admin-categories-section">
          <div className="categories-scroll-wrapper" ref={scrollRef}>
            {/* Botón 'Todos' */}
            <button
              type="button"
              className={`category-card ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <div className="category-icon-circle">
                <LayoutGrid size={17} />
              </div>
              <span>Todos</span>
            </button>

            {/* Categorías dinámicas */}
            {categories.map((cat) => {
              const IconComponent = getCategoryIconComponent(cat.icon, cat.name);
              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  className={`category-card ${
                    selectedCategory.toLowerCase() === cat.name.toLowerCase() ? 'active' : ''
                  }`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  <div className="category-icon-circle">
                    <IconComponent size={17} />
                  </div>
                  <span>{cat.name}</span>
                </button>
              );
            })}

            {/* Atajo para crear nueva categoría de producto */}
            <button
              type="button"
              className="category-card btn-add-category-card"
              onClick={() => setIsCategoryModalOpen(true)}
              title="Crear o administrar categorías"
            >
              <div className="category-icon-circle">
                <Plus size={15} />
              </div>
              <span>Nueva Categoría</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Tabla de Productos */}
      <div className="products-table-card">
        {/* Barra superior de conteo y acciones masivas */}
        <div className="products-table-top-bar">
          <div className="table-selection-count">
            <input
              type="checkbox"
              checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
              onChange={handleToggleSelectAll}
              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <span>{filteredProducts.length} productos</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedProductIds.length > 0 ? (
              <div className="bulk-selection-actions">
                <span className="bulk-selection-label">
                  {selectedProductIds.length} seleccionado(s)
                </span>
                
                {/* Botón 1: Eliminar (Basura) */}
                <button
                  type="button"
                  className="btn-bulk-pill btn-bulk-delete"
                  onClick={handleDeleteSelected}
                  title="Eliminar producto(s) seleccionado(s)"
                >
                  <Trash2 size={13} />
                  <span>Eliminar</span>
                </button>

                {/* Botón 2: Editar */}
                <button
                  type="button"
                  className="btn-bulk-pill btn-bulk-edit"
                  onClick={() => {
                    const targetProd = products.find((p) => selectedProductIds.includes(p.id));
                    if (targetProd) handleOpenProductModal(targetProd);
                  }}
                  title="Editar producto seleccionado"
                >
                  <Edit2 size={13} />
                  <span>Editar</span>
                </button>

                {/* Botón 3: Ajuste de stock */}
                <button
                  type="button"
                  className="btn-bulk-pill btn-bulk-stock"
                  onClick={() => handleOpenStockModal()}
                  title="Ajustar stock de producto(s) seleccionado(s)"
                >
                  <Edit3 size={13} />
                  <span>Ajuste de stock</span>
                </button>
              </div>
            ) : (
              <span className="table-selection-hint">
                Selecciona productos para ver las acciones
              </span>
            )}

            {/* Selector de Modo de Vista: Filas (Tabla) vs Carta (Tarjetas) */}
            <div className="view-mode-toggle-group">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => handleSetViewMode('table')}
                title="Vista en Filas (Tabla)"
              >
                <AlignJustify size={14} />
                <span>Filas</span>
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => handleSetViewMode('cards')}
                title="Vista en Carta (Tarjetas)"
              >
                <LayoutGrid size={14} />
                <span>Carta</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenido: Tabla (Filas) vs Carta (Tarjetas) */}
        {viewMode === 'table' ? (
          <div className="products-table-wrapper">
          {filteredProducts.length === 0 ? (
            <div className="products-empty-table">
              <div className="products-empty-icon">
                <Package size={26} />
              </div>
              <h4>No se encontraron productos</h4>
              <p>
                {searchQuery
                  ? `No hay coincidencias para "${searchQuery}"`
                  : 'Aún no tienes productos en esta vista. Haz clic en "Nuevo Producto" para registrar.'}
              </p>
            </div>
          ) : (
            <table className="products-list-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                  <th style={{ width: '48px' }}></th>
                  <th className="sortable" onClick={() => handleToggleSort('sku')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>SKU</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleToggleSort('name')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>Nombre</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>DESCRIPCIÓN</th>
                  <th className="sortable" onClick={() => handleToggleSort('price')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>Precio</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleToggleSort('cost')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>COSTO</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>UTILIDAD</th>
                  <th className="sortable" onClick={() => handleToggleSort('category')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>Categoría</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Marca</th>
                  <th className="sortable" onClick={() => handleToggleSort('stock')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>Stock</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ width: '50px', textAlign: 'center' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => {
                  const price = Number(prod.price || 0);
                  const cost = Number(prod.cost || 0);
                  const utility = price - cost;
                  const utilityPct = cost > 0
                    ? Math.round(((price - cost) / cost) * 100)
                    : (price > 0 ? 100 : 0);
                  const isPositiveUtil = utility >= 0;

                  const stockNum = Number(prod.stock || 0);
                  const isChecked = selectedProductIds.includes(prod.id);

                  return (
                    <tr key={prod.id}>
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(prod.id)}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                      </td>

                      {/* Imagen Thumbnail */}
                      <td>
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="product-img-thumb"
                          />
                        ) : (
                          <div className="product-img-thumb">
                            <Package size={16} color="#94a3b8" />
                          </div>
                        )}
                      </td>

                      {/* SKU */}
                      <td>
                        <span className="product-sku-tag">
                          {prod.sku || prod.code || '-'}
                        </span>
                      </td>

                      {/* Nombre */}
                      <td>
                        <span className="product-name-cell">{prod.name}</span>
                      </td>

                      {/* Descripción */}
                      <td>
                        <span className="product-desc-cell" title={prod.description || prod.pieces}>
                          {prod.description || prod.pieces || '-'}
                        </span>
                      </td>

                      {/* Precio */}
                      <td>
                        <div className="product-price-cell">
                          <span className="price-main">{formatCurrency(price)}</span>
                          <span className="price-unit">{prod.unit || 'Unidad'}</span>
                        </div>
                      </td>

                      {/* Costo */}
                      <td>
                        <span className="product-cost-cell">
                          {cost > 0 ? formatCurrency(cost) : '-'}
                        </span>
                      </td>

                      {/* Utilidad */}
                      <td>
                        <div className="product-profit-cell">
                          <span className={`profit-amount ${isPositiveUtil ? 'positive' : 'negative'}`}>
                            {isPositiveUtil ? '' : '-'}{formatCurrency(Math.abs(utility))}
                          </span>
                          <span className={`profit-percentage ${isPositiveUtil ? 'positive' : 'negative'}`}>
                            {utilityPct}%
                          </span>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td>
                        <span className="product-category-cell">
                          {prod.category || 'GENERAL'}
                        </span>
                      </td>

                      {/* Marca */}
                      <td>
                        {prod.brand ? (
                          <span className="product-brand-cell">{prod.brand}</span>
                        ) : (
                          <span className="product-brand-empty">-</span>
                        )}
                      </td>

                      {/* Stock */}
                      <td>
                        <span className={`product-stock-badge ${stockNum > 0 ? 'in-stock' : 'out-of-stock'}`}>
                          &gt; {stockNum}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td style={{ textAlign: 'center', position: 'relative' }} className="row-actions-container">
                        <button
                          type="button"
                          className="btn-row-actions"
                          onClick={() => setActiveMenuId(activeMenuId === prod.id ? null : prod.id)}
                          title="Acciones"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === prod.id && (
                          <div className="row-action-popover">
                            <button
                              type="button"
                              className="row-action-item"
                              onClick={() => handleOpenProductModal(prod)}
                            >
                              <Edit2 size={13} />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              className="row-action-item"
                              onClick={() => handleOpenStockModal(prod)}
                            >
                              <Edit3 size={13} />
                              <span>Ajustar Stock</span>
                            </button>
                            <button
                              type="button"
                              className="row-action-item danger"
                              onClick={() => handleDeleteProduct(prod.id)}
                            >
                              <Trash2 size={13} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="products-cards-wrapper">
          {filteredProducts.length === 0 ? (
            <div className="products-empty-table">
              <div className="products-empty-icon">
                <Package size={26} />
              </div>
              <h4>No se encontraron productos</h4>
              <p>
                {searchQuery
                  ? `No hay coincidencias para "${searchQuery}"`
                  : 'Aún no tienes productos en esta vista. Haz clic en "Nuevo Producto" para registrar.'}
              </p>
            </div>
          ) : (
            <div className="admin-products-grid">
              {filteredProducts.map((prod) => {
                const stockNum = Number(prod.stock !== undefined ? prod.stock : 0);
                const isLowStock = stockNum <= 5;
                const util = prod.price - (prod.cost || 0);

                return (
                  <div key={prod.id} className="admin-product-card">
                    <div className="admin-product-card-header">
                      <div className="admin-product-card-img-box">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="product-real-img" />
                        ) : (
                          <div className="product-no-img-placeholder">
                            <Package size={34} />
                            <span>Sin imagen</span>
                          </div>
                        )}
                      </div>

                      {/* Badges superiores: SKU y Stock */}
                      <div className="product-card-top-badges">
                        {prod.sku && <span className="card-sku-badge">{prod.sku}</span>}
                        <span className={`card-stock-badge ${isLowStock ? 'stock-low' : 'stock-ok'}`}>
                          Stock: {stockNum}
                        </span>
                      </div>

                      {/* Acciones flotantes */}
                      <div className="admin-product-card-actions">
                        <button
                          type="button"
                          className="action-dropdown-btn"
                          onClick={() => setActiveMenuId(activeMenuId === prod.id ? null : prod.id)}
                          title="Opciones"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === prod.id && (
                          <div className="product-card-popover-menu">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenProductModal(prod);
                              }}
                            >
                              <Edit2 size={13} /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenStockModal(prod);
                              }}
                            >
                              <Edit3 size={13} /> Ajustar Stock
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleDeleteProduct(prod.id);
                              }}
                            >
                              <Trash2 size={13} /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="admin-product-card-body">
                      <div className="card-cat-brand-row">
                        <span className="admin-product-category-tag">{prod.category || 'General'}</span>
                        {prod.brand && <span className="admin-product-brand-tag">{prod.brand}</span>}
                      </div>

                      <h4 className="admin-product-card-title" title={prod.name}>
                        {prod.name}
                      </h4>

                      {prod.description && (
                        <p className="admin-product-card-pieces" title={prod.description}>
                          {prod.description}
                        </p>
                      )}

                      <div className="admin-product-card-footer">
                        <div className="card-price-block">
                          <span className="card-price-label">Precio</span>
                          <span className="admin-product-card-price">{formatCurrency(prod.price)}</span>
                        </div>

                        <div className="card-util-block">
                          <span className="card-util-label">Utilidad</span>
                          <span className={`card-util-val ${util >= 0 ? 'util-pos' : 'util-neg'}`}>
                            {formatCurrency(util)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

      {/* ================= MODAL: NUEVO / EDITAR PRODUCTO (ESTILO REFERENCIA) ================= */}
      {isProductModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProductModalOpen(false)}>
          <div
            className="modal-dialog product-modal-dialog-large"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="product-modal-header">
              <h3 className="product-modal-title">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsProductModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="product-modal-form">
              <div className="product-modal-body-grid">
                {/* ================= COLUMNA IZQUIERDA: INFORMACIÓN BÁSICA ================= */}
                <div className="product-col-section">
                  <h4 className="product-col-heading">Información Básica</h4>

                  {/* Nombre */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Nombre</span>
                      <span className="req-star">*</span>
                      <span className="field-sub-note">(puedes presionar ENTER para saltar de línea)</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Nombre del producto o servicio"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="product-field-textarea"
                    />
                  </div>

                  {/* Imágenes */}
                  {/* Imágenes */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Imágenes</span>
                      <span className="field-sub-note">(máx 5, arrastra para reordenar)</span>
                    </label>

                    {prodImages.length === 0 ? (
                      /* Dropzone vacío inicial */
                      <label className="product-upload-dropzone">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={handleImageUpload}
                        />
                        <Upload size={24} color="#64748b" />
                        <span className="product-upload-dropzone-text">Subir imágenes</span>
                      </label>
                    ) : (
                      /* Dropzone con imágenes embebidas dentro */
                      <div className="product-upload-dropzone has-images">
                        <div className="product-thumbnails-grid">
                          {prodImages.map((img, idx) => (
                            <div key={idx} className="product-thumbnail-item">
                              <img src={img} alt={`Preview ${idx + 1}`} className="product-thumbnail-img" />
                              <button
                                type="button"
                                className="product-thumbnail-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(idx);
                                }}
                                title="Quitar imagen"
                              >
                                ✕
                              </button>
                            </div>
                          ))}

                          {/* Botón dentro del mismo recuadro para agregar más fotos si no llegó a 5 */}
                          {prodImages.length < 5 && (
                            <label className="product-thumbnail-add-slot" title="Añadir otra imagen">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleImageUpload}
                              />
                              <Plus size={20} color="#64748b" />
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Añadir</span>
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Descripción (Opcional) */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Descripción (Opcional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Descripción breve del producto o servicio"
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      className="product-field-textarea"
                    />
                  </div>

                  {/* Marca (Opcional) */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Marca (Opcional)</span>
                    </label>
                    <select
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      className="product-field-select cursor-pointer"
                    >
                      {availableBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* SKU / Código Interno */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>SKU / Código Interno</span>
                    </label>
                    <input
                      type="text"
                      placeholder="SKU-001"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      className="product-field-input"
                    />
                    <span className="product-field-helper">Código interno de tu negocio</span>
                    <button
                      type="button"
                      className="product-action-link"
                      onClick={handleGenerateSku}
                    >
                      Generar SKU automático
                    </button>
                  </div>

                  {/* Código de Barras */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Código de Barras</span>
                    </label>
                    <input
                      type="text"
                      placeholder="7501234567890"
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      className="product-field-input"
                    />
                    <span className="product-field-helper">EAN, UPC u otro</span>

                    {/* Sub-tarjeta Códigos adicionales */}
                    <div className="additional-barcodes-subcard">
                      <span className="additional-barcodes-title">
                        Códigos adicionales (mismo producto, varios códigos)
                      </span>
                      <div className="additional-barcode-row">
                        <input
                          type="text"
                          placeholder="Otro código de barras"
                          value={newAdditionalBarcode}
                          onChange={(e) => setNewAdditionalBarcode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAdditionalBarcode();
                            }
                          }}
                          className="product-field-input"
                        />
                        <button
                          type="button"
                          className="btn-add-additional-barcode"
                          onClick={handleAddAdditionalBarcode}
                          title="Añadir código de barras"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {additionalBarcodes.length > 0 && (
                        <div className="barcode-chips-wrap">
                          {additionalBarcodes.map((code, idx) => (
                            <span key={idx} className="barcode-chip">
                              <span>{code}</span>
                              <button
                                type="button"
                                className="barcode-chip-del"
                                onClick={() => handleRemoveAdditionalBarcode(code)}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <span className="product-field-helper">
                        Al escanear cualquiera de estos códigos, se agregará este mismo producto.
                      </span>
                    </div>
                  </div>
                </div>

                {/* ================= COLUMNA DERECHA: PRECIOS Y CLASIFICACIÓN ================= */}
                <div className="product-col-section">
                  <h4 className="product-col-heading">Precios y Clasificación</h4>

                  {/* Costo & Peso */}
                  <div className="product-two-cols-row">
                    <div className="product-field-group">
                      <label className="product-field-label">
                        <span>Costo</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={prodCost}
                        onChange={(e) => setProdCost(e.target.value)}
                        className="product-field-input"
                      />
                      <span className="product-field-helper">Opcional</span>
                    </div>

                    <div className="product-field-group">
                      <label className="product-field-label">
                        <span>Peso (kg)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={prodWeight}
                        onChange={(e) => setProdWeight(e.target.value)}
                        className="product-field-input"
                      />
                      <span className="product-field-helper">Opcional</span>
                    </div>
                  </div>

                  {/* Fecha de compra & Público */}
                  <div className="product-two-cols-row">
                    <div className="product-field-group">
                      <label className="product-field-label">
                        <span>Fecha de compra</span>
                      </label>
                      <input
                        type="date"
                        value={prodPurchaseDate}
                        onChange={(e) => setProdPurchaseDate(e.target.value)}
                        className="product-field-input"
                      />
                      <span className="product-field-helper">
                        Opcional · Se llena sola al registrar una compra
                      </span>
                    </div>

                    <div className="product-field-group">
                      <label className="product-field-label">
                        <span>Público</span>
                        <span className="req-star">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="product-field-input"
                      />
                      <span className="product-field-helper">
                        Deja el precio en 0 para usarlo como bonificación/cortesía al agregarlo al POS.
                      </span>
                    </div>
                  </div>

                  {/* Mayorista & VIP */}
                  <div className="product-two-cols-row">
                    <div className="product-field-group">
                      <label className="product-field-label">
                        <span>Mayorista</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00 (opcional)"
                        value={prodWholesalePrice}
                        onChange={(e) => setProdWholesalePrice(e.target.value)}
                        className="product-field-input"
                      />
                    </div>

                    <div className="product-field-group">
                      <label className="product-field-label">
                        <span>VIP</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00 (opcional)"
                        value={prodVipPrice}
                        onChange={(e) => setProdVipPrice(e.target.value)}
                        className="product-field-input"
                      />
                    </div>
                  </div>

                  {/* Especial */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Especial</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00 (opcional)"
                      value={prodSpecialPrice}
                      onChange={(e) => setProdSpecialPrice(e.target.value)}
                      className="product-field-input"
                    />
                  </div>

                  {/* Aplicar precio automático según cantidad */}
                  <div className="product-auto-price-row">
                    <input
                      type="checkbox"
                      id="autoPriceQty"
                      checked={prodAutoPrice}
                      onChange={(e) => setProdAutoPrice(e.target.checked)}
                      className="product-auto-price-checkbox"
                    />
                    <div className="product-auto-price-content">
                      <label htmlFor="autoPriceQty" className="product-auto-price-label">
                        Aplicar precio automático según cantidad
                      </label>
                      <span className="product-field-helper">
                        En el POS y catálogo, el precio cambia solo cuando el cliente alcanza la cantidad mínima. Si está apagado, el cajero elige el precio manualmente al agregar.
                      </span>
                    </div>
                  </div>

                  {/* Unidad */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Unidad</span>
                      <span className="req-star">*</span>
                    </label>
                    <select
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="product-field-select cursor-pointer"
                    >
                      <option value="Unidad">Unidad</option>
                      <option value="Kilo (kg)">Kilo (kg)</option>
                      <option value="Gramo (g)">Gramo (g)</option>
                      <option value="Porción">Porción</option>
                      <option value="Litro (L)">Litro (L)</option>
                      <option value="Paquete">Paquete</option>
                      <option value="Caja">Caja</option>
                      <option value="Botella">Botella</option>
                    </select>
                  </div>

                  {/* Afectación IGV */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Afectación IGV</span>
                    </label>
                    <select
                      value={prodIgvType}
                      onChange={(e) => setProdIgvType(e.target.value)}
                      className="product-field-select cursor-pointer"
                    >
                      <option value="Exonerado">Exonerado</option>
                      <option value="Gravado - Operación Onerosa (18%)">Gravado - Operación Onerosa (18%)</option>
                      <option value="Inafecto">Inafecto</option>
                      <option value="Gratuito">Gratuito</option>
                    </select>
                  </div>

                  {/* Código de Producto SUNAT (Opcional) */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Código de Producto SUNAT (Opcional)</span>
                    </label>
                    <div className="product-icon-input-container">
                      <Search size={16} className="product-input-left-icon" />
                      <input
                        type="text"
                        placeholder="Buscar el código de tu producto"
                        value={prodSunatCode}
                        onChange={(e) => setProdSunatCode(e.target.value)}
                        className="product-field-input product-input-with-left-icon"
                      />
                    </div>
                    <span className="product-field-helper">
                      Lo exige SUNAT solo a un grupo reducido de emisores. Si no lo llenas, tus comprobantes se emiten igual.
                    </span>
                  </div>

                  {/* Categoría (Opcional) */}
                  <div className="product-field-group">
                    <label className="product-field-label">
                      <span>Categoría (Opcional)</span>
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="product-field-select cursor-pointer"
                    >
                      <option value="Sin categoría">Sin categoría</option>
                      {categories.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="product-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#0f172a', borderColor: '#0f172a' }}
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GESTIONAR CATEGORÍAS ================= */}
      {isCategoryModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCategoryModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', background: '#ffffff', borderRadius: '14px', overflow: 'hidden' }}
          >
            <div className="modal-header" style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Gestionar Categorías
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {/* Form Crear Categoría con Icono */}
              <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Nueva categoría (ej. Jugos, Frappes, Makis)..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="form-input-initial"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn-modal-submit"
                    style={{ background: '#0f172a', borderColor: '#0f172a', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={15} /> Agregar
                  </button>
                </div>

                {/* Selector visual de icono para la nueva categoría */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                    Selecciona un Icono para la Categoría:
                  </label>
                  <div className="category-icons-picker-grid">
                    {ALL_CATEGORY_ICONS.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = selectedCategoryIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`category-icon-picker-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedCategoryIcon(item.id)}
                          title={item.label}
                        >
                          <IconComp size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>

              {/* Lista de Categorías con su icono */}
              <label className="form-label-initial">Categorías Actuales ({categories.length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                {categories.map((c) => {
                  const CatIconComp = getCategoryIconComponent(c.icon, c.name);
                  return (
                    <div
                      key={c.id || c.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CatIconComp size={15} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Selector rápido para cambiar icono de categoría existente */}
                        <select
                          value={c.icon || ''}
                          onChange={(e) => handleUpdateCategoryIcon(c.id || c.name, e.target.value)}
                          className="category-icon-mini-select"
                          title="Cambiar icono de esta categoría"
                        >
                          <option value="">Auto (por nombre)</option>
                          {ALL_CATEGORY_ICONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.name)}
                          title="Eliminar categoría"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              padding: '0.9rem 1.25rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc',
            }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: AJUSTAR STOCK ================= */}
      {isAdjustStockModalOpen && stockToAdjustProd && (
        <div className="modal-backdrop" onClick={() => setIsAdjustStockModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px', background: '#ffffff', borderRadius: '14px', overflow: 'hidden' }}
          >
            <div className="modal-header" style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Ajustar Stock
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAdjustStockModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustStock}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                  Producto: <strong style={{ color: '#0f172a' }}>{stockToAdjustProd.name}</strong>
                </p>
                <div>
                  <label className="form-label-initial">Cantidad en Stock Actual</label>
                  <input
                    type="number"
                    required
                    value={newStockValue}
                    onChange={(e) => setNewStockValue(e.target.value)}
                    className="form-input-initial"
                    autoFocus
                  />
                </div>
              </div>

              <div style={{
                padding: '0.9rem 1.25rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.65rem',
                background: '#f8fafc',
              }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsAdjustStockModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#0f172a', borderColor: '#0f172a' }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ACTUALIZAR PRECIOS EN LOTE ================= */}
      {isBulkPriceModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBulkPriceModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', background: '#ffffff', borderRadius: '14px', overflow: 'hidden' }}
          >
            <div className="modal-header" style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={18} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Actualizar Precios
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsBulkPriceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyBulkPrices} style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="product-field-label">Tipo de Ajuste</label>
                <select
                  value={bulkPriceType}
                  onChange={(e) => setBulkPriceType(e.target.value)}
                  className="product-field-select cursor-pointer"
                >
                  <option value="PERCENT_INCREASE">Aumentar por porcentaje (%)</option>
                  <option value="PERCENT_DECREASE">Disminuir por porcentaje (%)</option>
                  <option value="FIXED_AMOUNT">Aumentar monto fijo (S/)</option>
                </select>
              </div>

              <div>
                <label className="product-field-label">
                  {bulkPriceType === 'FIXED_AMOUNT' ? 'Monto a agregar (S/)' : 'Porcentaje (%)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder={bulkPriceType === 'FIXED_AMOUNT' ? 'Ej: 2.50' : 'Ej: 10'}
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(e.target.value)}
                  className="product-field-input"
                />
              </div>

              <div>
                <label className="product-field-label">Aplicar a Categoría</label>
                <select
                  value={bulkPriceCategory}
                  onChange={(e) => setBulkPriceCategory(e.target.value)}
                  className="product-field-select cursor-pointer"
                >
                  <option value="all">Todos los productos ({products.length})</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsBulkPriceModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#0f172a', borderColor: '#0f172a' }}
                >
                  Aplicar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GESTIONAR MARCAS ================= */}
      {isBrandModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBrandModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', background: '#ffffff', borderRadius: '14px', overflow: 'hidden' }}
          >
            <div className="modal-header" style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={18} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Gestionar Marcas
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsBrandModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Form crear marca */}
              <form onSubmit={handleCreateBrand} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Nueva marca (ej. San Luis, Coca-Cola)"
                  value={newBrandInput}
                  onChange={(e) => setNewBrandInput(e.target.value)}
                  className="product-field-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#0f172a', borderColor: '#0f172a', padding: '0 1rem' }}
                >
                  Agregar
                </button>
              </form>

              {/* Lista de marcas */}
              <div>
                <label className="product-field-label" style={{ marginBottom: '0.5rem' }}>
                  Marcas registradas ({availableBrands.length})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {availableBrands.map((b) => (
                    <div
                      key={b}
                      style={{
                        background: '#f1f5f9',
                        color: '#0f172a',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{b}</span>
                      {b !== 'Sin marca' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBrand(b)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                          }}
                          title="Eliminar marca"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsBrandModalOpen(false)}
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ¿CÓMO FUNCIONA ESTA PÁGINA? ================= */}
      {isHelpModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsHelpModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', background: '#ffffff', borderRadius: '14px', overflow: 'hidden' }}
          >
            <div className="modal-header" style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  ¿Cómo funciona Productos y Servicios?
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsHelpModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: '#0f172a' }}>1. Catálogo de Productos:</strong>
                <p style={{ margin: '4px 0 0 0' }}>Aquí administras todos los platos, combos y bebidas disponibles para la venta en el punto de venta (POS).</p>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>2. Control de Costos y Utilidad:</strong>
                <p style={{ margin: '4px 0 0 0' }}>Al ingresar el precio de venta y costo de cada ítem, el sistema calcula de forma instantánea el margen de utilidad y porcentaje de rentabilidad.</p>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>3. Stock y Alertas:</strong>
                <p style={{ margin: '4px 0 0 0' }}>Puedes ver las existencias de cada producto. Si el stock es bajo o negativo, se alertará para su reposición oportuna.</p>
              </div>
            </div>

            <div style={{ padding: '0.9rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsHelpModalOpen(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
