import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useApp } from "@/context/AppContext";

export default function Index() {
  const { user, token, onboarded, authReady } = useApp();

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!user || !token) return <Redirect href="/auth" />;
  return <Redirect href="/(tabs)/home" />;
}
