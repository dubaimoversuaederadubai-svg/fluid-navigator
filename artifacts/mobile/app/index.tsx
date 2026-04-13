import { Redirect } from "expo-router";
import { useApp } from "@/context/AppContext";

export default function Index() {
  const { user, token, onboarded } = useApp();
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!user || !token) return <Redirect href="/auth" />;
  return <Redirect href="/(tabs)/home" />;
}
