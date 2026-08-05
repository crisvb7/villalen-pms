import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ModalSheet } from "@/components/ModalSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { formatDayMonth, formatMoney } from "@/lib/date";
import { colors, fonts, tones } from "@/lib/theme";
import type { CashMovementType, CashSession } from "@/lib/types";

export default function CajaScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.fetchOpenCashSession();
      setSession(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la caja.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const income = (session?.movements ?? [])
    .filter((m) => m.type === "INCOME")
    .reduce((sum, m) => sum + parseFloat(m.amount), 0);
  const expense = (session?.movements ?? [])
    .filter((m) => m.type === "EXPENSE")
    .reduce((sum, m) => sum + parseFloat(m.amount), 0);
  const expected = session ? parseFloat(session.openingBalance) + income - expense : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <ScreenHeader
        eyebrow={session ? "Abierta" : "Cerrada"}
        title={`Caja — ${formatDayMonth(new Date().toISOString())}`}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!session ? (
        <Card>
          <Text style={styles.emptyTitle}>No hay ninguna caja abierta</Text>
          <Text style={styles.emptySubtitle}>
            Abre una caja para empezar a registrar los movimientos de efectivo de hoy.
          </Text>
          <Button label="Abrir caja" onPress={() => setOpenModal(true)} />
        </Card>
      ) : (
        <>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>Saldo en caja</Text>
            <Text style={styles.balanceValue}>{formatMoney(expected)}</Text>
            <View style={styles.balanceSubRow}>
              <View style={styles.balanceSubTile}>
                <Text style={styles.balanceSubLabel}>Ingresos</Text>
                <Text style={styles.balanceSubValue}>+{formatMoney(income)}</Text>
              </View>
              <View style={styles.balanceSubTile}>
                <Text style={styles.balanceSubLabel}>Gastos</Text>
                <Text style={[styles.balanceSubValue, { color: "#F3C9BE" }]}>
                  -{formatMoney(expense)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.actionsRow}>
            <View style={styles.actionButton}>
              <Button label="+ Movimiento" onPress={() => setMovementModal(true)} />
            </View>
            <View style={styles.actionButton}>
              <Button label="Cerrar caja" variant="secondary" onPress={() => setCloseModal(true)} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Movimientos ({session.movements.length})</Text>
          {session.movements.length === 0 ? (
            <Text style={styles.emptyText}>Todavía no hay movimientos.</Text>
          ) : (
            session.movements.map((m) => (
              <Card key={m.id} style={styles.movementCard}>
                <View
                  style={[
                    styles.movementIcon,
                    { backgroundColor: m.type === "INCOME" ? tones.green.bg : tones.red.bg },
                  ]}
                >
                  <Ionicons
                    name={m.type === "INCOME" ? "arrow-down-outline" : "arrow-up-outline"}
                    size={16}
                    color={m.type === "INCOME" ? tones.green.fg : tones.red.fg}
                  />
                </View>
                <View style={styles.movementInfo}>
                  <Text style={styles.movementConcept}>{m.concept}</Text>
                  <Text style={styles.movementTime}>
                    {new Date(m.createdAt).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.movementAmount,
                    { color: m.type === "INCOME" ? colors.success : colors.danger },
                  ]}
                >
                  {m.type === "INCOME" ? "+" : "-"} {formatMoney(m.amount)}
                </Text>
              </Card>
            ))
          )}
        </>
      )}

      <OpenCajaModal
        visible={openModal}
        onClose={() => setOpenModal(false)}
        onOpened={(s) => {
          setSession(s);
          setOpenModal(false);
        }}
      />
      {session ? (
        <>
          <MovementModal
            visible={movementModal}
            sessionId={session.id}
            onClose={() => setMovementModal(false)}
            onAdded={() => {
              setMovementModal(false);
              load();
            }}
          />
          <CloseCajaModal
            visible={closeModal}
            sessionId={session.id}
            expected={expected}
            onClose={() => setCloseModal(false)}
            onClosed={() => {
              setCloseModal(false);
              setSession(null);
              load();
            }}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && styles.rowValueBold,
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function OpenCajaModal({
  visible,
  onClose,
  onOpened,
}: {
  visible: boolean;
  onClose: () => void;
  onOpened: (session: CashSession) => void;
}) {
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const amount = parseFloat(openingBalance.replace(",", "."));
    if (isNaN(amount) || amount < 0) {
      Alert.alert("Fondo inválido", "Introduce un importe válido.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.openCashSession(amount, notes || undefined);
      setOpeningBalance("");
      setNotes("");
      onOpened(res.data);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo abrir la caja.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalSheet visible={visible} title="Abrir caja" onClose={onClose}>
      <TextField
        label="Fondo inicial (€)"
        keyboardType="decimal-pad"
        value={openingBalance}
        onChangeText={setOpeningBalance}
        placeholder="0.00"
      />
      <TextField label="Notas (opcional)" value={notes} onChangeText={setNotes} />
      <Button label="Abrir caja" onPress={submit} loading={submitting} />
    </ModalSheet>
  );
}

function MovementModal({
  visible,
  sessionId,
  onClose,
  onAdded,
}: {
  visible: boolean;
  sessionId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [type, setType] = useState<CashMovementType>("INCOME");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const value = parseFloat(amount.replace(",", "."));
    if (!concept.trim() || isNaN(value) || value <= 0) {
      Alert.alert("Datos incompletos", "Introduce un concepto y un importe mayor que cero.");
      return;
    }
    setSubmitting(true);
    try {
      await api.addCashMovement(sessionId, { type, concept: concept.trim(), amount: value });
      setConcept("");
      setAmount("");
      setType("INCOME");
      onAdded();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo añadir el movimiento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalSheet visible={visible} title="Nuevo movimiento" onClose={onClose}>
      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentOption, type === "INCOME" && styles.segmentOptionActive]}
          onPress={() => setType("INCOME")}
        >
          <Text style={[styles.segmentText, type === "INCOME" && styles.segmentTextActive]}>
            Ingreso
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentOption, type === "EXPENSE" && styles.segmentOptionActive]}
          onPress={() => setType("EXPENSE")}
        >
          <Text style={[styles.segmentText, type === "EXPENSE" && styles.segmentTextActive]}>
            Gasto
          </Text>
        </Pressable>
      </View>
      <TextField label="Concepto" value={concept} onChangeText={setConcept} />
      <TextField
        label="Importe (€)"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
      />
      <Button label="Añadir movimiento" onPress={submit} loading={submitting} />
    </ModalSheet>
  );
}

