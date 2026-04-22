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

const ItemRow = ({
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

  return (
    <tr
      className={`transition-colors md:text-sm text-xs text-gray-800 ${
        quantity > 0 ? "bg-green-100" : "bg-gray-100"
      }`}
    >
      <td className="px-1 py-2">
        <div className="font-bold">{product.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <select
            className="text-xs bg-white border border-gray-300 text-gray-700 px-1 py-1"
            value={selectedVariant.variantId}
            onChange={(e) => onVariantChange(product.productId, e.target.value)}
          >
            {variants.map((variant) => (
              <option key={variant.variantId} value={variant.variantId}>
                {buildVariantLabel(variant)}
              </option>
            ))}
          </select>
          <div className="text-gray-400 ml-2">${Number(selectedVariant.price || 0).toFixed(2)}</div>
          <div className="text-[10px] text-gray-500">Stock: {Number(selectedVariant.stockQty || 0)}</div>
        </div>
      </td>
      <td className="px-1 py-2">
        <QuantityInput
          quantity={quantity}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onQuantityChange={handleDirectQuantityChange}
        />
      </td>
      <td className="px-1 py-2 font-semibold whitespace-nowrap">
        ${(Number(selectedVariant.price || 0) * quantity).toFixed(2)}
      </td>
    </tr>
  );
};

export default ItemRow;
