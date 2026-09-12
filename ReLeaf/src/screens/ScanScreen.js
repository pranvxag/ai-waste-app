import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type, spacing, radii } from "../theme/theme";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import CloseButton from "../components/CloseButton";
import { identifyItem } from "../api/predict";

export default function ScanScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Enable camera access in settings to scan an item.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Enable photo library access in settings to choose an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function handleIdentify() {
    setLoading(true);
    try {
      const result = await identifyItem(imageUri);
      navigation.replace("Result", { imageUri, result });
    } catch (err) {
      Alert.alert(
        "Couldn't identify that item",
        err.message || "Check that the backend server is running and reachable."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <CloseButton onPress={() => navigation.popToTop()} />
      <View style={styles.content}>
        <Text style={type.h2}>Scan an item</Text>
        <Text style={[type.body, { marginBottom: spacing.md }]}>
          Center the item in frame, good lighting helps accuracy.
        </Text>

        <View style={styles.frame}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <>
              <Corner style={styles.cornerTL} />
              <Corner style={styles.cornerTR} />
              <Corner style={styles.cornerBL} />
              <Corner style={styles.cornerBR} />
              <MaterialCommunityIcons name="image-search-outline" size={40} color={colors.inkSoft} />
              <Text style={[type.caption, { marginTop: spacing.xs }]}>No photo yet</Text>
            </>
          )}
        </View>

        <View style={styles.actions}>
          {imageUri ? (
            <>
              <PrimaryButton
                label="Identify this item"
                loading={loading}
                onPress={handleIdentify}
                icon={<MaterialCommunityIcons name="magnify" size={20} color={colors.white} />}
              />
              <SecondaryButton
                label="Retake"
                onPress={() => setImageUri(null)}
                icon={<MaterialCommunityIcons name="camera-retake-outline" size={18} color={colors.ink} />}
              />
            </>
          ) : (
            <>
              <PrimaryButton
                label="Take photo"
                onPress={takePhoto}
                icon={<MaterialCommunityIcons name="camera" size={20} color={colors.white} />}
              />
              <SecondaryButton
                label="Choose from gallery"
                onPress={pickFromGallery}
                icon={<MaterialCommunityIcons name="image-multiple-outline" size={18} color={colors.ink} />}
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Corner({ style }) {
  return <View style={[styles.corner, style]} />;
}

const CORNER_SIZE = 28;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  frame: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.ink,
  },
  cornerTL: { top: spacing.md, left: spacing.md, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: spacing.md, right: spacing.md, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: spacing.md, left: spacing.md, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: spacing.md, right: spacing.md, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  actions: {
    gap: spacing.sm,
  },
});
