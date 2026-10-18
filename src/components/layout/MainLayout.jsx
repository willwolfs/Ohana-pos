import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useTheme } from '../../context/ThemeContext';

export const MainLayout = () => {
  const { theme } = useTheme();
  // Estado para móvil (abierto/cerrado en drawer)
  const [mobileOpen, setMobileOpen] = useState(false);
  // Estado para desktop estilo YouTube (expandido 250px / colapsado mini 72px)
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 900) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <div className={`app-shell ${theme === 'light' ? 'theme-light' : 'theme-dark'} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        isOpen={mobileOpen}
        isCollapsed={isCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="app-main-content">
        <Navbar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