function CloseCajaModal({
  visible,
  sessionId,
  expected,
  onClose,
  onClosed,
}: {
  visible: boolean;
  sessionId: string;
  expected: number;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [closingBalance, setClosingBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const value = parseFloat(closingBalance.replace(",", "."));
    if (isNaN(value) || value < 0) {
      Alert.alert("Importe inválido", "Introduce el efectivo contado.");
      return;
    }
    setSubmitting(true);
    try {
      await api.closeCashSession(sessionId, value);
      setClosingBalance("");
      onClosed();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo cerrar la caja.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalSheet visible={visible} title="Cerrar caja" onClose={onClose}>
      <Text style={styles.expectedHint}>Saldo esperado: {formatMoney(expected)}</Text>
      <TextField
        label="Efectivo contado (€)"
        keyboardType="decimal-pad"
        value={closingBalance}
        onChangeText={setClosingBalance}
        placeholder="0.00"
      />
      <Button label="Confirmar cierre" variant="danger" onPress={submit} loading={submitting} />
    </ModalSheet>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 6,
  },
  balanceValue: {
    fontFamily: fonts.serifBold,
    fontSize: 36,
    color: "#FFFFFF",
    marginBottom: 16,
  },
  balanceSubRow: {
    flexDirection: "row",
    gap: 10,
  },
  balanceSubTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 12,
  },
  balanceSubLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 3,
  },
  balanceSubValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  rowValueBold: {
    fontSize: 17,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  emptyText: {
    color: colors.textMuted,
  },
  movementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  movementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  movementInfo: {
    flex: 1,
  },
  movementConcept: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  movementTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  movementAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentOptionActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primaryText,
  },
  expectedHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 14,
  },
});
