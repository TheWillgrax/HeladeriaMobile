import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { orderApi, catalogApi, adminApi } from "@/services/api";
import { COLORS } from "@/constants/colors";

const PRODUCT_FORM_INITIAL = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  stock: "0",
  categoryId: null,
  active: true,
};

const TABS = [
  { key: "dashboard", label: "Resumen" },
  { key: "products", label: "Productos" },
  { key: "users", label: "Usuarios" },
];

export default function AdminScreen() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [productForm, setProductForm] = useState(PRODUCT_FORM_INITIAL);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const load = async () => {
      if (!token || !isAdmin) return;
      setLoading(true);
      setError(null);
      try {
        const [ordersResponse, productsResponse, categoriesResponse, dashboardResponse, usersResponse] =
          await Promise.all([
            orderApi.allOrders(token),
            catalogApi.products(),
            catalogApi.categories(),
            adminApi.dashboard(token),
            adminApi.users(token),
          ]);
        setOrders(ordersResponse.orders || []);
        setProducts(productsResponse.products || []);
        setCategories(categoriesResponse.categories || []);
        setDashboard(dashboardResponse);
        setUsersList(usersResponse.users || []);
        setProductForm((prev) => ({
          ...prev,
          categoryId: categoriesResponse.categories?.[0]
            ? String(categoriesResponse.categories[0].id)
            : prev.categoryId,
        }));
      } catch (err) {
        setError(err.message || "No pudimos obtener la información administrativa");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, isAdmin]);

  const refreshProducts = async () => {
    const response = await catalogApi.products();
    setProducts(response.products || []);
  };

  const refreshDashboard = async () => {
    const response = await adminApi.dashboard(token);
    setDashboard(response);
  };

  const refreshUsers = async () => {
    const response = await adminApi.users(token);
    setUsersList(response.users || []);
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      setUpdating(true);
      const updated = await orderApi.updateStatus(token, orderId, status);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: updated.status } : order))
      );
      await refreshDashboard();
      return updated;
    } catch (err) {
      Alert.alert("Error actualizando el estado", err.message || "Intenta nuevamente");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleProduct = async (product) => {
    try {
      setUpdating(true);
      await catalogApi.updateProduct(token, product.id, {
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.image_url,
        stock: product.stock,
        categoryId: product.category_id,
        active: product.active ? 0 : 1,
      });
      await Promise.all([refreshProducts(), refreshDashboard()]);
    } catch (err) {
      Alert.alert("Error actualizando el producto", err.message || "Intenta de nuevo");
    } finally {
      setUpdating(false);
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      ...PRODUCT_FORM_INITIAL,
      categoryId: categories[0] ? String(categories[0].id) : null,
    });
    setProductFormVisible(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price != null ? String(product.price) : "",
      imageUrl: product.image_url || "",
      stock: product.stock != null ? String(product.stock) : "0",
      categoryId: product.category_id != null ? String(product.category_id) : null,
      active: !!product.active,
    });
    setProductFormVisible(true);
  };

  const closeProductForm = () => {
    setProductFormVisible(false);
    setEditingProduct(null);
    setProductForm({
      ...PRODUCT_FORM_INITIAL,
      categoryId: categories[0] ? String(categories[0].id) : null,
    });
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitProduct = async () => {
    if (!productForm.name.trim()) {
      Alert.alert("Falta información", "El nombre del producto es obligatorio");
      return;
    }

    if (!productForm.price || Number.isNaN(Number(productForm.price))) {
      Alert.alert("Precio inválido", "Ingresa un precio válido");
      return;
    }

    if (!productForm.categoryId) {
      Alert.alert("Selecciona categoría", "Elige una categoría para el producto");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      imageUrl: productForm.imageUrl.trim(),
      stock: Number(productForm.stock || 0),
      categoryId: Number(productForm.categoryId),
      active: productForm.active ? 1 : 0,
    };

    try {
      setSavingProduct(true);
      if (editingProduct) {
        await catalogApi.updateProduct(token, editingProduct.id, payload);
      } else {
        await catalogApi.createProduct(token, payload);
      }
      await Promise.all([refreshProducts(), refreshDashboard()]);
      closeProductForm();
    } catch (err) {
      Alert.alert("Error guardando producto", err.message || "Intenta nuevamente");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = (product) => {
    Alert.alert("Eliminar producto", `¿Seguro que deseas eliminar ${product.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingProductId(product.id);
            await catalogApi.deleteProduct(token, product.id);
            await Promise.all([refreshProducts(), refreshDashboard()]);
          } catch (err) {
            Alert.alert("Error eliminando", err.message || "No se pudo eliminar");
          } finally {
            setDeletingProductId(null);
          }
        },
      },
    ]);
  };

  const formattedSummary = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: "Ventas totales", value: `$${dashboard.summary.totalRevenue.toFixed(2)}` },
      { label: "Pedidos", value: String(dashboard.summary.totalOrders) },
      { label: "Pagados", value: String(dashboard.summary.paidOrders) },
      { label: "Pendientes", value: String(dashboard.summary.pendingOrders) },
      { label: "Cancelados", value: String(dashboard.summary.cancelledOrders) },
      { label: "Productos activos", value: String(dashboard.inventory.activeProducts) },
    ];
  }, [dashboard]);

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Zona administrativa</Text>
        <Text style={styles.subtitle}>Solo los usuarios con rol administrador pueden acceder aquí.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Panel de administración</Text>
      <Text style={styles.subtitle}>Gestiona pedidos, inventario, usuarios y métricas clave.</Text>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {activeTab === "dashboard" && (
        <View style={styles.section}>
          {dashboard ? (
            <>
              <View style={styles.metricsGrid}>
                {formattedSummary.map((item) => (
                  <View key={item.label} style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{item.label}</Text>
                    <Text style={styles.metricValue}>{item.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ventas recientes</Text>
                {dashboard.salesByMonth.length === 0 ? (
                  <Text style={styles.emptyText}>Sin datos todavía.</Text>
                ) : (
                  dashboard.salesByMonth.map((row) => (
                    <View key={row.month} style={styles.inlineCard}>
                      <Text style={styles.inlineCardTitle}>{row.month}</Text>
                      <Text style={styles.inlineCardSubtitle}>
                        {row.orders} pedidos • ${row.revenue.toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top productos</Text>
                {dashboard.topProducts.length === 0 ? (
                  <Text style={styles.emptyText}>Todavía no hay productos vendidos.</Text>
                ) : (
                  dashboard.topProducts.map((product) => (
                    <View key={product.id} style={styles.inlineCard}>
                      <Text style={styles.inlineCardTitle}>{product.name}</Text>
                      <Text style={styles.inlineCardSubtitle}>
                        {product.unitsSold} vendidos • ${product.revenue.toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : (
            <ActivityIndicator color={COLORS.primary} />
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos recientes</Text>
              {updating && <ActivityIndicator color={COLORS.primary} />}
            </View>
            {orders.length === 0 ? (
              <Text style={styles.emptyText}>Aún no hay pedidos registrados.</Text>
            ) : (
              orders.map((order) => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Orden #{order.id}</Text>
                    <Text style={[styles.badge, styles[`status${order.status}`] || styles.badge]}>
                      {order.status}
                    </Text>
                  </View>
                  <Text style={styles.cardSubtitle}>
                    Cliente: {order.customerName || "Invitado"} - Total ${Number(order.total).toFixed(2)}
                  </Text>
                  <View style={styles.orderItems}>
                    {order.items?.map((item) => (
                      <Text key={item.id} style={styles.orderItem}>
                        {item.quantity}x {item.name}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleStatusChange(order.id, "paid")}
                    >
                      <Text style={styles.actionButtonText}>Marcar pagado</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.dangerButton]}
                      onPress={() => handleStatusChange(order.id, "cancelled")}
                    >
                      <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {activeTab === "products" && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Inventario</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openCreateProduct}>
              <Text style={styles.primaryButtonText}>Nuevo producto</Text>
            </TouchableOpacity>
          </View>

          {productFormVisible && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {editingProduct ? "Editar producto" : "Crear producto"}
              </Text>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  value={productForm.name}
                  onChangeText={(text) => handleProductFormChange("name", text)}
                  style={styles.input}
                  placeholder="Helado artesanal"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Descripción</Text>
                <TextInput
                  value={productForm.description}
                  onChangeText={(text) => handleProductFormChange("description", text)}
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Describe los ingredientes"
                  placeholderTextColor={COLORS.textLight}
                  multiline
                />
              </View>

              <View style={styles.formRowInline}>
                <View style={styles.formColumn}>
                  <Text style={styles.inputLabel}>Precio</Text>
                  <TextInput
                    value={productForm.price}
                    onChangeText={(text) => handleProductFormChange("price", text)}
                    style={styles.input}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={styles.inputLabel}>Stock</Text>
                  <TextInput
                    value={productForm.stock}
                    onChangeText={(text) => handleProductFormChange("stock", text)}
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Imagen (URL)</Text>
                <TextInput
                  value={productForm.imageUrl}
                  onChangeText={(text) => handleProductFormChange("imageUrl", text)}
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Categoría</Text>
                <View style={styles.chipsContainer}>
                  {categories.length === 0 ? (
                    <Text style={styles.emptyText}>No hay categorías disponibles.</Text>
                  ) : (
                    categories.map((category) => {
                      const active = productForm.categoryId === String(category.id);
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => handleProductFormChange("categoryId", String(category.id))}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{category.name}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Estado</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, productForm.active && styles.toggleButtonActive]}
                  onPress={() => handleProductFormChange("active", !productForm.active)}
                >
                  <Text style={[styles.toggleButtonText, productForm.active && styles.toggleButtonTextActive]}>
                    {productForm.active ? "Publicado" : "Oculto"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.formButton]}
                  onPress={handleSubmitProduct}
                  disabled={savingProduct}
                >
                  {savingProduct ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {editingProduct ? "Guardar cambios" : "Crear producto"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryButton, styles.formButton]} onPress={closeProductForm}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {products.length === 0 ? (
            <Text style={styles.emptyText}>No hay productos registrados todavía.</Text>
          ) : (
            products.map((product) => (
              <View key={product.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{product.name}</Text>
                    <Text style={styles.cardSubtitle}>{product.category_name}</Text>
                  </View>
                  <Text style={[styles.badge, product.active ? styles.statuspaid : styles.statuscancelled]}>
                    {product.active ? "Activo" : "Inactivo"}
                  </Text>
                </View>
                <Text style={styles.cardSubtitle}>Stock: {product.stock} unidades</Text>
                <Text style={styles.cardSubtitle}>${Number(product.price).toFixed(2)}</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => openEditProduct(product)}>
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleProduct(product)}>
                    <Text style={styles.actionButtonText}>
                      {product.active ? "Despublicar" : "Publicar"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={() => handleDeleteProduct(product)}
                    disabled={deletingProductId === product.id}
                  >
                    {deletingProductId === product.id ? (
                      <ActivityIndicator color={COLORS.error} />
                    ) : (
                      <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Eliminar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === "users" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usuarios registrados</Text>
          {usersList.length === 0 ? (
            <Text style={styles.emptyText}>Todavía no hay usuarios registrados.</Text>
          ) : (
            usersList.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={[styles.badge, item.role === "admin" ? styles.statuspaid : styles.statuspending]}>
                    {item.role}
                  </Text>
                </View>
                <Text style={styles.cardSubtitle}>{item.email}</Text>
                {item.phone && <Text style={styles.cardSubtitle}>Teléfono: {item.phone}</Text>}
                <Text style={styles.cardSubtitle}>Registrado: {new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.refreshButton} onPress={refreshUsers}>
            <Text style={styles.refreshButtonText}>Actualizar usuarios</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: COLORS.background,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.textLight,
    marginTop: 6,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 6,
    marginTop: 20,
    gap: 6,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    color: COLORS.textLight,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: COLORS.white,
  },
  section: {
    gap: 12,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flexBasis: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  metricLabel: {
    color: COLORS.textLight,
    fontSize: 13,
    marginBottom: 4,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: COLORS.text,
  },
  cardSubtitle: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  inlineCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inlineCardTitle: {
    fontWeight: "700",
    color: COLORS.text,
  },
  inlineCardSubtitle: {
    color: COLORS.textLight,
    marginTop: 4,
  },
  orderItems: {
    gap: 4,
  },
  orderItem: {
    color: COLORS.text,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: COLORS.errorLight,
  },
  dangerButtonText: {
    color: COLORS.error,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: "capitalize",
    color: COLORS.white,
    fontWeight: "700",
    backgroundColor: COLORS.primary,
  },
  statuspaid: {
    backgroundColor: COLORS.success,
  },
  statuspending: {
    backgroundColor: COLORS.primary,
  },
  statuscancelled: {
    backgroundColor: COLORS.error,
  },
  emptyText: {
    color: COLORS.textLight,
  },
  error: {
    color: COLORS.error,
  },
  formRow: {
    marginTop: 12,
    gap: 6,
  },
  formRowInline: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  formColumn: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.textLight,
    fontWeight: "600",
  },
  chipTextActive: {
    color: COLORS.white,
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  toggleButtonText: {
    color: COLORS.textLight,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  formButton: {
    flex: 1,
  },
  refreshButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
});
