import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, type, spacing } from "../theme/theme";

export default function StepItem({ number, title, description }) {
  return (
    <View style={styles.row}>
      <View style={styles.numberCircle}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={type.h3}>{title}</Text>
        <Text style={type.body}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  numberText: {
    ...type.bodyStrong,
    color: colors.white,
    fontSize: 14,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
});
