import React from 'react';
import { Plus, Camera, Check } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';

export const ProductGrid = ({ products, onAddToCart, cartItemCounts = {} }) => {
  return (
    <div className="pos-products-grid">
      {products.map((product) => {
        const inCartQty = cartItemCounts[product.id] || 0;
        const hasRealImage = product.image && (
          product.image.startsWith('data:') ||
          product.image.startsWith('http') ||
          product.image.startsWith('/')
        );

        return (
          <div
            key={product.id}
            className={`pos-product-item-card ${inCartQty > 0 ? 'in-cart' : ''}`}
            onClick={() => onAddToCart(product)}
          >
            {/* Contenedor de Imagen Real */}
            <div className="pos-item-img-wrap">
              {hasRealImage ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="pos-item-img"
                  loading="lazy"
                />
              ) : (
                <div className="pos-item-no-img">
                  <Camera size={26} color="#94a3b8" />
                  <span className="pos-item-no-img-text">Sin foto</span>
                </div>
              )}

              {/* Badge de porción / cortes */}
              {product.pieces && (
                <span className="pos-item-badge-pieces">{product.pieces}</span>
              )}

              {/* Badge si está en el carrito */}
              {inCartQty > 0 && (
                <span className="pos-item-badge-cart" title={`${inCartQty} en pedido`}>
                  <Check size={11} strokeWidth={3} /> {inCartQty}
                </span>
              )}
            </div>

            {/* Información del Producto */}
            <div className="pos-item-details">
              <span className="pos-item-category-tag">{product.category}</span>
              <h4 className="pos-item-name" title={product.name}>
                {product.name}
              </h4>

              <div className="pos-item-bottom">
                <div className="pos-item-price-col">
                  <span className="pos-item-price">
                    {formatCurrency(product.price)}
                  </span>
                  <span className={`pos-item-stock-tag ${product.stock !== undefined && Number(product.stock) <= 5 ? 'stock-low' : 'stock-ok'}`}>
                    Stock: {product.stock !== undefined ? product.stock : 0}
                  </span>
                </div>
                <button
                  type="button"
                  className="pos-item-add-btn"
                  title={`Añadir ${product.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductGrid;

