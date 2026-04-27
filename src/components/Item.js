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
  const hasVariantAttributes = variants.some((variant) => variant.color || variant.size);
  const showVariantSelector = variants.length > 1 && hasVariantAttributes;
  const trackStock = Boolean(selectedVariant.trackStock);
  const stockQty = trackStock ? Math.max(0, Number(selectedVariant.stockQty || 0)) : Infinity;
  const isOutOfStock = trackStock && stockQty <= 0;
  const displayImage = selectedVariant.image || product.image;
  const displayName = selectedVariant.name || product.name;

  const handleIncrement = () => {
    if (trackStock && quantity >= stockQty) {
      return;
    }
    onQuantityChange(selectedVariant.variantId, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(selectedVariant.variantId, quantity - 1);
    }
  };

  const handleDirectQuantityChange = (newQuantity) => {
    onQuantityChange(selectedVariant.variantId, trackStock ? Math.min(newQuantity, stockQty) : newQuantity);
  };

  const handleImageClick = () => {
    if (trackStock && quantity >= stockQty) {
      return;
    }
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
          src={displayImage}
          alt={displayName}
          className={`w-full h-full object-cover ${isOutOfStock ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        />
      </div>
      <div className="p-1 flex-1 flex flex-col justify-between">
        <h3 className="text-xs font-semibold text-gray-800 m-0 leading-tight">{displayName}</h3>
        {showVariantSelector && (
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
        )}
        <p className="text-xs font-bold text-gray-400 m-0">${Number(selectedVariant.price || 0).toFixed(2)}</p>
        {trackStock && (
          <p className={`text-[10px] m-0 ${isOutOfStock ? "text-red-600 font-semibold" : "text-gray-500"}`}>
            {isOutOfStock ? "Out of stock" : `In stock: ${stockQty}`}
          </p>
        )}
      </div>
      <div className="p-0">
        <QuantityInput
          quantity={quantity}
          maxQuantity={trackStock ? stockQty : Infinity}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onQuantityChange={handleDirectQuantityChange}
        />
      </div>
    </div>
  );
};

export default Item;
