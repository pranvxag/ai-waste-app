import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, type, spacing, radii } from "../theme/theme";
import PrimaryButton from "../components/PrimaryButton";
import { getApiBaseUrl, setApiBaseUrl } from "../api/config";

export default function SettingsScreen() {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getApiBaseUrl().then(setUrl);
  }, []);

  async function handleSave() {
    if (!url.trim()) {
      Alert.alert("Enter a URL", "The backend URL can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await setApiBaseUrl(url);
      Alert.alert("Saved", "The app will use this backend URL from now on.");
    } catch {
      Alert.alert("Couldn't save", "Something went wrong saving the URL. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={type.h2}>Settings</Text>

        <View style={styles.section}>
          <Text style={type.h3}>Backend URL</Text>
          <Text style={[type.body, styles.hint]}>
            Where the app looks for the FastAPI server (e.g. your laptop's local IP
            or an ngrok URL). Change this if scans stop working after switching networks.
          </Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.5:8000"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <PrimaryButton label="Save" onPress={handleSave} loading={saving} />
        </View>

        <View style={styles.section}>
          <Text style={type.h3}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={type.bodyStrong}>ReLeaf</Text>
            <Text style={[type.body, { marginTop: 2 }]}>
              Photographs a waste item, identifies what it's made of, and shows you
              how to dispose of or reuse it.
            </Text>
          </View>
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
  section: {
    gap: spacing.sm,
  },
  hint: {
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    ...type.body,
    color: colors.ink,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
