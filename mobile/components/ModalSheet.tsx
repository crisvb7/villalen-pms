import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function ModalSheet({ visible, title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View
          style={[
            styles.header,
            { paddingTop: 20 + insets.top, paddingLeft: 20 + insets.left, paddingRight: 20 + insets.right },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        <View
          style={[
            styles.body,
            {
              paddingLeft: 20 + insets.left,
              paddingRight: 20 + insets.right,
              paddingBottom: 20 + insets.bottom,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  body: {
    padding: 20,
  },
});
