import React, { useState, useRef } from "react";
import { useAppSelector } from "../store/hooks";
import PaymentMethodSelection from "./PaymentMethodSelection";

const CheckoutPopup = ({
  isOpen,
  onClose,
  total,
  itemCount,
  cartItems = [],
  onClearContents,
  invoiceEmail: initialInvoiceEmail = "",
  onInvoiceEmailChange,
}) => {
  const [email, setEmail] = useState(initialInvoiceEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [remarks, setRemarks] = useState("");
  const {
    staffName,
    staffNameEntryId,
    totalAmountEntryId,
    itemCountEntryId,
    invoiceEmailEntryId,
    paymentMethodEntryId,
    remarksEntryId,
    itemsEntryId,
    items,
    formSubmitUrl,
    passcode,
  } = useAppSelector((state) => state.auth);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // useRef for iframe
  const iframeRef = useRef(null);

  // Keep local email in sync if popup is reopened with a different value
  React.useEffect(() => {
    setEmail(initialInvoiceEmail || "");
    setError("");
  }, [initialInvoiceEmail, isOpen]);

  if (!isOpen) return null;

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (onInvoiceEmailChange) {
      onInvoiceEmailChange(e.target.value);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError("");
    setIsIframeLoaded(false);
    try {
      console.log(email);
      if (itemCount === 0) {
        throw new Error("Please add items to cart before submitting.");
      }
      if (!paymentMethod) {
        throw new Error("Please select payment method.");
      }

      // Remove any previous form
      const prevForm = document.getElementById("popupPostForm");
      if (prevForm) prevForm.remove();

      // Reset iframe src using ref
      if (iframeRef.current) {
        iframeRef.current.src = "about:blank";
      }

      if (typeof formSubmitUrl !== "undefined" && formSubmitUrl) {
        // Create a form element
        const form = document.createElement("form");
        form.style.display = "none";
        form.id = "popupPostForm";
        form.method = "POST";
        form.action = formSubmitUrl;
        form.target = "resultFrame";

        // Add fields (email, paymentMethod, remarks, etc.)
        const addField = (name, value) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        };
        if (staffNameEntryId) {
          addField(`entry.${staffNameEntryId}`, staffName || "Unknown");
        }
        if (totalAmountEntryId) {
          addField(`entry.${totalAmountEntryId}`, total.toFixed(2));
        }
        if (itemCountEntryId) {
          addField(`entry.${itemCountEntryId}`, itemCount);
        }
        if (invoiceEmailEntryId) {
          addField(`entry.${invoiceEmailEntryId}`, email);
        }
        if (paymentMethodEntryId) {
          addField(`entry.${paymentMethodEntryId}`, paymentMethod);
        }
        if (remarksEntryId) {
          addField(`entry.${remarksEntryId}`, remarks);
        }
        const lineItems = [];
        if (cartItems && cartItems.length > 0) {
          cartItems.forEach((item) => {
            const token = `${item.variantId || item.id} x${item.quantity} @${Number(item.price || 0).toFixed(2)}`;
            const label = item.variantLabel
              ? `${item.productName} (${item.variantLabel})`
              : item.name;
            lineItems.push(
              `${label} x${item.quantity} - $${(Number(item.price || 0) * item.quantity).toFixed(2)} | ${token}`
            );
          });
        }

        if (itemsEntryId) {
          addField(`entry.${itemsEntryId}`, lineItems.join("\n"));
        }

        document.body.appendChild(form);

        // Use ref for iframe
        const resultFrame = iframeRef.current;
        const onIframeLoad = function () {
          console.log("Iframe content loaded.");
          setShowSuccess(true);
          setIsIframeLoaded(true);
          resultFrame.removeEventListener("load", onIframeLoad);
        };
        if (resultFrame) {
          resultFrame.addEventListener("load", onIframeLoad);
        }
        // Submit the form to the iframe
        form.submit();
      }

      // const success = await onConfirm({email, paymentMethod, remarks});
      setShowSuccess(true);
    } catch (err) {
      setError(
        err?.message ||
          "An error occurred while confirming checkout. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30 ">
      <div
        className={`bg-primary shadow-lg p-6 w-80 max-w-full max-h-full overflow-y-auto ${
          !showSuccess ? "hidden" : ""
        }`}
      >
        <h2 className="text-xl font-bold mb-4 text-green-400 text-center">
          {isIframeLoaded ?"" : "Submitting your order, please wait..."}
        </h2>
        <h2 className="text-xl font-bold mb-4 text-red-400 text-center">
          {error ? error : ""}
        </h2>
        <div className="w-full h-[200px] overflow-hidden">
          <iframe
            ref={iframeRef}
            name="resultFrame"
            id="resultFrame"
            className="scale-50 origin-top-left w-[200%] h-[400px] border-0"
          ></iframe>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <button
            className="btn-primary"
            onClick={onClearContents}
            autoFocus
          >
            Clear and Continue to next order
          </button>
          <button
            className="btn-primary-outline"
            onClick={() => {
              setShowSuccess(false);
              setError("");
              setIsIframeLoaded(false);
            }}
          >
            Back and Retry
          </button>
        </div>
      </div>

      <div
        className={`bg-primary shadow-lg p-6 w-80 max-w-full max-h-full overflow-y-auto ${
          showSuccess ? "hidden" : ""
        }`}
      >
        <h2 className="text-xl font-bold mb-4 text-white">Confirm Checkout</h2>
        <div className="mb-2 text-gray-400 flex flex-row text-xs justify-between">
          <div>
            <span className="font-semibold">Total:</span> $
            {total?.toFixed(2)} ({itemCount})
          </div>
          <div>
            <span className="font-semibold">Staff: {staffName}</span>
          </div>
        </div>
        <div className="mb-4">
          <ul className=" overflow-y-auto">
            {cartItems.length === 0 ? (
              <li className="text-gray-300 text-sm">No items in cart.</li>
            ) : (
              cartItems.map((item) => (
                <li
                  key={item.id}
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

        <PaymentMethodSelection
          value={paymentMethod}
          onChange={setPaymentMethod}
          disabled={isLoading}
        />
        <div className="">
          <label
            className="block text-white font-semibold mb-1"
            htmlFor="checkout-invoice-email"
          >
            Invoice Email
          </label>
          <input
            id="checkout-invoice-email"
            type="email"
            className="w-full px-3 py-2 text-primary mb-6"
            placeholder="Enter invoice email (optional)"
            value={email}
            onChange={handleEmailChange}
            autoComplete="off"
            disabled={isLoading}
          />
        </div>

        <div className="">
          <label
            className="block text-white font-semibold mb-1"
            htmlFor="checkout-remarks"
          >
            Remarks
          </label>
          <textarea
            id="checkout-remarks"
            className="w-full px-3 py-2 text-primary mb-6 resize-none"
            placeholder="Enter remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            disabled={isLoading}
          />
        </div>
        {error && (
          <div className="mb-3 text-red-300 text-sm font-semibold">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            className="btn-primary-outline"
            onClick={onClose}
            type="button"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn-secondary"
            onClick={handleConfirm}
            type="button"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>
                <span className="animate-spin inline-block mr-2">⏳</span>
                Confirming...
              </span>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPopup;
