import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';

// Pages
import LoginPage from '../modules/auth/pages/LoginPage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import POSPage from '../modules/pos/pages/POSPage';
import KitchenPage from '../modules/kitchen/pages/KitchenPage';
import ProductsPage from '../modules/products/pages/ProductsPage';
import CashRegisterPage from '../modules/cash-register/pages/CashRegisterPage';
import SuppliesPage from '../modules/inventory/pages/SuppliesPage';
import RecipesPage from '../modules/inventory/pages/RecipesPage';
import KardexPage from '../modules/inventory/pages/KardexPage';
import SalesHistoryPage from '../modules/sales/pages/SalesHistoryPage';
import PurchasesPage from '../modules/purchases/pages/PurchasesPage';
import ExpensesPage from '../modules/expenses/pages/ExpensesPage';
import CustomersPage from '../modules/customers/pages/CustomersPage';
import ReportsPage from '../modules/reports/pages/ReportsPage';
import UsersPage from '../modules/users/pages/UsersPage';
import CompanyPage from '../modules/company/pages/CompanyPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas dentro del Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="kitchen" element={<KitchenPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="cash-register" element={<CashRegisterPage />} />

        {/* Módulo de Inventario */}
        <Route path="inventory">
          <Route index element={<Navigate to="supplies" replace />} />
          <Route path="products" element={<Navigate to="/products" replace />} />
          <Route path="supplies" element={<SuppliesPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="kardex" element={<KardexPage />} />
        </Route>

        {/* Operaciones */}
        <Route path="sales" element={<SalesHistoryPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="company" element={<CompanyPage />} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
