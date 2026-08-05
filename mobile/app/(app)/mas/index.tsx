import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { HubTile } from "@/components/HubTile";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/lib/auth-context";
import { colors, fonts } from "@/lib/theme";

export default function MasScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  function confirmSignOut() {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}
    >
      <ScreenHeader eyebrow="Administración" title="Opciones" />

      <Card style={styles.userCard}>
        <View style={styles.userRow}>
          <Avatar name={user?.name ?? "?"} size={48} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
        <Button label="Cerrar sesión" variant="danger" onPress={confirmSignOut} />
      </Card>

      <Text style={styles.sectionTitle}>Herramientas</Text>
      <HubTile
        icon="people-outline"
        label="Huéspedes"
        description="Historial y fichas de clientes"
        href="/mas/huespedes"
      />
      <HubTile
        icon="document-text-outline"
        label="Facturas"
        description="Emitir y gestionar facturas"
        href="/mas/facturas"
      />
      <HubTile
        icon="receipt-outline"
        label="Gastos"
        description="Suministros y mantenimiento"
        href="/mas/gastos"
      />
      <HubTile
        icon="calculator-outline"
        label="Presupuestos"
        description="Cotizaciones para clientes"
        href="/mas/presupuestos"
      />
      <HubTile
        icon="stats-chart-outline"
        label="Estadísticas"
        description="Ingresos, ocupación y rendimiento"
        href="/mas/estadisticas"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    marginBottom: 24,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 17,
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 10,
  },
});
