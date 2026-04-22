import React from "react";
import QuantityInput from "./QuantityInput";

const buildVariantLabel = (variant) => {
  const parts = [];
  if (variant.color) {
    parts.push(variant.color);
  }
  if (variant.size) {
    parts.push(variant.size);
  }
  return parts.length > 0 ? parts.join(" / ") : "Default";
};

const Item = ({
  product,
  selectedVariantId,
  quantity,
  onVariantChange,
  onQuantityChange,
}) => {
  const variants = (product.variants || []).filter((variant) => variant.active !== false);
  const selectedVariant = variants.find((variant) => variant.variantId === selectedVariantId) || variants[0];
  if (!selectedVariant) {
    return null;
  }

  const handleIncrement = () => {
    onQuantityChange(selectedVariant.variantId, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(selectedVariant.variantId, quantity - 1);
    }
  };

  const handleDirectQuantityChange = (newQuantity) => {
    onQuantityChange(selectedVariant.variantId, newQuantity);
  };

  const handleImageClick = () => {
    onQuantityChange(selectedVariant.variantId, quantity + 1);
  };

  return (
    <div
      className={`bg-gray-300 overflow-hidden transition-transform transition-shadow duration-200 flex flex-col h-full border-2 ${
        quantity > 0 ? "border-green-600 bg-green-200 " : "border-transparent bg-gray-100 "
      }`}
    >
      <div className="w-full h-[120px] bg-primary overflow-hidden flex items-center justify-center">
        <img
          onClick={handleImageClick}
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover cursor-pointer"
        />
      </div>
      <div className="p-1 flex-1 flex flex-col justify-between">
        <h3 className="text-xs font-semibold text-gray-800 m-0 leading-tight">{product.name}</h3>
        <select
          className="mt-1 text-xs bg-white border border-gray-300 text-gray-700 px-1 py-1"
          value={selectedVariant.variantId}
          onChange={(e) => onVariantChange(product.productId, e.target.value)}
        >
          {variants.map((variant) => (
            <option key={variant.variantId} value={variant.variantId}>
              {buildVariantLabel(variant)}
            </option>
          ))}
        </select>
        <p className="text-xs font-bold text-gray-400 m-0">${Number(selectedVariant.price || 0).toFixed(2)}</p>
        <p className="text-[10px] text-gray-500 m-0">
          In stock: {Number(selectedVariant.stockQty || 0)}
        </p>
      </div>
      <div className="p-0">
        <QuantityInput
          quantity={quantity}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onQuantityChange={handleDirectQuantityChange}
        />
      </div>
    </div>
  );
};

export default Item;
