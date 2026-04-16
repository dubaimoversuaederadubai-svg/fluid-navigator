import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useGetRideHistory, useLogout, customFetch } from "@workspace/api-client-react";

const PAYMENT_LABELS_EN: Record<string, string> = {
  cash: "Cash",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  sadapay: "Sadapay",
  nayapay: "NayaPay",
};

const PAYMENT_LABELS_UR: Record<string, string> = {
  cash: "نقد رقم",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  sadapay: "Sadapay",
  nayapay: "NayaPay",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, logout, refreshUser } = useApp();
  const logoutMutation = useLogout();
  const { t, lang, setLang, isUrdu } = useLang();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: historyData } = useGetRideHistory();
  const trips = historyData?.trips ?? [];
  const totalValue = trips.reduce((s, tr) => s + tr.fare, 0);

  const isDriver = user?.role === "driver";
  const isVerified = user?.cnicVerified;

  const handleLogout = () => {
    Alert.alert(t("logout"), t("logoutConfirm"), [
      { text: t("no"), style: "cancel" },
      {
        text: t("yes"),
        style: "destructive",
        onPress: async () => {
          try { await logoutMutation.mutateAsync(); } catch {}
          await logout();
          router.replace("/");
        },
      },
    ]);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        isUrdu ? "اجازت درکار ہے" : "Permission Required",
        isUrdu ? "گیلری تک رسائی دیں" : "Please allow gallery access"
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      setUploadingPhoto(true);
      try {
        await customFetch("/api/users/me/photo", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: base64 }),
        });
        await refreshUser();
        Alert.alert(
          isUrdu ? "کامیاب" : "Success",
          isUrdu ? "تصویر اپلوڈ ہو گئی" : "Photo uploaded successfully"
        );
      } catch {
        Alert.alert(
          isUrdu ? "خرابی" : "Error",
          isUrdu ? "تصویر اپلوڈ نہیں ہو سکی" : "Could not upload photo"
        );
      }
      setUploadingPhoto(false);
    }
  };

  const handleSwitchRole = () => {
    const newRole = isDriver ? "rider" : "driver";
    const newRoleLabel = newRole === "driver"
      ? (isUrdu ? "ڈرائیور" : "Driver")
      : (isUrdu ? "مسافر" : "Rider");

    // If switching to driver, require CNIC verification
    if (newRole === "driver" && !isVerified) {
      Alert.alert(
        isUrdu ? "تصدیق ضروری ہے" : "Verification Required",
        isUrdu
          ? "ڈرائیور بننے کے لیے پہلے CNIC تصدیق کریں"
          : "You must verify your CNIC before becoming a driver",
        [
          { text: isUrdu ? "بعد میں" : "Later", style: "cancel" },
          {
            text: isUrdu ? "ابھی تصدیق کریں" : "Verify Now",
            onPress: () => router.push("/verify-id"),
          },
        ]
      );
      return;
    }

    Alert.alert(
      isUrdu ? "کردار تبدیل کریں" : "Switch Role",
      isUrdu
        ? `کیا آپ ${newRoleLabel} بننا چاہتے ہیں؟`
        : `Switch to ${newRoleLabel} mode?`,
      [
        { text: isUrdu ? "نہیں" : "No", style: "cancel" },
        {
          text: isUrdu ? "ہاں" : "Yes",
          onPress: async () => {
            setSwitchingRole(true);
            try {
              await customFetch("/api/users/me/role", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
              });
              await refreshUser();
              Alert.alert(
                isUrdu ? "کامیاب" : "Success",
                isUrdu
                  ? `آپ اب ${newRoleLabel} ہیں`
                  : `You are now a ${newRoleLabel}`
              );
            } catch (e: any) {
              Alert.alert(
                isUrdu ? "خرابی" : "Error",
                e?.message ?? (isUrdu ? "کردار تبدیل نہیں ہو سکا" : "Could not switch role")
              );
            } finally {
              setSwitchingRole(false);
            }
          },
        },
      ]
    );
  };

  const formattedPhone = user?.phone
    ? "+" + user.phone.slice(0, 2) + " " + user.phone.slice(2, 5) + " " + user.phone.slice(5, 8) + " " + user.phone.slice(8)
    : "";

  const payMethod = user?.paymentMethod ?? "cash";
  const payLabel = isUrdu
    ? (PAYMENT_LABELS_UR[payMethod] ?? payMethod)
    : (PAYMENT_LABELS_EN[payMethod] ?? payMethod);

  const MENU = [
    {
      icon: "shield-checkmark-outline" as const,
      label: isUrdu ? "شناخت تصدیق کریں" : "Verify Identity",
      sub: isVerified
        ? (isUrdu ? "NADRA تصدیق شدہ ✓" : "NADRA Verified ✓")
        : (isUrdu ? "CNIC / لائسنس تصدیق کریں" : "Verify CNIC / License"),
      badge: isVerified ? "verified" : "pending",
      onPress: () => router.push("/verify-id"),
    },
    {
      icon: "wallet-outline" as const,
      label: isUrdu ? "ادائیگی کا طریقہ" : "Payment Methods",
      sub: payLabel,
      badge: null,
      onPress: () => router.push("/payment-methods"),
    },
    {
      icon: "help-circle-outline" as const,
      label: isUrdu ? "مدد مرکز" : "Help Center",
      sub: isUrdu ? "24/7 سپورٹ اور وسائل" : "24/7 support & resources",
      badge: null,
      onPress: () => {},
    },
    {
      icon: "shield-outline" as const,
      label: isUrdu ? "حفاظتی مرکز" : "Safety Center",
      sub: isUrdu ? "ہنگامی رابطے، حفاظتی اوزار" : "Emergency contacts, safety tools",
      badge: null,
      onPress: () => {},
    },
  ];

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
            <View style={{ flex: 1, alignItems: isUrdu ? "flex-end" : "flex-start" }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{user?.name ?? "صارف"}</Text>
              <Text style={[styles.phone, { color: colors.mutedForeground }]}>{formattedPhone}</Text>
              <View style={[styles.tags, { flexDirection: isUrdu ? "row-reverse" : "row" }]}>
                <View style={[styles.tag, { backgroundColor: isVerified ? colors.primary + "15" : "#F59E0B" + "15" }]}>
                  <Text style={[styles.tagText, { color: isVerified ? colors.primary : "#F59E0B" }]}>
                    {isVerified
                      ? (isUrdu ? "NADRA ✓" : "NADRA ✓")
                      : (isUrdu ? "تصدیق کریں" : "Unverified")}
                  </Text>
                </View>
                <View style={[styles.tag, { backgroundColor: isDriver ? colors.primary + "15" : colors.surfaceContainerHigh }]}>
                  <Text style={[styles.tagText, { color: isDriver ? colors.primary : colors.mutedForeground }]}>
                    {isDriver ? (isUrdu ? "🚗 ڈرائیور" : "🚗 Driver") : (isUrdu ? "🧍 مسافر" : "🧍 Rider")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Profile Photo */}
            <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarWrap} activeOpacity={0.85}>
              {uploadingPhoto ? (
                <View style={[styles.avatar, { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceContainerHigh }]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : user?.profilePhoto ? (
                <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.name?.charAt(0) ?? "ص"}</Text>
                </LinearGradient>
              )}
              <View style={[styles.cameraBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
              <View style={[styles.ratingBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="star" size={9} color="#fff" />
                <Text style={styles.ratingText}>{user?.rating?.toFixed(1) ?? "5.0"}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {isUrdu ? "سواریاں" : "Rides"}
            </Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{user?.totalRides ?? trips.length}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {isUrdu ? "ریٹنگ" : "Rating"}
            </Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{user?.rating?.toFixed(1) ?? "5.0"}</Text>
          </View>
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statCard}
          >
            <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.7)" }]}>
              {isUrdu ? "کمائی" : "Total"}
            </Text>
            <Text style={[styles.statValue, { color: "#fff" }]}>Rs {totalValue.toFixed(0)}</Text>
          </LinearGradient>
        </View>

        {/* ROLE SWITCH CARD */}
        <TouchableOpacity
          onPress={handleSwitchRole}
          activeOpacity={0.85}
          disabled={switchingRole}
          style={[styles.roleSwitchCard, {
            backgroundColor: isDriver ? "#2170E4" + "12" : "#10B981" + "12",
            borderColor: isDriver ? "#2170E4" + "40" : "#10B981" + "40",
          }]}
        >
          <LinearGradient
            colors={isDriver ? ["#2170E4", "#10B981"] : ["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.roleSwitchIcon}
          >
            {switchingRole
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name={isDriver ? "person" : "car"} size={20} color="#fff" />
            }
          </LinearGradient>
          <View style={{ flex: 1, alignItems: isUrdu ? "flex-end" : "flex-start" }}>
            <Text style={[styles.roleSwitchTitle, { color: colors.foreground }]}>
              {isUrdu
                ? (isDriver ? "مسافر موڈ پر جائیں" : "ڈرائیور موڈ پر جائیں")
                : (isDriver ? "Switch to Rider Mode" : "Switch to Driver Mode")}
            </Text>
            <Text style={[styles.roleSwitchSub, { color: colors.mutedForeground }]}>
              {isUrdu
                ? (isDriver ? "ابھی آپ ڈرائیور ہیں" : "ابھی آپ مسافر ہیں")
                : (isDriver ? "Currently in Driver mode" : "Currently in Rider mode")}
            </Text>
          </View>
          <Ionicons
            name={isUrdu ? "chevron-back" : "chevron-forward"}
            size={18}
            color={colors.border}
          />
        </TouchableOpacity>

        <View style={[styles.langCard, { backgroundColor: colors.card }]}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, lang === "ur" && styles.langBtnActive]}
              onPress={() => setLang("ur")}
              activeOpacity={0.8}
            >
              {lang === "ur" && (
                <LinearGradient colors={["#10B981", "#2170E4"]} style={StyleSheet.absoluteFill} />
              )}
              <Text style={[styles.langBtnText, { color: lang === "ur" ? "#fff" : colors.mutedForeground }]}>
                اردو
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
              onPress={() => setLang("en")}
              activeOpacity={0.8}
            >
              {lang === "en" && (
                <LinearGradient colors={["#10B981", "#2170E4"]} style={StyleSheet.absoluteFill} />
              )}
              <Text style={[styles.langBtnText, { color: lang === "en" ? "#fff" : colors.mutedForeground }]}>
                English
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: isUrdu ? "flex-end" : "flex-start" }}>
            <Text style={[styles.langLabel, { color: colors.mutedForeground }]}>
              {isUrdu ? "زبان" : "Language"}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: isUrdu ? "right" : "left" }]}>
          {isUrdu ? "اکاؤنٹ" : "ACCOUNT"}
        </Text>

        <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
          {MENU.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={item.onPress}>
                {!isUrdu && <Ionicons name="chevron-forward" size={18} color={colors.border} />}
                <View style={{ flex: 1, alignItems: isUrdu ? "flex-end" : "flex-start" }}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.menuSub, {
                    color: item.badge === "verified" ? colors.primary : colors.mutedForeground
                  }]}>{item.sub}</Text>
                </View>
                {isUrdu && <Ionicons name="chevron-back" size={18} color={colors.border} />}
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
          <Text style={[styles.logoutText, { color: colors.destructive }]}>{t("logout")}</Text>
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
  avatar: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { fontSize: 32, color: "#fff", fontFamily: "Inter_700Bold" },
  cameraBtn: { position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  ratingBadge: { position: "absolute", bottom: -4, left: -4, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 2 },
  phone: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  tags: { flexWrap: "wrap", gap: 6 },
  tag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4 },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  roleSwitchCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1.5 },
  roleSwitchIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  roleSwitchTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  roleSwitchSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  langCard: { borderRadius: 18, padding: 14, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, gap: 8 },
  langRow: { flexDirection: "row", gap: 8, backgroundColor: "transparent" },
  langBtn: { flex: 1, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  langBtnActive: {},
  langBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  langLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase" },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10, paddingHorizontal: 4 },
  menuCard: { borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: 16 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1, marginLeft: 74 },
  logoutBtn: { paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  logoutText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
