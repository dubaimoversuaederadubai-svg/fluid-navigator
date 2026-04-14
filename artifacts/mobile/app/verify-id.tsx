import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

export default function VerifyIdScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, token, setAuth } = useApp();
  const { t, isUrdu } = useLang();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [cnic, setCnic] = useState("");
  const [license, setLicense] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [loading, setLoading] = useState(false);

  const formatCnic = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  };

  const handleSubmit = async () => {
    const digits = cnic.replace(/\D/g, "");
    if (digits.length !== 13) {
      Alert.alert(t("error"), "CNIC must be 13 digits (XXXXX-XXXXXXX-X)");
      return;
    }
    if (user?.role === "driver") {
      if (!license.trim()) {
        Alert.alert(t("error"), "License number is required");
        return;
      }
      if (!vehicleModel.trim() || !vehiclePlate.trim()) {
        Alert.alert(t("error"), "Vehicle details are required");
        return;
      }
    }
    setLoading(true);
    try {
      const body: any = { cnicNumber: cnic };
      if (user?.role === "driver") {
        body.licenseNumber = license;
        body.vehicleModel = vehicleModel;
        body.vehicleNumber = vehiclePlate;
      }
      const res = await fetch(`${BASE_URL}/api/users/me/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      if (user && token) {
        await setAuth({ ...user, ...data.user }, token);
      }
      Alert.alert(t("verified"), t("pendingVerification"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(t("error"), e.message ?? "Could not submit verification");
    } finally {
      setLoading(false);
    }
  };

  const isDriver = user?.role === "driver";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
            <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.heroGrad} />
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={36} color="#fff" />
            </View>
            <Text style={[styles.heroTitle, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>
              {t("verifyIdentity")}
            </Text>
            <Text style={[styles.heroSub, { color: colors.mutedForeground, textAlign: isUrdu ? "right" : "left" }]}>
              {isDriver
                ? "CNIC، ڈرائیونگ لائسنس اور گاڑی کی تفصیلات درج کریں"
                : t("verifyCNIC")}
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>
              {t("cnicNumber")}
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.surfaceContainerHighest }]}>
              <Ionicons name="card-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}
                value={cnic}
                onChangeText={(t) => setCnic(formatCnic(t))}
                placeholder={t("cnicPlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={15}
              />
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {isUrdu ? "مثلاً: 35202-1234567-1" : "e.g. 35202-1234567-1"}
            </Text>
          </View>

          {isDriver && (
            <>
              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>
                  {t("licenseNumber")}
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <Ionicons name="document-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}
                    value={license}
                    onChangeText={setLicense}
                    placeholder={t("licensePlaceholder")}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>
                  {t("vehicleModel")}
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <Ionicons name="car-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                    placeholder={t("vehicleModelPlaceholder")}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>
                  {t("vehiclePlate")}
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <Ionicons name="tablet-landscape-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    placeholder={t("vehiclePlatePlaceholder")}
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </>
          )}

          <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary, textAlign: isUrdu ? "right" : "left", flex: 1 }]}>
              {isUrdu
                ? "آپ کی معلومات محفوظ ہیں۔ تصدیق عام طور پر 24 گھنٹوں میں مکمل ہو جاتی ہے۔"
                : "Your information is secure. Verification is usually completed within 24 hours."}
            </Text>
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
            <LinearGradient
              colors={["#10B981", "#2170E4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
            >
              {loading ? (
                <Text style={styles.submitText}>{t("verifying")}</Text>
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  <Text style={styles.submitText}>{t("submitVerification")}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { marginBottom: 16 },
  backCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  heroCard: { borderRadius: 24, padding: 24, marginBottom: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  heroGrad: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  section: { borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, paddingLeft: 4 },
  infoBox: { flexDirection: "row", gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16, alignItems: "flex-start" },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  submitBtn: { height: 56, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  submitText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
