import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";
import PrimaryButton from "../components/PrimaryButton";
import MaterialIdCard from "../components/MaterialIdCard";
import ReuseIdeaCard from "../components/ReuseIdeaCard";
import { getBucketMeta, formatClassName } from "../utils/formatting";

export default function ResultScreen({ route, navigation }) {
  const { imageUri, result } = route.params;
  const bucketMeta = getBucketMeta(result.predicted_class);
  const className = formatClassName(result.predicted_class);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
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

        <PrimaryButton
          label="Scan another item"
          onPress={() => navigation.navigate("Scan")}
          icon={<MaterialCommunityIcons name="camera" size={20} color={colors.white} />}
        />
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
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
});
