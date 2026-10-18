/**
 * Utilidades para manejo seguro de LocalStorage y compresión de imágenes
 * Previene QuotaExceededError reduciendo avatares a thumbnails de ~8-15KB.
 */

export const compressAvatarImage = (file, maxWidth = 128, maxHeight = 128, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar proporcionalmente a máximo maxWidth x maxHeight
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Salida comprimida en JPEG (~8KB - 15KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Fallo compresión canvas, usando original reducido:', err);
          resolve(event.target.result);
        }
      };
      img.onerror = () => {
        resolve(event.target.result);
      };
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Limpia entradas pesadas (> 80KB) existentes en localStorage para liberar espacio
 */
export const purgeOversizedCache = () => {
  try {
    // 1. Purgar avatares gigantes
    const rawCache = localStorage.getItem('ohana_user_avatars_cache');
    if (rawCache) {
      const cache = JSON.parse(rawCache);
      let changed = false;
      for (const key of Object.keys(cache)) {
        if (typeof cache[key] === 'string' && cache[key].length > 40000) {
          delete cache[key];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem('ohana_user_avatars_cache', JSON.stringify(cache));
      }
    }

    const rawUser = localStorage.getItem('ohana_user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.length > 40000) {
        user.avatar_url = null;
        localStorage.setItem('ohana_user', JSON.stringify(user));
      }
    }

    // 2. Purgar imágenes gigantes embebidas en el historial de órdenes y ventas aparcadas
    const cleanOrdersInKey = (storageKey, maxCount = 100) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      try {
        const orders = JSON.parse(raw);
        if (Array.isArray(orders)) {
          let modified = false;
          let sliced = orders;
          if (orders.length > maxCount) {
            sliced = orders.slice(0, maxCount);
            modified = true;
          }
          const cleaned = sliced.map((order) => {
            if (!order) return order;
            let orderMod = false;
            const cleanItems = (itemsList) => {
              if (!Array.isArray(itemsList)) return itemsList;
              return itemsList.map((it) => {
                if (it && typeof it.image === 'string' && it.image.startsWith('data:') && it.image.length > 15000) {
                  orderMod = true;
                  modified = true;
                  return { ...it, image: null };
                }
                return it;
              });
            };
            const items = cleanItems(order.items);
            const order_items = cleanItems(order.order_items);
            return orderMod ? { ...order, items, order_items } : order;
          });

          if (modified) {
            localStorage.setItem(storageKey, JSON.stringify(cleaned));
          }
        }
      } catch (e) {
        console.warn(`Error limpiando ${storageKey}:`, e);
      }
    };

    cleanOrdersInKey('ohana_orders_cache', 120);
    cleanOrdersInKey('ohana_parked_orders_cache', 50);

  } catch (e) {
    console.warn('Notice al purgar caché:', e);
  }
};

/**
 * Sanitiza los items de una comanda u orden para no saturar localStorage con imágenes base64
 */
export const sanitizeOrderItemsForStorage = (itemsList = []) => {
  if (!Array.isArray(itemsList)) return [];
  return itemsList.map((it) => {
    let img = it.image || null;
    // Si la imagen es una data URL pesada (> 15KB), la omitimos de la orden persistida
    // ya que se puede recuperar del catálogo de productos en tiempo de vista
    if (img && typeof img === 'string' && img.startsWith('data:') && img.length > 15000) {
      img = null;
    }
    return {
      id: it.id,
      name: it.name || it.product_name,
      product_name: it.product_name || it.name,
      price: Number(it.price || it.unit_price) || 0,
      unit_price: Number(it.unit_price || it.price) || 0,
      quantity: Number(it.quantity) || 1,
      notes: it.notes || '',
      category: it.category || '',
      image: img,
    };
  });
};

/**
 * Guarda en localStorage de forma segura contra QuotaExceededError
 */
