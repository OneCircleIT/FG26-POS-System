import React, { useState, useEffect, useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import TopNavBar from "./TopNavBar";
import Item from "./Item";
import ItemRow from "./ItemRow";
import InvoiceEmailPopup from "./InvoiceEmailPopup";
import LogoutPopUp from "./LogoutPopUp";
import { loginSuccess, logout } from "../store/authSlice";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from '../store/hooks';
import CheckoutPopup from "./CheckoutPopup";
import { requestCatalog } from "../utils/appScriptClient";

const MainPage = () => {
  const [cart, setCart] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const { staffName, items, products, passcode } = useAppSelector((state) => state.auth);
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showCheckoutPopUp, setShowCheckoutPopUp] = useState(false);

  const normalizedProducts = useMemo(() => {
    const source = (products && products.length > 0)
      ? products
      : (items || []).map((item, index) => ({
          productId: `legacy-${item.id || index}`,
          name: item.name,
          image: item.image,
          category: '',
          displayOrder: index,
          variants: [
            {
              variantId: item.id,
              color: '',
              size: '',
              price: Number(item.price || 0),
              stockQty: Number(item.stockQty || 0),
              active: true,
              trackStock: false,
              allowBackorder: false,
            },
          ],
        }));

    const seenProductIds = new Set();
    const seenVariantIds = new Set();

    return source.map((product, productIdx) => {
      let rawProductId = product.productId ? String(product.productId).trim() : '';
      if (!rawProductId) {
        rawProductId = `product-${productIdx}`;
      }
      let productId = rawProductId;
      let productSuffix = 1;
      while (seenProductIds.has(productId)) {
        productId = `${rawProductId}-${productSuffix}`;
        productSuffix += 1;
      }
      seenProductIds.add(productId);

      const variants = (product.variants || []).map((variant, variantIdx) => {
        let rawVariantId = variant.variantId ? String(variant.variantId).trim() : '';
        if (!rawVariantId) {
          rawVariantId = `${productId}-v${variantIdx}`;
        }
        let variantId = rawVariantId;
        let variantSuffix = 1;
        while (seenVariantIds.has(variantId)) {
          variantId = `${rawVariantId}-${variantSuffix}`;
          variantSuffix += 1;
        }
        seenVariantIds.add(variantId);

        return {
          ...variant,
          variantId,
        };
      });

      return {
        ...product,
        productId,
        variants,
      };
    });
  }, [products, items]);

  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState({});

  const variantIndex = useMemo(() => {
    const map = {};
    normalizedProducts.forEach((product) => {
      (product.variants || []).forEach((variant) => {
        map[variant.variantId] = {
          ...variant,
          productId: product.productId,
          productName: product.name,
          image: product.image,
        };
      });
    });
    return map;
  }, [normalizedProducts]);

  const handleStaffNameClick = () => {
    setShowLogoutPopup(true);
  };

  const handleLogoutConfirm = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleLogout = (e) => {
    handleLogoutConfirm();
  };

  const onClickCheckout = (e) => {
    setShowCheckoutPopUp(true);
  }

  const onCancelCheckout = (e) => {
    setShowCheckoutPopUp(false);
  }


  useEffect(() => {
    if ((products && products.length > 0) || (items && items.length > 0)) {
      return;
    }
    if ((!products || products.length === 0) && (!items || items.length === 0) && passcode) {
      requestCatalog(passcode)
        .then((data) => {
          if (data?.success) {
            dispatch(loginSuccess({
              ...data,
            }));
          } else {
            navigate('/login');
          }
        })
        .catch(() => {
          navigate('/login');
        });
    } else if (!passcode) {
      navigate('/login');
    }
    // eslint-disable-next-line
  }, [items, products, passcode]);

  useEffect(() => {
    setSelectedVariantByProduct((prev) => {
      const next = { ...prev };
      normalizedProducts.forEach((product) => {
        const activeVariants = (product.variants || []).filter((variant) => variant.active !== false);
        if (activeVariants.length === 0) {
          return;
        }
        const previousVariantId = prev[product.productId];
        const hasPreviousStillValid = activeVariants.some((variant) => variant.variantId === previousVariantId);
        if (!hasPreviousStillValid) {
          next[product.productId] = activeVariants[0].variantId;
        }
      });
      return next;
    });
  }, [normalizedProducts]);

  // Calculate total and item count
  const total = Object.entries(cart).reduce((sum, [variantId, quantity]) => {
    const variant = variantIndex[variantId];
    return sum + (variant ? Number(variant.price || 0) * quantity : 0);
  }, 0);

  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  // Format cart items for display
  const cartItems = Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([variantId, quantity]) => {
      const variant = variantIndex[variantId];
      if (!variant) {
        return null;
      }
      const variantLabel = [variant.color, variant.size].filter(Boolean).join(" / ");
      return {
        id: variant.variantId,
        variantId: variant.variantId,
        productId: variant.productId,
        name: variantLabel ? `${variant.productName} (${variantLabel})` : variant.productName,
        productName: variant.productName,
        variantLabel,
        price: Number(variant.price || 0),
        quantity,
        stockQty: Number(variant.stockQty || 0),
      };
    })
    .filter(Boolean);

  const handleQuantityChange = (variantId, newQuantity) => {
    setCart(prev => ({
      ...prev,
      [variantId]: Math.max(0, Number(newQuantity) || 0)
    }));
  };

  const handleVariantChange = (productId, variantId) => {
    setSelectedVariantByProduct((prev) => ({
      ...prev,
      [productId]: variantId,
    }));
  };

  const handleViewModeToggle = () => {
    setViewMode(prev => prev === 'grid' ? 'table' : 'grid');
  };

  const handleEmailButtonClick = () => {
    setShowEmailPopup(true);
  };

  const handleEmailSave = (email) => {
    setInvoiceEmail(email);
  };

  const handleEmailPopupClose = () => {
    setShowEmailPopup(false);
  };

  const onClearContents = async ({email, paymentMethod, remarks}) => {
    // Reset cart
    setShowCheckoutPopUp(false);
    setCart({});
    setInvoiceEmail('');
    return true;
  };

  return (
    <div className={`main-page bg-primary min-h-screen t-0 w-full pt-[68px] ${showCheckoutPopUp? 'fixed': ''}`}>
      <TopNavBar total={total} itemCount={itemCount} onClickCheckout={onClickCheckout} cartItems={cartItems} />
      


      {/* Show staff name in the top right, similar to TopNavBar, but only if staffName is set */}
      <div className="flex justify-between items-center max-w-5xl mx-auto mb-2 px-2">
          <span
            className="text-xs text-white cursor-pointer hover:underline transition"
            onClick={handleStaffNameClick}
            title="Click to logout"
          >
            Staff: {staffName}
          </span>
        </div>
      <div className="flex justify-between items-center max-w-5xl mx-auto px-2 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleViewModeToggle}
            title={`Switch to ${viewMode === 'grid' ? 'table' : 'grid'} view`}
          >
            {viewMode === 'grid' ? 'Table View' : 'Grid View'}
          </button>
          <button
            type="button"
            className="btn-sm btn-primary"
            disabled={isSubmitting || itemCount === 0}
            onClick={() => setCart({})}
            title="Reset all quantities"
          >
            Reset
          </button>
        </div>
        
        <button
          className="btn-primary-outline btn-sm"
          onClick={handleEmailButtonClick}
        >
          {invoiceEmail ? `${invoiceEmail} (Edit)` : 'No Invoice Email (Add)'}
        </button>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="items-grid grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-1 max-w-5xl mx-auto px-2 pb-8">
          {normalizedProducts.map(product => (
            <Item
              key={product.productId}
              product={product}
              selectedVariantId={selectedVariantByProduct[product.productId]}
              quantity={cart[selectedVariantByProduct[product.productId]] || 0}
              onVariantChange={handleVariantChange}
              onQuantityChange={handleQuantityChange}
            />
          ))}
        </div>
      ) : (
        <div className="items-table-container max-w-5xl mx-auto px-2 pb-8">
          <table className="items-table w-full border border-gray-200  bg-primary shadow-sm">
            <tbody>
              {normalizedProducts.map(product => (
                <ItemRow
                  key={product.productId}
                  product={product}
                  selectedVariantId={selectedVariantByProduct[product.productId]}
                  quantity={cart[selectedVariantByProduct[product.productId]] || 0}
                  onVariantChange={handleVariantChange}
                  onQuantityChange={handleQuantityChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Email Popup */}
      {showEmailPopup && <InvoiceEmailPopup
        isOpen={showEmailPopup}
        onClose={handleEmailPopupClose}
        onSave={handleEmailSave}
        currentEmail={invoiceEmail}
      />
}
      {/* Logout Popup */}
      {showLogoutPopup && (
        <LogoutPopUp
          isOpen={showLogoutPopup}
          onCancel={() => setShowLogoutPopup(false)}
          onConfirm={handleLogout}
        />
      )}

      {showCheckoutPopUp && (
      <CheckoutPopup
        isOpen={showCheckoutPopUp}
        onClose={onCancelCheckout}
        total={total}
        itemCount={itemCount}
        cartItems={cartItems}
        onClearContents={onClearContents}
        invoiceEmail={invoiceEmail}
        onInvoiceEmailChange={setInvoiceEmail}
      />
      )}
    </div>
  );
};

export default MainPage;
