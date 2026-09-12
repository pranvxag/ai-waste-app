import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";
import PrimaryButton from "../components/PrimaryButton";
import StepItem from "../components/StepItem";
import { useScanHistory } from "../context/ScanHistoryContext";

export default function HomeScreen({ navigation }) {
  const { totalScans } = useScanHistory();

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

        <PrimaryButton
          label="Scan an item"
          icon={<MaterialCommunityIcons name="camera" size={20} color={colors.white} />}
          onPress={() => navigation.navigate("Scan")}
        />

        {totalScans > 0 && (
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalScans}</Text>
            <Text style={type.label}>
              {totalScans === 1 ? "item identified so far" : "items identified so far"}
            </Text>
          </View>
        )}

        <View style={styles.howItWorks}>
          <Text style={[type.h2, { marginBottom: spacing.md }]}>How it works</Text>
          <StepItem
            number="1"
            title="Snap a photo"
            description="Point your camera at the item you want to throw away."
          />
          <StepItem
            number="2"
            title="Get identified"
            description="The app recognizes the material and shows the right disposal category."
          />
          <StepItem
            number="3"
            title="Reuse or recycle"
            description="See specific reuse ideas for that item, or exactly how to dispose of it."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  statNumber: {
    ...type.h1,
    fontSize: 28,
  },
  howItWorks: {
    marginTop: spacing.sm,
  },
});
