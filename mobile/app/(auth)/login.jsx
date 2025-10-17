import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS } from "@/constants/colors";

const initialState = { email: "", password: "" };

export default function LoginScreen() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login, authenticating } = useAuth();

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      await login({ email: form.email.trim(), password: form.password });
      router.replace("/");
    } catch (err) {
      setError(err.message || "No pudimos iniciar sesión. Intenta de nuevo.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Bienvenido a Helados Victoria</Text>
        <Text style={styles.subtitle}>Inicia sesión para ordenar tus sabores favoritos</Text>

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

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={form.password}
          onChangeText={(text) => handleChange("password", text)}
          placeholder="******"
          placeholderTextColor={COLORS.textLight}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={authenticating}>
          {authenticating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ¿Aún no tienes cuenta? {" "}
          <Link href="/(auth)/register" style={styles.linkText}>
            Regístrate aquí
          </Link>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  card: {
    width: "100%",
    maxWidth: 400,
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
