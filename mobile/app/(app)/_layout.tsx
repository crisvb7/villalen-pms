// app/(app)/_layout.tsx
// Navegación por pestañas de la zona autenticada.

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoy",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: "Reservas",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="habitaciones"
        options={{
          title: "Habitaciones",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bed-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="caja"
        options={{
          title: "Caja",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: "Más",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
