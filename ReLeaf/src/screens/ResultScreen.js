import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import CloseButton from "../components/CloseButton";
import MaterialIdCard from "../components/MaterialIdCard";
import { getBucketMeta, formatClassName } from "../utils/formatting";
import { useScanHistory } from "../context/ScanHistoryContext";
import { getEnhancedIdeas } from "../api/predict";

export default function ResultScreen({ route, navigation }) {
  const { imageUri, result, fromHistory, isExample, exampleIcon } = route.params;
  const bucketMeta = getBucketMeta(result.predicted_class);
  const className = formatClassName(result.predicted_class);
  const { addScan } = useScanHistory();

  // "Reuse ideas" - the app's only source of reuse ideas is the AI, so this
  // is fetched once, automatically, for every result. null = still loading;
  // [] = loaded but empty (AI/YouTube down, or a genuinely empty response -
  // both get the same clean empty state, never a hard error).
  // For a past scan reopened from history, restore what was actually shown
  // at scan time instead of burning another AI call and possibly showing
  // different content than the user originally saw.
  const [reuseIdeas, setReuseIdeas] = useState(fromHistory ? result.aiIdeas || [] : null);

  // "More ideas" - additional AI-generated ideas, appended each time the
  // button below is pressed. Always starts empty, even for a reopened past
  // scan - only the initial "Reuse ideas" batch is persisted to history.
  const [moreIdeas, setMoreIdeas] = useState([]);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  // Fetch the initial "Reuse ideas" batch on mount (skipped when restored
  // from history above). ScanScreen navigates here with `replace`, so a
  // fresh Result screen is mounted for every new scan - this and the
  // addScan() call below each run exactly once per real scan.
  useEffect(() => {
    if (fromHistory) return;
    let cancelled = false;

    async function loadInitialIdeas() {
      let ideas = [];
      try {
        ideas = await getEnhancedIdeas(result.predicted_class, result.category);
      } catch {
        ideas = []; // clean empty state below, never a crash
      }
      if (cancelled) return;
      setReuseIdeas(ideas);

      // Record the scan once its reuse ideas are known, so history shows
      // what was actually generated - not for example objects, which were
      // never really scanned and shouldn't show up in "Recently scanned".
      if (!isExample) {
        addScan({
          imageUri,
          predictedClass: result.predicted_class,
          confidence: result.confidence,
          bucketMeta,
          category: result.category,
          disposal: result.disposal,
          aiIdeas: ideas,
        });
      }
    }

    loadInitialIdeas();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMoreIdeas() {
    setMoreLoading(true);
    setMoreFailed(false);
    try {
      const alreadyShown = [...(reuseIdeas || []), ...moreIdeas].map((item) => item.idea);
      const fresh = await getEnhancedIdeas(result.predicted_class, result.category, alreadyShown);

      // Safety-net dedup on top of the backend's own exclude handling.
      const shownLower = new Set(alreadyShown.map((idea) => idea.trim().toLowerCase()));
      const deduped = fresh.filter((item) => !shownLower.has(item.idea.trim().toLowerCase()));

      if (deduped.length === 0) {
        setMoreFailed(true);
      } else {
        setMoreIdeas((prev) => [...prev, ...deduped]);
      }
    } catch {
      setMoreFailed(true);
    } finally {
      setMoreLoading(false);
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
          isExample={isExample}
          exampleIcon={exampleIcon}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.ink} />
            <Text style={type.h3}>How to dispose of it</Text>
          </View>
          <Text style={type.body}>{result.disposal}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="recycle" size={18} color={colors.ink} />
            <Text style={type.h3}>Reuse ideas</Text>
          </View>
          {reuseIdeas === null ? (
            <ActivityIndicator color={colors.ink} />
          ) : reuseIdeas.length === 0 ? (
            <Text style={[type.caption, styles.noIdeasText]}>
              Couldn't generate reuse ideas right now.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {reuseIdeas.map((item, i) => (
                <AiIdeaCard key={i} item={item} />
              ))}
            </ScrollView>
          )}
        </View>

        {reuseIdeas !== null && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="creation" size={18} color={colors.ink} />
              <Text style={type.h3}>More ideas</Text>
            </View>

            {moreIdeas.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {moreIdeas.map((item, i) => (
                  <AiIdeaCard key={i} item={item} />
                ))}
              </ScrollView>
            )}

            {moreLoading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <SecondaryButton
                label={moreIdeas.length > 0 ? "Get even more ideas" : "More ideas"}
                onPress={handleMoreIdeas}
                icon={<MaterialCommunityIcons name="creation" size={18} color={colors.ink} />}
              />
            )}
            {moreFailed && (
              <Text style={[type.caption, styles.noIdeasText]}>
                Couldn't get more ideas right now - try again.
              </Text>
            )}
          </View>
        )}

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
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const video = item.video;
  const showThumbnail = video?.thumbnail_url && !thumbnailFailed;

  return (
    <View style={styles.aiCard}>
      <View style={styles.aiBadge}>
        <MaterialCommunityIcons name="creation" size={12} color={colors.white} />
        <Text style={styles.aiBadgeText}>AI suggested</Text>
      </View>
      <Text style={[type.body, { marginTop: spacing.xs }]}>{item.idea}</Text>

      {video && (
        <Pressable onPress={() => Linking.openURL(video.url)} style={styles.videoCard}>
          {showThumbnail && (
            <View style={styles.videoThumbnailWrap}>
              <Image
                source={{ uri: video.thumbnail_url }}
                style={styles.videoThumbnail}
                onError={() => setThumbnailFailed(true)}
              />
              <View style={styles.playOverlay}>
                <View style={styles.playButtonCircle}>
                  <MaterialCommunityIcons name="play" size={18} color={colors.white} />
                </View>
              </View>
            </View>
          )}
          <View style={styles.videoInfo}>
            <MaterialCommunityIcons name="youtube" size={16} color={colors.recyclable} />
            <View style={styles.videoTextCol}>
              <Text style={[type.label, styles.videoTitle]} numberOfLines={2}>
                {video.title}
              </Text>
              <Text style={type.caption}>YouTube</Text>
            </View>
          </View>
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
    width: 240,
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
  videoCard: {
    marginTop: spacing.sm,
  },
  videoThumbnailWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  playButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
  },
  videoTextCol: {
    flex: 1,
  },
  videoTitle: {
    color: colors.ink,
  },
});
