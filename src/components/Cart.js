import React from "react";

const Cart = ({ cartItems }) => {
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="text-white text-sm py-2 text-center">
        No items in cart
      </div>
    );
  }

  return (
    <div className="bg">
      <ul className="max-h-[288px] overflow-y-auto">
            {cartItems.length === 0 ? (
              <li className="text-gray-300 text-sm">No items in cart.</li>
            ) : (
              cartItems.map((item) => (
                <li
                  key={item.variantId || item.id}
                  className="flex justify-between text-white text-xs py-1 border-b border-primary-light last:border-b-0"
                >
                  <div className="flex flex-row">
                    <span className="min-w-[20px]">{item.quantity}x</span>
                    <span>{item.name}</span>
                  </div>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))
            )}
          </ul>
    </div>
  );
};

export default Cart;
