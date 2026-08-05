// components/calendar/QuickCreateModal.tsx
// Alta rápida de reserva al tocar una celda libre del calendario — mismos
// campos que el modal de app/admin/calendario en la web.

import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import * as api from "@/lib/api";
import { Button } from "@/components/Button";
import { ModalSheet } from "@/components/ModalSheet";
import { TextField } from "@/components/TextField";
import { addDays, toISODate } from "@/lib/date";
import { colors } from "@/lib/theme";
import type { Booking, Room } from "@/lib/types";

interface Target {
  room: Room;
  date: Date;
}

export function QuickCreateModal({
  target,
  onClose,
  onCreated,
}: {
  target: Target | null;
  onClose: () => void;
  onCreated: (booking: Booking) => void;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target) return;
    setCheckIn(toISODate(target.date));
    setCheckOut(toISODate(addDays(target.date, 1)));
    setFirstName("");
    setLastName("");
    setDocumentId("");
    setEmail("");
    setPhone("");
    setAdults("1");
    setChildren("0");
  }, [target]);

  async function submit() {
    if (!target) return;
    if (!firstName.trim() || !lastName.trim() || !documentId.trim() || !email.trim()) {
      Alert.alert("Datos incompletos", "Nombre, apellidos, documento y email son obligatorios.");
      return;
    }
    if (checkOut <= checkIn) {
      Alert.alert("Fechas inválidas", "La fecha de salida debe ser posterior a la de entrada.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createBooking({
        roomId: target.room.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        guest: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          documentId: documentId.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        },
      });
      onCreated(res.data);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo crear la reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalSheet visible={!!target} title="Nueva reserva" onClose={onClose}>
      {target ? <Text style={styles.roomLabel}>{target.room.name}</Text> : null}

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Entrada" value={checkIn} onChangeText={setCheckIn} placeholder="AAAA-MM-DD" />
        </View>
        <View style={styles.half}>
          <TextField label="Salida" value={checkOut} onChangeText={setCheckOut} placeholder="AAAA-MM-DD" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Nombre" value={firstName} onChangeText={setFirstName} />
        </View>
        <View style={styles.half}>
          <TextField label="Apellidos" value={lastName} onChangeText={setLastName} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Documento" value={documentId} onChangeText={setDocumentId} />
        </View>
        <View style={styles.half}>
          <TextField label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Adultos" value={adults} onChangeText={setAdults} keyboardType="number-pad" />
        </View>
        <View style={styles.half}>
          <TextField label="Niños" value={children} onChangeText={setChildren} keyboardType="number-pad" />
        </View>
      </View>

      <Button label="Crear reserva" onPress={submit} loading={submitting} />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  roomLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
});
