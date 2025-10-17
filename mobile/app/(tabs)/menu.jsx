import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { catalogApi, resolveImageUrl } from "@/services/api";
import { useCart } from "@/contexts/CartContext";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

const fallbackProductImage = "https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=600&q=60";

const getProductImage = (imageUrl) => {
  const resolved = resolveImageUrl(imageUrl);
  return { uri: resolved || fallbackProductImage };
};

export default function MenuScreen() {
  const params = useLocalSearchParams();
  const defaultCategory = params?.categoryId ? Number(params.categoryId) : null;
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [search, setSearch] = useState(params?.categoryName ? String(params.categoryName) : "");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { addItem } = useCart();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ProductCard = ({ product, onAdd }) => (
    <View style={styles.productCard}>
      <Image source={getProductImage(product.image_url)} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productCategory}>{product.category_name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {product.description}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>${Number(product.price).toFixed(2)}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => onAdd(product.id)}>
            <Text style={styles.addButtonText}>Añadir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const fetchCategories = useCallback(async () => {
    const response = await catalogApi.categories();
    return response.categories || [];
  }, []);

  const fetchProducts = useCallback(async (filters = {}) => {
    const response = await catalogApi.products(filters);
    return response.products || [];
  }, []);

  const loadData = useCallback(
    async ({ withCategories = false, filters = {} } = {}) => {
      setLoading(true);
      setError(null);
      try {
        if (withCategories) {
          const cats = await fetchCategories();
          setCategories(cats);
        }
        const prods = await fetchProducts(filters);
        setProducts(prods);
      } catch (err) {
        setError(err.message || "No pudimos obtener la carta");
      } finally {
        setLoading(false);
      }
    },
    [fetchCategories, fetchProducts]
  );

  const hasLoadedOnce = useRef(false);
  const latestSearchRef = useRef(search);

  useEffect(() => {
    latestSearchRef.current = search;
  }, [search]);

  useEffect(() => {
    loadData({ withCategories: true, filters: { categoryId: defaultCategory } });
    hasLoadedOnce.current = true;
  }, [defaultCategory, loadData]);

  useEffect(() => {
    if (!hasLoadedOnce.current) return;
    loadData({ filters: { categoryId: selectedCategory, search: latestSearchRef.current || undefined } });
  }, [selectedCategory, loadData]);

  const handleSearch = useCallback(async () => {
    await loadData({ filters: { categoryId: selectedCategory, search } });
  }, [loadData, selectedCategory, search]);

  const handleAddToCart = async (productId) => {
    try {
      await addItem({ productId, quantity: 1 });
    } catch (err) {
      setError(err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData({ withCategories: true, filters: { categoryId: selectedCategory, search } });
    setRefreshing(false);
  };

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.title}>Nuestra carta</Text>
        <Text style={styles.subtitle}>
          Paletas artesanales, helados cremosos y malteadas preparadas al momento.
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar sabores, toppings o categorías"
          placeholderTextColor={colors.textLight}
          style={styles.searchInput}
          onSubmitEditing={handleSearch}
        />
        <View style={styles.categoryList}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    ),
    [search, categories, selectedCategory, error, handleSearch, styles, colors.textLight]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      renderItem={({ item }) => <ProductCard product={item} onAdd={handleAddToCart} />}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.emptyText}>No encontramos helados con esos filtros.</Text>}
    />
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 12,
      gap: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      color: colors.textLight,
      fontSize: 14,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.white,
      color: colors.text,
    },
    searchButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 14,
    },
    searchButtonText: {
      color: colors.white,
      fontWeight: "700",
    },
    categoryList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },
    categoryChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryChipText: {
      color: colors.text,
      fontWeight: "600",
    },
    categoryChipTextActive: {
      color: colors.white,
    },
    listContent: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 16,
    },
    productCard: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      gap: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    productImage: {
      width: 120,
      height: 120,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    productInfo: {
      flex: 1,
      gap: 6,
    },
    productName: {
      fontWeight: "700",
      fontSize: 18,
      color: colors.text,
    },
    productCategory: {
      color: colors.accent,
      fontWeight: "600",
    },
    productDescription: {
      color: colors.textLight,
      fontSize: 13,
    },
    productFooter: {
      marginTop: "auto",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    productPrice: {
      fontWeight: "700",
      color: colors.primary,
      fontSize: 16,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    addButtonText: {
      color: colors.white,
      fontWeight: "700",
    },
    emptyText: {
      textAlign: "center",
      color: colors.textLight,
      marginTop: 32,
    },
    error: {
      color: colors.error,
      marginTop: 8,
    },
  });
