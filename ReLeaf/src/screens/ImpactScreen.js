import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, type, spacing, radii } from "../theme/theme";
import { useScanHistory } from "../context/ScanHistoryContext";
import { BUCKET_META } from "../utils/formatting";

export default function ImpactScreen() {
  const { totalScans, countsByBucket } = useScanHistory();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[type.h2, { marginBottom: 0 }]}>Your impact</Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalNumber}>{totalScans}</Text>
          <Text style={type.label}>
            {totalScans === 1 ? "item identified so far" : "items identified so far"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[type.h3, styles.sectionTitle]}>Breakdown by category</Text>
          {Object.entries(BUCKET_META).map(([bucket, meta]) => (
            <BucketRow
              key={bucket}
              label={meta.label}
              color={meta.color}
              count={countsByBucket[bucket] || 0}
              totalScans={totalScans}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BucketRow({ label, color, count, totalScans }) {
  const pct = totalScans > 0 ? Math.round((count / totalScans) * 100) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.rowLabel}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={type.bodyStrong}>{label}</Text>
        </View>
        <Text style={type.label}>{count}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  totalNumber: {
    fontFamily: type.h1.fontFamily,
    fontSize: 48,
    lineHeight: 54,
    color: colors.ink,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  row: {
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
  },
  barTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
});
