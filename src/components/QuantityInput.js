import React, { useState } from "react";

const QuantityInput = ({ quantity, maxQuantity = Infinity, onIncrement, onDecrement, onQuantityChange }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [inputValue, setInputValue] = useState(quantity.toString());
  const hasMaxQuantity = Number.isFinite(maxQuantity);
  const sanitizedMaxQuantity = hasMaxQuantity ? Math.max(0, Number(maxQuantity) || 0) : Infinity;
  const isAtMaxQuantity = quantity >= sanitizedMaxQuantity;
  const isQuantityEditable = sanitizedMaxQuantity > 0;

  const handleQuantityClick = () => {
    if (!isQuantityEditable) {
      return;
    }
    setInputValue(quantity.toString());
    setShowPopup(true);
  };

  const handlePopupSubmit = (e) => {
    e.preventDefault();
    const newQuantity = parseInt(inputValue);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onQuantityChange(Math.min(newQuantity, sanitizedMaxQuantity));
      setShowPopup(false);
    }
  };

  const handlePopupCancel = () => {
    setShowPopup(false);
    setInputValue(quantity.toString());
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePopupSubmit(e);
    } else if (e.key === 'Escape') {
      handlePopupCancel();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between md:text-sm text-xs">
        <button
          className="px-2 py-1 bg-red-300 text-gray-700 border-0 font-semibold hover:bg-gray-300 transition disabled:opacity-50 w-[36px]"
          onClick={onDecrement}
          disabled={quantity <= 0}
          aria-label="Decrease quantity"
          type="button"
        >
          -
        </button>
        <span
          className={`px-1 py-1 bg-white border-0 text-gray-800 font-semibold select-none transition text-center w-full ${
            isQuantityEditable ? "cursor-pointer hover:bg-blue-50" : "cursor-not-allowed opacity-50"
          }`}
          onClick={handleQuantityClick}
          title={isQuantityEditable ? "Click to edit quantity" : "Out of stock"}
        >
          {quantity}
        </span>
        <button
          className="px-2 py-1 border-0 bg-green-300 text-gray-700 font-semibold hover:bg-gray-300 transition disabled:opacity-50 w-[36px]"
          onClick={onIncrement}
          disabled={isAtMaxQuantity}
          aria-label="Increase quantity"
          type="button"
        >
          +
        </button>
      </div>

      {showPopup && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30"
          onClick={handlePopupCancel}
        >
          <div
            className="bg-primary  shadow-lg p-6 w-72 max-w-full z-50"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Set Quantity</h3>
            <form onSubmit={handlePopupSubmit}>
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                min="0"
                max={hasMaxQuantity ? sanitizedMaxQuantity : undefined}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-gray-800 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handlePopupCancel}
                  className="px-4 py-2  bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2  bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                  Set
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default QuantityInput;
