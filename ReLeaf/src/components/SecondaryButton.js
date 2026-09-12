import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, type, spacing, radii } from "../theme/theme";

export default function SecondaryButton({ label, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {icon}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.ink,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  pressed: {
    backgroundColor: colors.border,
  },
  label: {
    ...type.bodyStrong,
    color: colors.ink,
    fontSize: 16,
  },
});
