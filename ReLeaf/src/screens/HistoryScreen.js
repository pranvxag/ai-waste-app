import React from "react";
import { View, Text, StyleSheet, FlatList, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";
import { useScanHistory } from "../context/ScanHistoryContext";
import { getBucketMeta, formatClassName, formatRelativeTime } from "../utils/formatting";

export default function HistoryScreen({ navigation }) {
  const { scans } = useScanHistory();

  function openPastScan(scan) {
    navigation.navigate("Result", {
      imageUri: scan.imageUri,
      result: {
        predicted_class: scan.predictedClass,
        confidence: scan.confidence,
        category: scan.category,
        disposal: scan.disposal,
        aiIdeas: scan.aiIdeas,
      },
      fromHistory: true,
    });
  }

  if (scans.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="image-search-outline" size={40} color={colors.inkSoft} />
          <Text style={[type.h3, { marginTop: spacing.sm }]}>No scans yet</Text>
          <Text style={[type.body, styles.emptyBody]}>
            Scan your first item to see it show up here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <FlatList
        data={scans}
        keyExtractor={(scan) => scan.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={[type.h1, styles.title]}>History</Text>}
        renderItem={({ item }) => <HistoryRow scan={item} onPress={() => openPastScan(item)} />}
      />
    </SafeAreaView>
  );
}

function HistoryRow({ scan, onPress }) {
  const bucketMeta = getBucketMeta(scan.predictedClass);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Image source={{ uri: scan.imageUri }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={type.bodyStrong}>{formatClassName(scan.predictedClass)}</Text>
        <Text style={type.caption}>{formatRelativeTime(scan.timestamp)}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: bucketMeta.color }]}>
        <MaterialCommunityIcons name={bucketMeta.icon} size={14} color={colors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.border,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyBody: {
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
