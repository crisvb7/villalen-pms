import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ModalSheet } from "@/components/ModalSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { formatMoney, formatShortDate } from "@/lib/date";
import { colors, fonts } from "@/lib/theme";
import type { Expense } from "@/lib/types";

export default function GastosScreen() {
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.fetchExpenses();
      setExpenses(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar gastos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmDelete(expense: Expense) {
    Alert.alert("Eliminar gasto", `¿Eliminar "${expense.description}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteExpense(expense.id);
            setExpenses((es) => es.filter((e) => e.id !== expense.id));
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "No se pudo eliminar.");
          }
        },
      },
    ]);
  }

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
        <ScreenHeader eyebrow="Gestión" title="Gastos" showBack />
      </View>
      <View style={styles.header}>
        <Text style={styles.total}>{formatMoney(total)}</Text>
        <Text style={styles.totalLabel}>Total registrado</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.meta}>
                {item.category} · {formatShortDate(item.date)}
              </Text>
            </View>
            <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
            <Pressable onPress={() => confirmDelete(item)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="receipt-outline" text="No hay gastos registrados." />}
      />

      <View style={styles.fabWrap}>
        <Button label="+ Registrar gasto" onPress={() => setModalVisible(true)} />
      </View>

      <NewExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={(expense) => {
          setExpenses((es) => [expense, ...es]);
          setModalVisible(false);
        }}
      />
    </View>
  );
}

function NewExpenseModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (expense: Expense) => void;
}) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [supplier, setSupplier] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const value = parseFloat(amount.replace(",", "."));
    if (!category.trim() || !description.trim() || isNaN(value) || value <= 0) {
      Alert.alert("Datos incompletos", "Rellena categoría, descripción e importe.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createExpense({
        date: new Date().toISOString(),
        category: category.trim(),
        description: description.trim(),
        amount: value,
        supplier: supplier.trim() || undefined,
      });
      setCategory("");
      setDescription("");
      setAmount("");
      setSupplier("");
      onCreated(res.data);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo registrar el gasto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalSheet visible={visible} title="Registrar gasto" onClose={onClose}>
      <TextField label="Categoría" value={category} onChangeText={setCategory} placeholder="Suministros, mantenimiento..." />
      <TextField label="Descripción" value={description} onChangeText={setDescription} />
      <TextField
        label="Importe (€)"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
      />
      <TextField label="Proveedor (opcional)" value={supplier} onChangeText={setSupplier} />
      <Button label="Registrar" onPress={submit} loading={submitting} />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  headerWrap: {
    paddingHorizontal: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  total: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: 16,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardInfo: {
    flex: 1,
  },
  description: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  deleteButton: {
    padding: 4,
  },
  fabWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
});
