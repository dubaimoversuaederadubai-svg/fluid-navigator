import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useGetRideHistory, useLogout } from "@workspace/api-client-react";

const MENU = [
  { icon: "wallet-outline" as const, label: "ادائیگی کا طریقہ", sub: "JazzCash، EasyPaisa، نقد" },
  { icon: "settings-outline" as const, label: "ترتیبات", sub: "پرائیویسی، نوٹیفکیشن، سیفٹی" },
  { icon: "help-circle-outline" as const, label: "مدد مرکز", sub: "24/7 سپورٹ اور وسائل" },
  { icon: "shield-checkmark-outline" as const, label: "حفاظتی مرکز", sub: "ہنگامی رابطے، حفاظتی اوزار" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, logout } = useApp();
  const logoutMutation = useLogout();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: historyData } = useGetRideHistory();
  const trips = historyData?.trips ?? [];
  const totalEarnings = trips.reduce((s, t) => s + t.fare, 0);

  const handleLogout = () => {
    Alert.alert("لاگ آؤٹ", "کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟", [
      { text: "نہیں", style: "cancel" },
      {
        text: "ہاں",
        style: "destructive",
        onPress: async () => {
          try { await logoutMutation.mutateAsync(); } catch {}
          await logout();
          router.replace("/auth");
        },
      },
    ]);
  };

  const formattedPhone = user?.phone
    ? "+" + user.phone.slice(0, 2) + " " + user.phone.slice(2, 5) + " " + user.phone.slice(5, 8) + " " + user.phone.slice(8)
    : "";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 90 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: topPad + 16, paddingHorizontal: 20 }}>
        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          <LinearGradient
            colors={["#10B981" + "20", "#2170E4" + "10"]}
            style={styles.heroBg}
          />
          <View style={styles.heroContent}>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{user?.name ?? "صارف"}</Text>
              <Text style={[styles.phone, { color: colors.mutedForeground }]}>{formattedPhone}</Text>
              <View style={styles.tags}>
                <View style={[styles.tag, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>تصدیق شدہ ✓</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                    {user?.role === "driver" ? "ڈرائیور" : "مسافر"}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.avatarWrap}>
              <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) ?? "ص"}</Text>
              </LinearGradient>
              <View style={[styles.ratingBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="star" size={9} color="#fff" />
                <Text style={styles.ratingText}>{user?.rating?.toFixed(1) ?? "5.0"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>سواریاں</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{user?.totalRides ?? trips.length}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>ریٹنگ</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{user?.rating?.toFixed(1) ?? "5.0"}</Text>
          </View>
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statCard}
          >
            <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.7)" }]}>کمائی</Text>
            <Text style={[styles.statValue, { color: "#fff" }]}>Rs {totalEarnings.toFixed(0)}</Text>
          </LinearGradient>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>اکاؤنٹ</Text>

        <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
          {MENU.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={colors.border} />
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                </View>
                <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceContainerLow }]}>
                  <Ionicons name={item.icon} size={20} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
              {i < MENU.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>لاگ آؤٹ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  heroBg: { position: "absolute", top: -50, left: -50, width: 160, height: 160, borderRadius: 80 },
  heroContent: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  avatarWrap: { position: "relative" },
  avatar: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, color: "#fff", fontFamily: "Inter_700Bold" },
  ratingBadge: { position: "absolute", bottom: -4, left: -4, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 2 },
  phone: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4 },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10, paddingHorizontal: 4, textAlign: "right" },
  menuCard: { borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: 16 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1, marginRight: 74 },
  logoutBtn: { paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  logoutText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
