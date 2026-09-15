import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";
import { useScanHistory } from "../context/ScanHistoryContext";
import { formatClassName } from "../utils/formatting";
import { getWasteInfo } from "../api/predict";
import { EXAMPLE_OBJECTS, COMPACT_COUNT } from "../utils/exampleObjects";

const ECO_FACTS = [
  "Recycling one aluminum can saves enough energy to power a TV for about three hours.",
  "It can take up to 1,000 years for a plastic bottle to fully decompose in a landfill.",
  "Composting food scraps can cut what a household sends to landfill by up to 30%.",
  "Glass can be recycled endlessly without ever losing its quality or purity.",
];

export default function HomeScreen({ navigation }) {
  const { scans, totalScans } = useScanHistory();
  const [fact, setFact] = useState(ECO_FACTS[0]);
  const [loadingExample, setLoadingExample] = useState(null); // predictedClass currently loading, or null
  const [showAllExamples, setShowAllExamples] = useState(false);

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
        category: scan.category,
        disposal: scan.disposal,
        aiIdeas: scan.aiIdeas,
      },
      fromHistory: true,
    });
  }

  // Clicking an example object goes through the exact same Result screen and
  // the exact same backend data (get_waste_info(), via /waste-info) that a
  // real scan of that material would produce - just without a photo or a
  // confidence score, since nothing was actually classified. See
  // ResultScreen's isExample handling and MaterialIdCard for the display side.
  async function handleExampleTap(example) {
    setLoadingExample(example.predictedClass);
    try {
      const info = await getWasteInfo(example.predictedClass);
      setShowAllExamples(false);
      navigation.navigate("Result", {
        imageUri: null,
        result: {
          predicted_class: info.predicted_class,
          confidence: null,
          category: info.category,
          disposal: info.disposal,
        },
        isExample: true,
        exampleIcon: example.icon,
      });
    } catch (err) {
      Alert.alert(
        "Couldn't load this example",
        err.message || "Check that the backend server is running and reachable."
      );
    } finally {
      setLoadingExample(null);
    }
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
          <View style={styles.sectionHeaderRow}>
            <Text style={[type.h2, styles.sectionTitle]}>Try scanning these</Text>
            <Pressable onPress={() => setShowAllExamples(true)} hitSlop={8} style={styles.viewMoreLink}>
              <Text style={[type.label, styles.viewMoreText]}>View more</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={colors.accent} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EXAMPLE_OBJECTS.slice(0, COMPACT_COUNT).map((example) => (
              <ExampleCard
                key={example.label}
                example={example}
                loading={loadingExample === example.predictedClass}
                onPress={() => handleExampleTap(example)}
              />
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

      <Modal
        visible={showAllExamples}
        animationType="slide"
        onRequestClose={() => setShowAllExamples(false)}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={type.h2}>All examples</Text>
            <Pressable onPress={() => setShowAllExamples(false)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>
          <Text style={[type.body, styles.modalSubtitle]}>
            Tap any object to see the disposal and reuse guidance a real scan would give you.
          </Text>
          <ScrollView contentContainerStyle={styles.modalGrid}>
            {EXAMPLE_OBJECTS.map((example) => (
              <ExampleCard
                key={example.label}
                example={example}
                loading={loadingExample === example.predictedClass}
                onPress={() => handleExampleTap(example)}
                style={styles.modalCard}
              />
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ExampleCard({ example, loading, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed, hovered }) => [
        styles.exampleCard,
        style,
        (pressed || hovered) && styles.exampleCardActive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <MaterialCommunityIcons name={example.icon} size={28} color={colors.ink} />
      )}
      <Text style={[type.label, { marginTop: spacing.xs, textAlign: "center" }]}>
        {example.label}
      </Text>
    </Pressable>
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewMoreLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewMoreText: {
    color: colors.accent,
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
    cursor: "pointer",
  },
  exampleCardActive: {
    backgroundColor: colors.border,
    borderColor: colors.accent,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  modalSubtitle: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  modalGrid: {
    padding: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  modalCard: {
    width: "31%",
    marginRight: 0,
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