export const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (
      err.name === 'QuotaExceededError' ||
      err.code === 22 ||
      err.code === 1014 ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
      console.warn(`[safeSetItem] QuotaExceededError al guardar "${key}". Purgando elementos pesados...`);
      // Purgar imágenes gigantes
      purgeOversizedCache();

      try {
        // Si el valor que causó el error era un objeto de usuario con avatar gigante
        if (key === 'ohana_user') {
          const parsed = JSON.parse(value);
          delete parsed.avatar_url;
          localStorage.setItem(key, JSON.stringify(parsed));
          return true;
        }

        // Si es la caché de órdenes o aparcadas, sanitizar los items del valor que se intenta guardar
        if (key === 'ohana_orders_cache' || key === 'ohana_parked_orders_cache') {
          try {
            const list = JSON.parse(value);
            if (Array.isArray(list)) {
              const cleaned = list.slice(0, 80).map((ord) => ({
                ...ord,
                items: sanitizeOrderItemsForStorage(ord.items),
                order_items: sanitizeOrderItemsForStorage(ord.order_items),
              }));
              localStorage.setItem(key, JSON.stringify(cleaned));
              return true;
            }
          } catch {}
        }

        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.error('[safeSetItem] No se pudo guardar después de purga:', retryErr);
        return false;
      }
    }
    console.error(`[safeSetItem] Error al escribir en localStorage (${key}):`, err);
    return false;
  }
};

/**
 * Normaliza cualquier código de comprobante para asegurar que no quede en 0000
 */
export const sanitizeOrderTicketCode = (code) => {
  if (!code) return '';
  const str = String(code).trim();
  if (str.endsWith('-0000')) {
    return str.replace(/-0000$/, '-0001');
  }
  return str;
};

/**
 * Extrae el número correlativo de un comprobante u orden (Boleta, Nota de Venta o Factura).
 * Soporta filtrado opcional por tipo de documento ('nota', 'boleta', 'factura').
 */
export const extractBoletaNumber = (order, targetDocType = null) => {
  if (!order) return null;
  const rawCode = String(order.ticket_code || order.ticketCode || order.number || order.ticket_number || order.id || '').trim();
  const code = sanitizeOrderTicketCode(rawCode);
  const docType = String(order.doc_type || order.docType || order.document_type || '').toLowerCase();

  // Si se solicita filtrar por tipo específico de documento:
  if (targetDocType) {
    const isNota = targetDocType === 'nota' || targetDocType === 'nota_venta' || targetDocType === 'NV01';
    const isBoleta = targetDocType === 'boleta' || targetDocType === 'B001';
    const isFactura = targetDocType === 'factura' || targetDocType === 'F001';

    const codeUpper = code.toUpperCase();
    if (isNota && !codeUpper.startsWith('NV') && !docType.includes('nota')) return null;
    if (isBoleta && !codeUpper.startsWith('B') && !docType.includes('boleta')) return null;
    if (isFactura && !codeUpper.startsWith('F') && !docType.includes('factura')) return null;
  }

  // Coincide con códigos como B001-0002, NV01-0002, F001-0002, etc.
  const matchHyphen = code.match(/(?:B|NV|F)[A-Z0-9]*-(\d+)/i);
  if (matchHyphen && matchHyphen[1]) {
    const val = parseInt(matchHyphen[1], 10);
    // Si viene 0 o 0000, considerarlo como 1
    return isNaN(val) ? null : (val === 0 ? 1 : val);
  }

  // Si el tipo de comprobante es boleta, nota de venta o factura
  if (docType.includes('boleta') || docType.includes('nota') || docType.includes('factura') || code.match(/^[A-Z0-9]+/i)) {
    const numMatch = code.match(/(\d+)$/);
    if (numMatch && numMatch[1]) {
      const val = parseInt(numMatch[1], 10);
      return isNaN(val) ? null : (val === 0 ? 1 : val);
    }
  }

  return null;
};

/**
 * Calcula y sincroniza el siguiente correlativo según las órdenes existentes reales.
 * El primer comprobante de cualquier serie siempre comienza en 1 (#NV01-0001, #B001-0001, #F001-0001), NUNCA en 0000.
 */
export const syncAndGetNextBoletaNumber = (customOrders = null, targetDocType = null) => {
  try {
    let orders = customOrders;
    if (!orders) {
      const raw = localStorage.getItem('ohana_orders_cache');
      orders = raw ? JSON.parse(raw) : [];
    }

    let maxNum = 0;
    if (Array.isArray(orders)) {
      for (const order of orders) {
        if (!order) continue;
        if (order.status === 'Anulado' || order.status === 'Cancelado') continue;
        const num = extractBoletaNumber(order, targetDocType);
        if (num !== null && num > maxNum) {
          maxNum = num;
        }
      }
    }

    // El primer comprobante siempre es 1 (ej. NV01-0001).
    // Si el último comprobante válido es N, el siguiente es N + 1.
    const nextNumber = maxNum >= 1 ? maxNum + 1 : 1;
    localStorage.setItem('ohana_current_boleta_num', String(nextNumber));
    return nextNumber;
  } catch (err) {
    console.warn('Notice syncing boleta number:', err);
    return 1;
  }
};

