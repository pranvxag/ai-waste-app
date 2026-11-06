import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIdTokenAuthRequest } from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../context/AuthContext";
import { colors, type, spacing, radii } from "../theme/theme";
import PrimaryButton from "../components/PrimaryButton";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { configured, signInWithGoogleToken, signInWithEmail, registerWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const [request, response, promptAsync] = useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  const [signingIn, setSigningIn] = useState(false);

  async function handleEmailAuth() {
    if (!email.trim() || password.length < 6) {
      Alert.alert("Check your details", "Enter an email and a password of at least 6 characters.");
      return;
    }
    setSigningIn(true);
    try {
      if (registering) await registerWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (error) {
      Alert.alert("Couldn't sign in", error.message || "Check your email and password.");
    } finally {
      setSigningIn(false);
    }
  }

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params?.id_token;
    if (!idToken) {
      Alert.alert("Google sign-in failed", "Google did not return an ID token. Check your OAuth client configuration.");
      return;
    }

    setSigningIn(true);
    signInWithGoogleToken(idToken)
      .catch(() => Alert.alert("Couldn't sign in", "Check your internet connection and Google OAuth configuration."))
      .finally(() => setSigningIn(false));
  }, [response, signInWithGoogleToken]);

  if (!configured) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <MaterialCommunityIcons name="firebase" size={56} color={colors.accent} />
          <Text style={type.h1}>Firebase setup needed</Text>
          <Text style={[type.body, styles.description]}>
            Add the Firebase and Google OAuth values from the setup guide to ReLeaf/.env, then restart Expo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="leaf" size={56} color={colors.accent} />
        <Text style={type.h1}>Welcome to ReLeaf</Text>
        <Text style={[type.body, styles.description]}>
          Sign in to keep your scan history connected to your account.
        </Text>
        <PrimaryButton
          label="Continue with Google"
          loading={signingIn}
          disabled={!request}
          onPress={() => promptAsync()}
          icon={<MaterialCommunityIcons name="google" size={20} color={colors.white} />}
        />
        <Text style={styles.or}>or use email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.inkSoft}
          secureTextEntry
          style={styles.input}
        />
        <PrimaryButton
          label={registering ? "Create account" : "Sign in with email"}
          loading={signingIn}
          onPress={handleEmailAuth}
        />
        <Pressable onPress={() => setRegistering((value) => !value)}>
          <Text style={styles.switchAuth}>
            {registering ? "Already have an account? Sign in" : "New here? Create an account"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  description: { textAlign: "center", maxWidth: 340 },
  or: { ...type.caption, marginVertical: spacing.xs },
  input: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    color: colors.ink,
  },
  switchAuth: { ...type.label, color: colors.accent },
});
