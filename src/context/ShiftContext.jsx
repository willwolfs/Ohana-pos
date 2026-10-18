import React, { createContext, useState, useEffect } from 'react';
import { safeSetItem } from '../utils/storageUtils';

export const ShiftContext = createContext(null);

const CURRENT_SHIFT_STORAGE_KEY = 'ohana_current_active_shift';

export const ShiftProvider = ({ children }) => {
  const [currentShift, setCurrentShift] = useState(() => {
    try {
      const saved = localStorage.getItem(CURRENT_SHIFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.isOpen === 'boolean') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading active shift from storage:', e);
    }
    return {
      isOpen: false,
      openedAt: null,
      initialCash: 10.0,
      cashierName: 'Admin Ohana',
    };
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(CURRENT_SHIFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.isOpen === 'boolean') {
            setCurrentShift(parsed);
          }
        }
      } catch (e) {
        console.warn('Error syncing shift:', e);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('ohana_shift_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('ohana_shift_updated', handleSync);
    };
  }, []);

  const openShift = (initialCash, cashierName = 'Admin Ohana') => {
    const newShift = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `shift-${Date.now()}`,
      isOpen: true,
      openedAt: new Date().toISOString(),
      initialCash: Number(initialCash),
      cashierName: cashierName || 'Admin Ohana',
    };
    setCurrentShift(newShift);
    safeSetItem(CURRENT_SHIFT_STORAGE_KEY, JSON.stringify(newShift));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ohana_shift_updated', { detail: newShift }));
    }
  };

  const closeShift = (closingData) => {
    const updated = {
      ...currentShift,
      isOpen: false,
      closedAt: new Date().toISOString(),
      ...closingData,
    };
    setCurrentShift(updated);
    safeSetItem(CURRENT_SHIFT_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ohana_shift_updated', { detail: updated }));
    }
  };

  return (
    <ShiftContext.Provider value={{ currentShift, openShift, closeShift }}>
      {children}
    </ShiftContext.Provider>
  );
};

