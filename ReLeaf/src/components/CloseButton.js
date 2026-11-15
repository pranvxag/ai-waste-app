import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../theme/theme";

// Small circular "X" button, absolutely positioned over whatever content sits
// behind it (a photo preview, etc.) - used on screens reached mid-flow
// (Scan, Result) to jump straight back to the tabs instead of stepping
// backward through the flow.
export default function CloseButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name="close" size={26} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.md,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    // Same shadow style as MaterialIdCard.js, so it stays visible over any photo.
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
