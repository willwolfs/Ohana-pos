import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { getCategoryIconComponent } from '../../products/pages/ProductsPage';

export const CategoryFilter = ({ categories, activeCategory, onSelectCategory, counts = {} }) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="pos-category-scroll-container">
      <div className="pos-category-bar">
        <button
          type="button"
          className={`pos-cat-chip ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => onSelectCategory('all')}
        >
          <LayoutGrid size={15} className="pos-cat-all-icon" />
          <span>Todos</span>
          {counts['all'] !== undefined && (
            <span className="pos-cat-count">{counts['all']}</span>
          )}
        </button>

        {categories.map((cat) => {
          const IconComp = getCategoryIconComponent(cat.icon, cat.name);
          const count = counts[cat.name] || 0;
          return (
            <button
              key={cat.id || cat.name}
              type="button"
              className={`pos-cat-chip ${activeCategory === cat.name ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.name)}
            >
              <IconComp size={14} />
              <span>{cat.name}</span>
              {count !== undefined && (
                <span className="pos-cat-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;

