import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/context/LanguageContext";

SplashScreen.preventAutoHideAsync();

const EC2_API_URL = "https://13-63-86-170.sslip.io";
const isWeb = Platform.OS === "web";
const webApiUrl = process.env.EXPO_PUBLIC_API_URL_WEB;
const nativeApiUrl = process.env.EXPO_PUBLIC_API_URL || EC2_API_URL;
const apiUrl = isWeb ? (webApiUrl || nativeApiUrl) : nativeApiUrl;
setBaseUrl(apiUrl ?? EC2_API_URL);
setAuthTokenGetter(async () => {
  return AsyncStorage.getItem("fluid_token");
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 30 },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="fare-negotiation" />
      <Stack.Screen name="ride-tracking" />
      <Stack.Screen name="trip-summary" />
      <Stack.Screen name="verify-id" />
      <Stack.Screen name="payment-methods" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="call" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(
    isWeb
      ? {}
      : {
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        }
  );

  useEffect(() => {
    if (isWeb || fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!isWeb && !fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <LanguageProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </LanguageProvider>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
