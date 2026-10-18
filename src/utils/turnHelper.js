/**
 * Gestor de número de turno diario para pedidos y tickets de cocina (Ohana POS).
 * Reinicia automáticamente a 1 al cambiar de día (o si existía un valor legado como 90 o 38).
 */

const TURN_KEY = 'ohana_current_turn';
const TURN_DATE_KEY = 'ohana_turn_date';
const TURN_RESET_FLAG = 'ohana_turn_v2_clean';

const getTodayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Obtiene e incrementa el número de turno para una nueva orden.
 * Si es un día nuevo o si existía el valor legado 90/38, inicia en 1.
 */
export const getNextTurnNumber = () => {
  try {
    const today = getTodayKey();
    const storedDate = localStorage.getItem(TURN_DATE_KEY);
    const storedTurn = localStorage.getItem(TURN_KEY);
    const hasBeenReset = localStorage.getItem(TURN_RESET_FLAG);

    let nextTurn = 1;

    // Si nunca se ha limpiado el valor legado (ej. 90 o 38)
    const isLegacyValue = (!hasBeenReset && storedTurn && parseInt(storedTurn, 10) >= 38);

    if (storedDate === today && storedTurn && !isLegacyValue) {
      const parsed = parseInt(storedTurn, 10);
      nextTurn = (!isNaN(parsed) && parsed >= 1) ? parsed + 1 : 1;
    } else {
      // Nuevo día o primera vez: reinicia a 1
      nextTurn = 1;
    }

    localStorage.setItem(TURN_RESET_FLAG, 'true');
    localStorage.setItem(TURN_DATE_KEY, today);
    localStorage.setItem(TURN_KEY, String(nextTurn));
    return nextTurn;
  } catch {
    return 1;
  }
};

/**
 * Consulta el turno actual para visualización/impresión sin incrementar el contador.
 */
export const getCurrentTurnNumber = (orderData) => {
  if (orderData?.turn_number) {
    const parsed = parseInt(orderData.turn_number, 10);
    if (!isNaN(parsed) && parsed >= 1) return parsed;
  }

  try {
    const today = getTodayKey();
    const storedDate = localStorage.getItem(TURN_DATE_KEY);
    const storedTurn = localStorage.getItem(TURN_KEY);

    if (storedDate === today && storedTurn) {
      const parsed = parseInt(storedTurn, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 1;
  } catch {
    return 1;
  }
};
