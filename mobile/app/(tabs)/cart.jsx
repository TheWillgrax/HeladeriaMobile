import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";

export default function CartScreen() {
  const { items, totals, loading, updateItem, removeItem, checkout } = useCart();
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const subtotal = Number(totals?.subtotal ?? 0);
  const total = Number(totals?.total ?? subtotal);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [receiptPath, setReceiptPath] = useState(null);
  const [openingReceipt, setOpeningReceipt] = useState(false);

  const CartItem = ({ item, onIncrease, onDecrease, onRemove }) => (
    <View style={styles.itemCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${Number(item.unitPrice).toFixed(2)}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity style={styles.quantityButton} onPress={onDecrease}>
          <Ionicons name="remove" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.quantityValue}>{item.quantity}</Text>
        <TouchableOpacity style={styles.quantityButton} onPress={onIncrease}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Ionicons name="trash" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    if (items.length) {
      setMessage(null);
      setReceiptPath(null);
    }
  }, [items.length]);

  const handleIncrease = async (item) => {
    try {
      await updateItem({ itemId: item.id, quantity: item.quantity + 1 });
    } catch (err) {
      Alert.alert("No se pudo actualizar", err.message || "Intenta nuevamente");
    }
  };

  const handleDecrease = async (item) => {
    try {
      const nextQuantity = item.quantity - 1;
      if (nextQuantity <= 0) {
        await removeItem(item.id);
      } else {
        await updateItem({ itemId: item.id, quantity: nextQuantity });
      }
    } catch (err) {
      Alert.alert("No se pudo actualizar", err.message || "Intenta nuevamente");
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await removeItem(itemId);
    } catch (err) {
      Alert.alert("No se pudo eliminar", err.message || "Intenta nuevamente");
    }
  };

  const handleCheckout = async () => {
    if (!items.length) {
      Alert.alert("Tu carrito está vacío", "Agrega helados antes de continuar.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      setReceiptPath(null);
      const order = await checkout();
      const totalAmount = Number(order?.totals?.total ?? totals.total);
      setReceiptPath(order?.receipt?.url || null);
      setMessage(
        `¡Pedido #${order.orderId} recibido! Total $${totalAmount.toFixed(2)}. Descarga tu comprobante cuando quieras.`
      );
    } catch (err) {
      Alert.alert("No pudimos procesar tu pedido", err.message || "Intenta de nuevo más tarde");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceipt = async () => {
    if (!receiptPath) return;
    if (!token) {
      Alert.alert("Inicia sesión", "Necesitas iniciar sesión para descargar tu comprobante.");
      return;
    }

    try {
      setOpeningReceipt(true);
      const separator = receiptPath.includes("?") ? "&" : "?";
      const url = `${API_BASE_URL}${receiptPath}${separator}token=${encodeURIComponent(token)}`;
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("No se pudo abrir el comprobante", err.message || "Intenta nuevamente.");
    } finally {
      setOpeningReceipt(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tu carrito</Text>
        <Text style={styles.subtitle}>
          {user ? `Listo para disfrutar, ${user.name.split(" ")[0]}!` : "Inicia sesión para guardar tus helados."}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CartItem
            item={item}
            onIncrease={() => handleIncrease(item)}
            onDecrease={() => handleDecrease(item)}
            onRemove={() => handleRemove(item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Tu carrito está vacío por ahora.</Text>}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryTotal}>${total.toFixed(2)}</Text>
        </View>
        {message && <Text style={styles.success}>{message}</Text>}
        {receiptPath && (
          <TouchableOpacity style={styles.receiptButton} onPress={handleOpenReceipt} disabled={openingReceipt}>
            {openingReceipt ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.receiptButtonText}>Descargar comprobante</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.checkoutText}>Confirmar pedido</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      color: colors.textLight,
      marginTop: 4,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
      gap: 16,
    },
    itemCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 18,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      gap: 12,
    },
    itemName: {
      fontWeight: "700",
      fontSize: 16,
      color: colors.text,
    },
    itemPrice: {
      color: colors.primary,
      fontWeight: "600",
      marginTop: 4,
    },
    quantityControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.background,
      padding: 6,
      borderRadius: 12,
    },
    quantityButton: {
      backgroundColor: colors.white,
      borderRadius: 10,
      padding: 6,
    },
    quantityValue: {
      fontWeight: "700",
      color: colors.text,
    },
    removeButton: {
      padding: 6,
    },
    summary: {
      padding: 20,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      gap: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -4 },
      elevation: 6,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    summaryLabel: {
      color: colors.textLight,
    },
    summaryValue: {
      color: colors.text,
      fontWeight: "600",
    },
    summaryTotal: {
      fontWeight: "800",
      fontSize: 20,
      color: colors.primary,
    },
    checkoutButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 8,
    },
    receiptButton: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 8,
      backgroundColor: colors.white,
    },
    receiptButtonText: {
      color: colors.primary,
      fontWeight: "700",
      fontSize: 16,
    },
    checkoutText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 16,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textLight,
      marginTop: 40,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    success: {
      color: colors.success,
      fontWeight: "600",
      textAlign: "center",
    },
  });
