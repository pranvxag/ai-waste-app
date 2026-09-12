import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import CloseButton from "../components/CloseButton";
import MaterialIdCard from "../components/MaterialIdCard";
import ReuseIdeaCard from "../components/ReuseIdeaCard";
import { getBucketMeta, formatClassName } from "../utils/formatting";
import { useScanHistory } from "../context/ScanHistoryContext";
import { getEnhancedIdeas } from "../api/predict";

export default function ResultScreen({ route, navigation }) {
  const { imageUri, result, fromHistory } = route.params;
  const bucketMeta = getBucketMeta(result.predicted_class);
  const className = formatClassName(result.predicted_class);
  const { addScan } = useScanHistory();

  // AI-enhanced ideas: null = not requested yet, [] = requested but nothing
  // came back (empty result or the call failed - both render the same way).
  const [aiIdeas, setAiIdeas] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ScanScreen navigates here with `replace`, so a fresh Result screen is
  // mounted for every new result - record it once, on mount. Skip this when
  // we're just re-opening a past scan from history (e.g. HomeScreen's
  // "Recently scanned" list), or every re-view would duplicate the entry.
  useEffect(() => {
    if (fromHistory) return;
    addScan({
      imageUri,
      predictedClass: result.predicted_class,
      confidence: result.confidence,
      bucketMeta,
      disposal: result.disposal,
      reuseIdeas: result.reuse_ideas,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGetMoreIdeas() {
    setAiLoading(true);
    try {
      const ideas = await getEnhancedIdeas(result.predicted_class, result.category);
      setAiIdeas(ideas);
    } catch {
      setAiIdeas([]); // treated the same as "no extra ideas" - never show a hard error here
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <CloseButton onPress={() => navigation.popToTop()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <MaterialIdCard
          imageUri={imageUri}
          className={className}
          confidence={result.confidence}
          bucketMeta={bucketMeta}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.ink} />
            <Text style={type.h3}>How to dispose of it</Text>
          </View>
          <Text style={type.body}>{result.disposal}</Text>
        </View>

        {result.reuse_ideas?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="recycle" size={18} color={colors.ink} />
              <Text style={type.h3}>Reuse ideas</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {result.reuse_ideas.map((idea, i) => (
                <ReuseIdeaCard key={i} idea={idea} index={i} accentColor={bucketMeta.color} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          {aiIdeas === null ? (
            aiLoading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <SecondaryButton
                label="Get more ideas"
                onPress={handleGetMoreIdeas}
                icon={<MaterialCommunityIcons name="creation" size={18} color={colors.ink} />}
              />
            )
          ) : aiIdeas.length === 0 ? (
            <Text style={[type.caption, styles.noIdeasText]}>No extra ideas right now</Text>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="creation" size={18} color={colors.ink} />
                <Text style={type.h3}>More ideas</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {aiIdeas.map((item, i) => (
                  <AiIdeaCard key={i} item={item} />
                ))}
              </ScrollView>
            </>
          )}
        </View>

        <PrimaryButton
          label="Scan another item"
          onPress={() => navigation.navigate("Scan")}
          icon={<MaterialCommunityIcons name="camera" size={20} color={colors.white} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function AiIdeaCard({ item }) {
  return (
    <View style={styles.aiCard}>
      <View style={styles.aiBadge}>
        <MaterialCommunityIcons name="creation" size={12} color={colors.white} />
        <Text style={styles.aiBadgeText}>AI suggested</Text>
      </View>
      <Text style={[type.body, { marginTop: spacing.xs }]}>{item.idea}</Text>
      {item.video && (
        <Pressable onPress={() => Linking.openURL(item.video.url)} style={styles.videoLink}>
          <MaterialCommunityIcons name="youtube" size={16} color={colors.recyclable} />
          <Text style={[type.label, styles.videoLinkText]} numberOfLines={1}>
            {item.video.title}
          </Text>
        </Pressable>
      )}
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
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  noIdeasText: {
    textAlign: "center",
  },
  aiCard: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    marginRight: spacing.sm,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  aiBadgeText: {
    ...type.caption,
    color: colors.white,
    fontFamily: "Inter_500Medium",
  },
  videoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  videoLinkText: {
    flex: 1,
    color: colors.recyclable,
  },
});
