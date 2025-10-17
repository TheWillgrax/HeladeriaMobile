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
  Image,
} from "react-native";
// eslint-disable-next-line import/no-unresolved
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { orderApi, catalogApi, adminApi } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";

const PRODUCT_FORM_INITIAL = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  stock: "0",
  categoryId: null,
  active: true,
  imageUpload: null,
};

const USER_FORM_INITIAL = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "customer",
};

const USER_ROLES = [
  { key: "customer", label: "Cliente" },
  { key: "admin", label: "Administrador" },
];

const TABS = [
  { key: "dashboard", label: "Resumen" },
  { key: "products", label: "Productos" },
  { key: "users", label: "Usuarios" },
  { key: "settings", label: "Configuración" },
];

export default function AdminScreen() {
  const { user, token } = useAuth();
  const { colors, theme, setTheme, toggleTheme } = useTheme();
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
  const [productImageMode, setProductImageMode] = useState("url");
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [userFormVisible, setUserFormVisible] = useState(false);
  const [userForm, setUserForm] = useState(USER_FORM_INITIAL);
  const [creatingUser, setCreatingUser] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const openCreateUserForm = () => {
    setUserForm(USER_FORM_INITIAL);
    setUserFormVisible(true);
  };

  const closeUserForm = () => {
    setUserFormVisible(false);
    setUserForm(USER_FORM_INITIAL);
  };

  const handleUserFormChange = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitUser = async () => {
    const name = userForm.name.trim();
    const email = userForm.email.trim();
    const phone = userForm.phone.trim();

    if (!name) {
      Alert.alert("Falta información", "El nombre del usuario es obligatorio");
      return;
    }

    if (!email) {
      Alert.alert("Falta información", "El correo electrónico es obligatorio");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Correo inválido", "Ingresa un correo electrónico válido");
      return;
    }

    if (!userForm.password || userForm.password.length < 6) {
      Alert.alert("Contraseña inválida", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const payload = {
      name,
      email: email.toLowerCase(),
      password: userForm.password,
      role: userForm.role,
      phone: phone ? phone : null,
    };

    try {
      setCreatingUser(true);
      await adminApi.createUser(token, payload);
      await refreshUsers();
      Alert.alert("Usuario creado", "El usuario se creó correctamente");
      closeUserForm();
    } catch (err) {
      Alert.alert("Error creando usuario", err.message || "Intenta nuevamente");
    } finally {
      setCreatingUser(false);
    }
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
    setProductImageMode("url");
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
      imageUpload: null,
    });
    setProductImageMode("url");
    setProductFormVisible(true);
  };

  const closeProductForm = () => {
    setProductFormVisible(false);
    setEditingProduct(null);
    setProductForm({
      ...PRODUCT_FORM_INITIAL,
      categoryId: categories[0] ? String(categories[0].id) : null,
    });
    setProductImageMode("url");
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickProductImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para seleccionar imágenes");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("No se pudo obtener la imagen", "Intenta nuevamente con otro archivo");
        return;
      }

      const mimeType = asset.mimeType || "image/jpeg";
      const filename = asset.fileName || `producto-${Date.now()}.jpg`;
      setProductForm((prev) => ({
        ...prev,
        imageUpload: {
          base64: asset.base64,
          mimeType,
          filename,
          previewUri: asset.uri,
        },
        imageUrl: "",
      }));
      setProductImageMode("upload");
    } catch (_error) {
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  const handleRemoveProductImage = () => {
    setProductForm((prev) => ({ ...prev, imageUpload: null }));
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

    if (productImageMode === "upload" && !productForm.imageUpload) {
      Alert.alert("Falta imagen", "Selecciona una imagen para subir");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      imageUrl: productImageMode === "url" ? productForm.imageUrl.trim() : "",
      stock: Number(productForm.stock || 0),
      categoryId: Number(productForm.categoryId),
      active: productForm.active ? 1 : 0,
    };

    if (productImageMode === "upload" && productForm.imageUpload) {
      payload.imageUpload = {
        filename: productForm.imageUpload.filename,
        mimeType: productForm.imageUpload.mimeType,
        base64: productForm.imageUpload.base64,
      };
    }

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
        <ActivityIndicator color={colors.primary} size="large" />
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
            <ActivityIndicator color={colors.primary} />
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos recientes</Text>
              {updating && <ActivityIndicator color={colors.primary} />}
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
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Descripción</Text>
                <TextInput
                  value={productForm.description}
                  onChangeText={(text) => handleProductFormChange("description", text)}
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Describe los ingredientes"
                  placeholderTextColor={colors.textLight}
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
                    placeholderTextColor={colors.textLight}
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
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Imagen</Text>
                <View style={styles.modeSwitchRow}>
                  <TouchableOpacity
                    style={[styles.modeSwitchButton, productImageMode === "url" && styles.modeSwitchButtonActive]}
                    onPress={() => {
                      setProductImageMode("url");
                      setProductForm((prev) => ({ ...prev, imageUpload: null }));
                    }}
                  >
                    <Text
                      style={[styles.modeSwitchText, productImageMode === "url" && styles.modeSwitchTextActive]}
                    >
                      Usar URL
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeSwitchButton, productImageMode === "upload" && styles.modeSwitchButtonActive]}
                    onPress={() => {
                      setProductImageMode("upload");
                    }}
                  >
                    <Text
                      style={[styles.modeSwitchText, productImageMode === "upload" && styles.modeSwitchTextActive]}
                    >
                      Subir archivo
                    </Text>
                  </TouchableOpacity>
                </View>

                {productImageMode === "url" ? (
                  <TextInput
                    value={productForm.imageUrl}
                    onChangeText={(text) => handleProductFormChange("imageUrl", text)}
                    style={styles.input}
                    placeholder="https://..."
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="none"
                  />
                ) : (
                  <View style={styles.uploadContainer}>
                    {productForm.imageUpload ? (
                      <View style={styles.uploadPreviewWrapper}>
                        <Image
                          source={{ uri: productForm.imageUpload.previewUri }}
                          style={styles.uploadPreviewImage}
                        />
                        <Text style={styles.uploadPreviewName}>{productForm.imageUpload.filename}</Text>
                        <View style={styles.uploadActions}>
                          <TouchableOpacity style={styles.outlinedButton} onPress={handlePickProductImage}>
                            <Text style={styles.outlinedButtonText}>Cambiar imagen</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.linkButton} onPress={handleRemoveProductImage}>
                            <Text style={styles.linkButtonText}>Quitar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.outlinedButton} onPress={handlePickProductImage}>
                        <Text style={styles.outlinedButtonText}>Seleccionar imagen</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
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
                    <ActivityIndicator color={colors.white} />
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
                      <ActivityIndicator color={colors.error} />
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Usuarios registrados</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openCreateUserForm}>
              <Text style={styles.primaryButtonText}>Nuevo usuario</Text>
            </TouchableOpacity>
          </View>

          {userFormVisible && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crear usuario</Text>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  value={userForm.name}
                  onChangeText={(text) => handleUserFormChange("name", text)}
                  style={styles.input}
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <TextInput
                  value={userForm.email}
                  onChangeText={(text) => handleUserFormChange("email", text)}
                  style={styles.input}
                  placeholder="usuario@ejemplo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Teléfono (opcional)</Text>
                <TextInput
                  value={userForm.phone}
                  onChangeText={(text) => handleUserFormChange("phone", text)}
                  style={styles.input}
                  placeholder="5512345678"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <TextInput
                  value={userForm.password}
                  onChangeText={(text) => handleUserFormChange("password", text)}
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Rol</Text>
                <View style={styles.chipsContainer}>
                  {USER_ROLES.map((role) => {
                    const active = userForm.role === role.key;
                    return (
                      <TouchableOpacity
                        key={role.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => handleUserFormChange("role", role.key)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{role.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.formButton]}
                  onPress={handleSubmitUser}
                  disabled={creatingUser}
                >
                  {creatingUser ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Crear usuario</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.formButton]}
                  onPress={closeUserForm}
                  disabled={creatingUser}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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

      {activeTab === "settings" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias de apariencia</Text>
          <Text style={styles.sectionDescription}>
            Elige el modo de color que prefieras. El cambio se aplicará tanto al panel administrativo como a
            la app del cliente.
          </Text>

          <View style={styles.themeOptions}>
            {[{ key: "light", label: "Modo claro", description: "Ideal para ambientes iluminados." },
              { key: "dark", label: "Modo oscuro", description: "Protege tu vista en entornos con poca luz." }].map(
              (option) => {
                const isActive = theme === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.themeOption, isActive && styles.themeOptionActive]}
                    onPress={() => setTheme(option.key)}
                  >
                    <Text style={[styles.themeOptionTitle, isActive && styles.themeOptionTitleActive]}>
                      {option.label}
                    </Text>
                    <Text
                      style={[styles.themeOptionDescription, isActive && styles.themeOptionDescriptionActive]}
                    >
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          <TouchableOpacity style={styles.toggleThemeButton} onPress={toggleTheme}>
            <Text style={styles.toggleThemeButtonText}>
              Cambiar a modo {theme === "light" ? "oscuro" : "claro"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.background,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    color: colors.textLight,
    marginTop: 6,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 6,
    marginTop: 20,
    gap: 6,
    shadowColor: colors.shadow,
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
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    color: colors.textLight,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: colors.white,
  },
  section: {
    gap: 12,
    marginTop: 24,
  },
  sectionDescription: {
    color: colors.textLight,
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flexBasis: "48%",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  metricLabel: {
    color: colors.textLight,
    fontSize: 13,
    marginBottom: 4,
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: colors.shadow,
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
    color: colors.text,
  },
  cardSubtitle: {
    color: colors.textLight,
    fontSize: 14,
  },
  inlineCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inlineCardTitle: {
    fontWeight: "700",
    color: colors.text,
  },
  inlineCardSubtitle: {
    color: colors.textLight,
    marginTop: 4,
  },
  orderItems: {
    gap: 4,
  },
  orderItem: {
    color: colors.text,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  themeOptions: {
    gap: 12,
  },
  themeOption: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 6,
  },
  themeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  themeOptionTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  themeOptionTitleActive: {
    color: colors.white,
  },
  themeOptionDescription: {
    color: colors.textLight,
    fontSize: 13,
  },
  themeOptionDescriptionActive: {
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  toggleThemeButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  toggleThemeButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  dangerButton: {
    backgroundColor: colors.errorLight,
  },
  dangerButtonText: {
    color: colors.error,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: "capitalize",
    color: colors.white,
    fontWeight: "700",
    backgroundColor: colors.primary,
  },
  statuspaid: {
    backgroundColor: colors.success,
  },
  statuspending: {
    backgroundColor: colors.primary,
  },
  statuscancelled: {
    backgroundColor: colors.error,
  },
  emptyText: {
    color: colors.textLight,
  },
  error: {
    color: colors.error,
  },
  formRow: {
    marginTop: 12,
    gap: 6,
  },
  modeSwitchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  modeSwitchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  modeSwitchButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeSwitchText: {
    color: colors.text,
    fontWeight: "600",
  },
  modeSwitchTextActive: {
    color: colors.white,
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
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    color: colors.text,
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
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textLight,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.white,
  },
  uploadContainer: {
    gap: 12,
  },
  uploadPreviewWrapper: {
    gap: 12,
    alignItems: "center",
  },
  uploadPreviewImage: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  uploadPreviewName: {
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  uploadActions: {
    flexDirection: "row",
    gap: 12,
  },
  outlinedButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  outlinedButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
  linkButton: {
    justifyContent: "center",
  },
  linkButtonText: {
    color: colors.error,
    fontWeight: "600",
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  toggleButtonText: {
    color: colors.textLight,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: colors.white,
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
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  refreshButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
});
