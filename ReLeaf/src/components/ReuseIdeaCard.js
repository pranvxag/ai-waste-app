import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";

export default function ReuseIdeaCard({ idea, index, accentColor }) {
  return (
    <View style={styles.card}>
      <MaterialCommunityIcons
        name="lightbulb-on-outline"
        size={20}
        color={accentColor}
        style={{ marginBottom: spacing.xs }}
      />
      <Text style={type.body}>{idea}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginRight: spacing.sm,
  },
});
