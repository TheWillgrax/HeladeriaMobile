import { Slot } from "expo-router";
import SafeScreen from "@/components/SafeScreen";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <SafeScreen>
          <Slot />
        </SafeScreen>
      </CartProvider>
    </AuthProvider>
  );
}
