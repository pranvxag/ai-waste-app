import React from "react";
import { View, ActivityIndicator, StatusBar, Pressable, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppFonts } from "./src/theme/useAppFonts";
import { colors } from "./src/theme/theme";
import { ScanHistoryProvider } from "./src/context/ScanHistoryContext";

import HomeScreen from "./src/screens/HomeScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ImpactScreen from "./src/screens/ImpactScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ScanScreen from "./src/screens/ScanScreen";
import ResultScreen from "./src/screens/ResultScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: "home-outline",
  History: "history",
  Impact: "leaf",
  Settings: "cog-outline",
};

// The middle tab never renders a screen of its own - tabPress is intercepted
// (see listeners below) to jump straight to the Scan stack screen instead.
// React Navigation still needs a component registered for the route, though
// it's never actually shown.
function ScanTabPlaceholder() {
  return null;
}

// Floating circular action button standing in for the middle tab's normal
// icon/label. Receives onPress/style from the tab bar like any tabBarButton.
function ScanTabButton({ onPress, style }) {
  return (
    <View style={[style, styles.scanButtonWrapper]}>
      <Pressable onPress={onPress} style={styles.scanButton}>
        <MaterialCommunityIcons name="camera" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

function MainTabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={TAB_ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen
        name="ScanTab"
        component={ScanTabPlaceholder}
        options={{
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Scan");
          },
        }}
      />
      <Tab.Screen name="Impact" component={ImpactScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.ink} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ScanHistoryProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ScanHistoryProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  scanButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -20, // float above the rest of the tab bar
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    // Same shadow style as MaterialIdCard.js, for a consistent elevated look.
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
