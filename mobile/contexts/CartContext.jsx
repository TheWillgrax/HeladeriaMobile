import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartApi, orderApi } from "@/services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ subtotal: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const syncCartState = useCallback((payload) => {
    setItems(payload?.items || []);
    setTotals(payload?.totals || { subtotal: 0, total: 0 });
  }, []);

  const fetchCart = useCallback(async () => {
    if (!token) {
      syncCartState({ items: [], totals: { subtotal: 0, total: 0 } });
      return;
    }

    setLoading(true);
    try {
      const data = await cartApi.get(token);
      syncCartState(data);
    } catch (error) {
      console.warn("No se pudo obtener el carrito", error?.message);
      syncCartState({ items: [], totals: { subtotal: 0, total: 0 } });
    } finally {
      setLoading(false);
    }
  }, [token, syncCartState]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = useCallback(
    async ({ productId, quantity }) => {
      if (!token) throw new Error("Es necesario iniciar sesión");
      const data = await cartApi.addItem(token, { productId, quantity });
      syncCartState(data);
      return data;
    },
    [token, syncCartState]
  );

  const updateItem = useCallback(
    async ({ itemId, quantity }) => {
      if (!token) throw new Error("Es necesario iniciar sesión");
      const data = await cartApi.updateItem(token, itemId, { quantity });
      syncCartState(data);
      return data;
    },
    [token, syncCartState]
  );

  const removeItem = useCallback(
    async (itemId) => {
      if (!token) throw new Error("Es necesario iniciar sesión");
      const data = await cartApi.deleteItem(token, itemId);
      syncCartState(data);
      return data;
    },
    [token, syncCartState]
  );

  const checkout = useCallback(async () => {
    if (!token) throw new Error("Es necesario iniciar sesión");
    const order = await orderApi.checkout(token);
    await fetchCart();
    return order;
  }, [token, fetchCart]);

  const value = useMemo(
    () => ({ items, totals, loading, fetchCart, addItem, updateItem, removeItem, checkout }),
    [items, totals, loading, fetchCart, addItem, updateItem, removeItem, checkout]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
};
