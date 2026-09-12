import React, { useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";

export default function MaterialIdCard({ imageUri, className, confidence, bucketMeta }) {
  const slideAnim = useRef(new Animated.Value(24)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const confidencePct = Math.round(confidence * 100);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[styles.band, { backgroundColor: bucketMeta.color }]} />
      <View style={styles.content}>
        <Image source={{ uri: imageUri }} style={styles.thumbnail} />
        <View style={styles.info}>
          <View style={[styles.pill, { backgroundColor: bucketMeta.color }]}>
            <MaterialCommunityIcons name={bucketMeta.icon} size={14} color={colors.white} />
            <Text style={styles.pillText}>{bucketMeta.label}</Text>
          </View>
          <Text style={styles.className}>{className}</Text>
          <Text style={type.caption}>{confidencePct}% confident</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: spacing.md,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  band: {
    width: 8,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  info: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
  },
  pillText: {
    ...type.caption,
    color: colors.white,
    fontFamily: "Inter_500Medium",
  },
  className: {
    ...type.h3,
  },
});
