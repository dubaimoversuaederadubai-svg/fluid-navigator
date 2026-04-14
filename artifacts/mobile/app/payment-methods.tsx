import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL
  || (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "http://localhost:8080");

const PAYMENT_OPTIONS = [
  {
    id: "cash",
    icon: "cash-outline" as const,
    label: "نقد",
    labelEn: "Cash",
    sub: "ادائیگی ڈرائیور کو نقد",
    subEn: "Pay driver directly in cash",
    color: "#10B981",
  },
  {
    id: "jazzcash",
    icon: "phone-portrait-outline" as const,
    label: "JazzCash",
    labelEn: "JazzCash",
    sub: "Jazz موبائل والٹ",
    subEn: "Jazz mobile wallet",
    color: "#EF4444",
  },
  {
    id: "easypaisa",
    icon: "phone-portrait-outline" as const,
    label: "EasyPaisa",
    labelEn: "EasyPaisa",
    sub: "Telenor موبائل والٹ",
    subEn: "Telenor mobile wallet",
    color: "#10B981",
  },
  {
    id: "sadapay",
    icon: "card-outline" as const,
    label: "Sadapay",
    labelEn: "Sadapay",
    sub: "ڈیجیٹل بینک کارڈ",
    subEn: "Digital bank card",
    color: "#7C3AED",
  },
  {
    id: "nayapay",
    icon: "wallet-outline" as const,
    label: "NayaPay",
    labelEn: "NayaPay",
    sub: "NayaPay والٹ",
    subEn: "NayaPay wallet",
    color: "#2170E4",
  },
];

export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, token, setAuth } = useApp();
  const { t, isUrdu, lang } = useLang();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selected, setSelected] = useState(user?.paymentMethod ?? "cash");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/me/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethod: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      if (user && token) {
        await setAuth({ ...user, paymentMethod: selected } as any, token);
      }
      Alert.alert("✓", isUrdu ? "ادائیگی کا طریقہ محفوظ ہو گیا" : "Payment method saved", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(t("error"), e.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <View style={[styles.backCircle, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </View>
        </TouchableOpacity>

        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          <LinearGradient colors={["#10B981" + "20", "#2170E4" + "10"]} style={styles.heroBg} />
          <View style={styles.heroIcon}>
            <Ionicons name="wallet" size={32} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>
            {t("paymentMethods")}
          </Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground, textAlign: isUrdu ? "right" : "left" }]}>
            {isUrdu ? "اپنی پسندیدہ ادائیگی کا طریقہ منتخب کریں" : "Select your preferred payment method"}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: isUrdu ? "right" : "left" }]}>
          {t("selectPayment")}
        </Text>

        <View style={[styles.optionsList, { backgroundColor: colors.card }]}>
          {PAYMENT_OPTIONS.map((opt, i) => {
            const isSelected = selected === opt.id;
            return (
              <React.Fragment key={opt.id}>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    isSelected && { backgroundColor: opt.color + "08" },
                  ]}
                  onPress={() => setSelected(opt.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionRight}>
                    <View style={[styles.radio, { borderColor: isSelected ? opt.color : colors.border }]}>
                      {isSelected && <View style={[styles.radioDot, { backgroundColor: opt.color }]} />}
                    </View>
                    <View style={{ flex: 1, alignItems: isUrdu ? "flex-end" : "flex-start" }}>
                      <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                        {isUrdu ? opt.label : opt.labelEn}
                      </Text>
                      <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>
                        {isUrdu ? opt.sub : opt.subEn}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.optionIcon, { backgroundColor: opt.color + "15" }]}>
                    <Ionicons name={opt.icon} size={22} color={opt.color} />
                  </View>
                </TouchableOpacity>
                {i < PAYMENT_OPTIONS.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Ionicons name="lock-closed" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary, textAlign: isUrdu ? "right" : "left", flex: 1 }]}>
            {isUrdu
              ? "تمام ادائیگیاں محفوظ ہیں۔ آپ کی مالی معلومات کبھی شیئر نہیں کی جاتیں۔"
              : "All payments are secure. Your financial info is never shared."}
          </Text>
        </View>

        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>
              {saving ? (isUrdu ? "محفوظ ہو رہا ہے..." : "Saving...") : (isUrdu ? "محفوظ کریں" : "Save")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { marginBottom: 16 },
  backCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  heroBg: { position: "absolute", top: -40, right: -40, width: 130, height: 130, borderRadius: 65 },
  heroIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 4 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  optionsList: { borderRadius: 20, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  optionItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  optionRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  optionIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, marginLeft: 72 },
  infoBox: { flexDirection: "row", gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16, alignItems: "flex-start" },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  saveBtn: { height: 56, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  saveBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
