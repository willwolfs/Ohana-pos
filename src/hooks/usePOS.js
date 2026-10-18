import { useContext } from 'react';
import { CartContext } from '../context/CartContext';

export const usePOS = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('usePOS debe ser utilizado dentro de un CartProvider');
  }
  return context;
};
