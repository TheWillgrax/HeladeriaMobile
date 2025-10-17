import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS } from "@/constants/colors";

const initialState = { name: "", email: "", phone: "", password: "" };

export default function RegisterScreen() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { register, authenticating } = useAuth();

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      router.replace("/");
    } catch (err) {
      setError(err.message || "No pudimos crear tu cuenta. Intenta de nuevo.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Únete a Helados Victoria</Text>
        <Text style={styles.subtitle}>Regístrate para gestionar tu carrito y recibir promociones</Text>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(text) => handleChange("name", text)}
          placeholder="Ej. Mariana López"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => handleChange("email", text)}
          placeholder="tucorreo@ejemplo.com"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(text) => handleChange("phone", text)}
          placeholder="55 1234 5678"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={form.password}
          onChangeText={(text) => handleChange("password", text)}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={COLORS.textLight}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={authenticating}>
          {authenticating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ¿Ya tienes cuenta? {" "}
          <Link href="/(auth)/login" style={styles.linkText}>
            Inicia sesión
          </Link>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    color: COLORS.text,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  footerText: {
    marginTop: 20,
    color: COLORS.text,
    textAlign: "center",
  },
  linkText: {
    color: COLORS.accent,
    fontWeight: "700",
  },
  error: {
    color: COLORS.error,
    marginBottom: 12,
    textAlign: "center",
  },
});
