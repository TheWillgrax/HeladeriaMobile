import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { catalogApi, orderApi, resolveImageUrl } from "@/services/api";
import { COLORS } from "@/constants/colors";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const heroImage = {
  uri: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=500&q=60",
};
const fallbackProductImage = "https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=600&q=60";

const getProductImage = (imageUrl) => {
  const resolved = resolveImageUrl(imageUrl);
  return { uri: resolved || fallbackProductImage };
};

export default function HomeScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const { token, user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [catRes, prodRes] = await Promise.all([catalogApi.categories(), catalogApi.products()]);
        setCategories(catRes.categories?.slice(0, 4) || []);
        setFeatured(prodRes.products?.slice(0, 6) || []);
      } catch (err) {
        setError(err.message || "No pudimos cargar la información");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      if (!token) {
        setOrders([]);
        return;
      }
      try {
        const response = await orderApi.myOrders(token);
        setOrders(response.orders?.slice(0, 3) || []);
      } catch (err) {
        console.warn("No se pudieron cargar los pedidos", err?.message);
      }
    };

    loadOrders();
  }, [token]);

  const handleAddToCart = async (productId) => {
    try {
      await addItem({ productId, quantity: 1 });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTag}>Helados Victoria</Text>
          <Text style={styles.heroTitle}>Sabores hechos con amor mexicano</Text>
          <Text style={styles.heroSubtitle}>
            Descubre nuestras combinaciones de temporada, paletas artesanales y malteadas cremosas.
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(tabs)/menu")}>
              <Text style={styles.primaryButtonText}>Explorar carta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/(tabs)/cart")}>
              <Text style={styles.secondaryButtonText}>Ver carrito</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Image source={heroImage} style={styles.heroImage} resizeMode="contain" />
      </View>

      {loading && (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && (
        <>
          <Text style={styles.sectionTitle}>Categorías populares</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => router.push({ pathname: "/(tabs)/menu", params: { categoryId: category.id, categoryName: category.name } })}
              >
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Recomendados para ti</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
            {featured.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <Image source={getProductImage(product.image_url)} style={styles.productImage} />
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDescription} numberOfLines={2}>
                  {product.description}
                </Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>${Number(product.price).toFixed(2)}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(product.id)}>
                    <Text style={styles.addButtonText}>Añadir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {user && (
            <View style={styles.ordersSection}>
              <Text style={styles.sectionTitle}>Tus últimos pedidos</Text>
              {orders.length === 0 ? (
                <Text style={styles.emptyText}>Aún no has realizado pedidos. ¡Haz tu primera orden helada!</Text>
              ) : (
                orders.map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderId}>Orden #{order.id}</Text>
                      <Text style={styles.orderStatus}>{order.status}</Text>
                    </View>
                    <Text style={styles.orderTotal}>Total: ${Number(order.total).toFixed(2)}</Text>
                    <View style={styles.orderItems}>
                      {order.items?.map((item) => (
                        <Text key={item.id} style={styles.orderItem}>
                          {item.quantity}x {item.name}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
    backgroundColor: COLORS.background,
  },
  hero: {
    backgroundColor: COLORS.primary,
    margin: 20,
    borderRadius: 28,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  heroText: {
    flex: 1,
    gap: 12,
  },
  heroTag: {
    color: COLORS.white,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.white,
    lineHeight: 34,
  },
  heroSubtitle: {
    color: COLORS.white,
    opacity: 0.85,
    fontSize: 14,
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  heroImage: {
    width: 140,
    height: 140,
    marginLeft: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  categoryRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 18,
    width: 200,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  categoryName: {
    fontWeight: "700",
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 6,
  },
  categoryDescription: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  productRow: {
    paddingHorizontal: 16,
    gap: 16,
  },
  productCard: {
    width: 220,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  productImage: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: COLORS.background,
  },
  productName: {
    fontWeight: "700",
    fontSize: 16,
    color: COLORS.text,
  },
  productDescription: {
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: 6,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  productPrice: {
    fontWeight: "700",
    color: COLORS.primary,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  ordersSection: {
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textLight,
    marginHorizontal: 20,
    fontSize: 14,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderId: {
    fontWeight: "700",
    color: COLORS.text,
  },
  orderStatus: {
    fontWeight: "600",
    color: COLORS.accent,
    textTransform: "capitalize",
  },
  orderTotal: {
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  orderItems: {
    gap: 4,
  },
  orderItem: {
    color: COLORS.textLight,
  },
  loadingWrapper: {
    marginVertical: 40,
    alignItems: "center",
  },
  error: {
    color: COLORS.error,
    textAlign: "center",
    marginTop: 12,
  },
});
