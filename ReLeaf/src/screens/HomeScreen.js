import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";
import { useScanHistory } from "../context/ScanHistoryContext";
import { formatClassName } from "../utils/formatting";

const EXAMPLES = [
  { label: "Glass bottle", icon: "bottle-wine" },
  { label: "Battery", icon: "battery-outline" },
  { label: "Cardboard box", icon: "package-variant-closed" },
  { label: "Old shoes", icon: "shoe-sneaker" },
];

const ECO_FACTS = [
  "Recycling one aluminum can saves enough energy to power a TV for about three hours.",
  "It can take up to 1,000 years for a plastic bottle to fully decompose in a landfill.",
  "Composting food scraps can cut what a household sends to landfill by up to 30%.",
  "Glass can be recycled endlessly without ever losing its quality or purity.",
];

export default function HomeScreen({ navigation }) {
  const { scans, totalScans } = useScanHistory();
  const [fact, setFact] = useState(ECO_FACTS[0]);

  // Pick a new random fact every time the Home tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      setFact(ECO_FACTS[Math.floor(Math.random() * ECO_FACTS.length)]);
    }, [])
  );

  function openPastScan(scan) {
    navigation.navigate("Result", {
      imageUri: scan.imageUri,
      result: {
        predicted_class: scan.predictedClass,
        confidence: scan.confidence,
        disposal: scan.disposal,
        reuse_ideas: scan.reuseIdeas,
      },
      fromHistory: true,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons name="recycle-variant" size={28} color={colors.ink} />
            <Text style={styles.wordmark}>ReLeaf</Text>
          </View>
          <Text style={styles.headline}>Know what it is.{"\n"}Know what to do with it.</Text>
          <Text style={type.body}>
            Photograph any household item to identify what it's made of, how to
            dispose of it correctly, and how to reuse it before it becomes waste.
          </Text>
        </View>

        {scans.length > 0 && (
          <View style={styles.section}>
            <Text style={[type.h2, styles.sectionTitle]}>Recently scanned</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {scans.slice(0, 5).map((scan) => (
                <RecentScanThumb key={scan.id} scan={scan} onPress={() => openPastScan(scan)} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[type.h2, styles.sectionTitle]}>Try scanning these</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EXAMPLES.map((example) => (
              <View key={example.label} style={styles.exampleCard}>
                <MaterialCommunityIcons name={example.icon} size={28} color={colors.ink} />
                <Text style={[type.label, { marginTop: spacing.xs, textAlign: "center" }]}>
                  {example.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[type.h2, styles.sectionTitle]}>Did you know?</Text>
          <View style={styles.factCard}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.accent} />
            <Text style={[type.body, { marginTop: spacing.xs }]}>{fact}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.impactCard, pressed && styles.impactCardPressed]}
          onPress={() => navigation.navigate("Impact")}
        >
          <View style={styles.impactIconWrap}>
            <MaterialCommunityIcons name="leaf" size={22} color={colors.white} />
          </View>
          <View style={styles.impactText}>
            <Text style={type.h3}>Your impact</Text>
            <Text style={type.body}>
              {totalScans > 0
                ? `You've identified ${totalScans} ${totalScans === 1 ? "item" : "items"} so far.`
                : "Scan your first item to start tracking your impact."}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.inkSoft} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function RecentScanThumb({ scan, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.thumbWrap}>
      <Image source={{ uri: scan.imageUri }} style={styles.thumbImage} />
      <Text style={type.caption} numberOfLines={1}>
        {formatClassName(scan.predictedClass)}
      </Text>
    </Pressable>
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
  hero: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.xs,
  },
  wordmark: {
    ...type.h3,
    fontSize: 20,
  },
  headline: {
    ...type.h1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  thumbWrap: {
    width: 76,
    marginRight: spacing.sm,
    gap: 4,
  },
  thumbImage: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  exampleCard: {
    width: 110,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginRight: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  factCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  impactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  impactCardPressed: {
    backgroundColor: colors.border,
  },
  impactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  impactText: {
    flex: 1,
    gap: 2,
  },
});
