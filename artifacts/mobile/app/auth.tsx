import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useRef, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSendOtp, useVerifyOtp, useRegisterUser } from "@workspace/api-client-react";
import type { AppUser } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Screen = "phone" | "otp" | "role";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { setAuth, setOnboarded } = useApp();
  const { lang, setLang, t } = useLang();
  const [screen, setScreen] = useState<Screen>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [pendingToken, setPendingToken] = useState<string>("");
  const [pendingUser, setPendingUser] = useState<any>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();
  const registerMutation = useRegisterUser();

  const isRtl = lang === "ur";

  const handlePhoneContinue = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      Alert.alert(t("invalidPhone"), t("invalidPhoneMsg"));
      return;
    }
    try {
      const fullPhone = "92" + digits.replace(/^0/, "");
      const resp = await sendOtpMutation.mutateAsync({ data: { phone: fullPhone } });
      setOtp(["", "", "", ""]);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setScreen("otp");
      // Auto-fill OTP if server returns devCode (SMS not delivered)
      if (resp.devCode) {
        setTimeout(() => setOtp(resp.devCode!.split("")), 300);
      }
    } catch (err: any) {
      const rawMsg: string = err?.data?.error || err?.message || "";
      const isNetErr = rawMsg.toLowerCase().includes("network") || rawMsg.toLowerCase().includes("failed to fetch");
      const msg = isNetErr
        ? (isRtl ? "سرور سے رابطہ نہ ہو سکا۔ انٹرنیٹ چیک کریں۔" : "Cannot reach server. Check internet connection.")
        : rawMsg || t("otpSendError");
      Alert.alert(t("error"), msg);
      return;
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = val.replace(/\D/g, "").slice(-1);
    setOtp(newOtp);
    if (val && idx < 3) otpRefs.current[idx + 1]?.focus();
    if (newOtp.every((d) => d !== "")) {
      setTimeout(() => handleVerify(newOtp.join("")), 100);
    }
  };

  const handleOtpKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    const code = codeOverride ?? otp.join("");
    if (code.length < 4) {
      Alert.alert(t("enterCode"), t("enterCodeMsg"));
      return;
    }
    try {
      const digits = phone.replace(/\D/g, "");
      const fullPhone = "92" + digits.replace(/^0/, "");
      const resp = await verifyOtpMutation.mutateAsync({ data: { phone: fullPhone, code } });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await AsyncStorage.setItem("fluid_token", resp.token);
      setPendingToken(resp.token);
      setPendingUser(resp.user);
      if (!resp.isNewUser && resp.user.name) {
        const u: AppUser = {
          id: resp.user.id,
          name: resp.user.name,
          phone: resp.user.phone,
          role: resp.user.role as "rider" | "driver",
          rating: resp.user.rating,
          totalRides: resp.user.totalRides,
          isOnline: resp.user.isOnline,
        };
        await setAuth(u, resp.token);
        router.replace("/(tabs)/home");
      } else {
        setScreen("role");
      }
    } catch {
      setOtp(["", "", "", ""]);
      otpRefs.current[0]?.focus();
      Alert.alert(t("codeInvalid"), t("codeInvalidMsg"));
    }
  };

  const handleSelectRole = async (name: string, role: "rider" | "driver") => {
    if (!name.trim()) {
      Alert.alert(t("nameRequired"), t("nameRequiredMsg"));
      return;
    }
    try {
      const resp = await registerMutation.mutateAsync({
        data: { name: name.trim(), role },
      });
      const u: AppUser = {
        id: resp.user.id,
        name: resp.user.name,
        phone: resp.user.phone,
        role: resp.user.role as "rider" | "driver",
        rating: resp.user.rating,
        totalRides: resp.user.totalRides,
        isOnline: resp.user.isOnline,
      };
      await setAuth(u, pendingToken);
      await setOnboarded(true);
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert(t("error"), t("registrationError"));
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient
      colors={["#10B981", "#2170E4"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <View style={[styles.brandPanel, { paddingTop: topPad + 36 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={styles.langToggleRow}>
            <TouchableOpacity
              style={[styles.langToggleBtn, lang === "ur" && styles.langToggleActive]}
              onPress={() => setLang("ur")}
              activeOpacity={0.8}
            >
              <Text style={[styles.langToggleText, { color: lang === "ur" ? "#10B981" : "rgba(255,255,255,0.6)" }]}>اردو</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langToggleBtn, lang === "en" && styles.langToggleActive]}
              onPress={() => setLang("en")}
              activeOpacity={0.8}
            >
              <Text style={[styles.langToggleText, { color: lang === "en" ? "#10B981" : "rgba(255,255,255,0.6)" }]}>EN</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logoRow}>
            <Ionicons name="navigate" size={28} color="#fff" />
            <Text style={styles.brandName}>Fluid Navigator</Text>
          </View>
        </View>
        <Text style={[styles.brandTagline, { textAlign: isRtl ? "right" : "left" }]}>{t("appTagline")}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.card}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.cardInner,
            { paddingTop: 28, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {screen === "phone" && (
            <PhoneScreen
              phone={phone}
              setPhone={setPhone}
              onContinue={handlePhoneContinue}
              loading={sendOtpMutation.isPending}
              colors={colors}
              isRtl={isRtl}
            />
          )}
          {screen === "otp" && (
            <OtpScreen
              phone={phone}
              otp={otp}
              otpRefs={otpRefs}
              onChange={handleOtpChange}
              onKeyPress={handleOtpKeyPress}
              onBack={() => { setScreen("phone"); setOtp(["", "", "", ""]); }}
              onVerify={() => handleVerify()}
              loading={verifyOtpMutation.isPending}
              onResend={handlePhoneContinue}
              colors={colors}
              isRtl={isRtl}
            />
          )}
          {screen === "role" && (
            <RoleScreen
              onSelect={handleSelectRole}
              loading={registerMutation.isPending}
              colors={colors}
              isRtl={isRtl}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function PhoneScreen({ phone, setPhone, onContinue, loading, colors, isRtl }: any) {
  const { t } = useLang();
  const align = isRtl ? "right" : "left";
  return (
    <View style={styles.formSection}>
      <Text style={[styles.screenTitle, { color: colors.foreground, textAlign: align }]}>{t("welcome")}</Text>
      <Text style={[styles.screenSub, { color: colors.mutedForeground, textAlign: align }]}>{t("enterPhone")}</Text>

      <View style={{ gap: 8, marginTop: 32 }}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground, textAlign: align }]}>{t("mobileNumber")}</Text>
        <View style={[styles.phoneRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <View style={[styles.countryCode, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Text style={{ fontSize: 18 }}>🇵🇰</Text>
            <Text style={[styles.countryCodeText, { color: colors.foreground }]}>+92</Text>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceContainerHighest, color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="3xx xxx xxxx"
            placeholderTextColor={colors.mutedForeground}
            maxLength={11}
          />
        </View>
      </View>

      <View style={[styles.infoBadge, { backgroundColor: colors.primary + "15", flexDirection: isRtl ? "row-reverse" : "row" }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.primary, textAlign: align }]}>{t("phoneSecurity")}</Text>
      </View>

      <TouchableOpacity onPress={onContinue} disabled={loading} activeOpacity={0.85} style={{ marginTop: 20 }}>
        <LinearGradient
          colors={["#10B981", "#2170E4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.mainBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.mainBtnText}>{t("sendOtp")}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function OtpScreen({ phone, otp, otpRefs, onChange, onKeyPress, onBack, onVerify, loading, onResend, colors, isRtl }: any) {
  const { t } = useLang();
  const align = isRtl ? "right" : "left";
  const maskedPhone = "0" + phone.replace(/^0/, "").slice(0, 3) + "xxxxxxx";
  return (
    <View style={styles.formSection}>
      <TouchableOpacity onPress={onBack} style={[styles.backRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
        <Ionicons name={isRtl ? "arrow-forward" : "arrow-back"} size={22} color={colors.mutedForeground} />
        <Text style={[styles.backText, { color: colors.mutedForeground }]}>{t("back")}</Text>
      </TouchableOpacity>

      <View style={[styles.otpIconWrap, { backgroundColor: colors.primary + "15" }]}>
        <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary} />
      </View>

      <Text style={[styles.screenTitle, { color: colors.foreground, textAlign: align }]}>{t("otpSent")}</Text>
      <Text style={[styles.screenSub, { color: colors.mutedForeground, textAlign: align }]}>
        {t("otpSentMsg")}{" "}
        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>
          +92 {maskedPhone}
        </Text>
      </Text>

      <View style={styles.otpRow}>
        {otp.map((val: string, i: number) => (
          <TextInput
            key={i}
            ref={(r) => { otpRefs.current[i] = r; }}
            style={[
              styles.otpInput,
              {
                backgroundColor: val ? colors.primary + "18" : colors.surfaceContainerHighest,
                color: colors.foreground,
                borderColor: val ? colors.primary : colors.border,
              },
            ]}
            value={val}
            onChangeText={(v) => onChange(v, i)}
            onKeyPress={(e: any) => onKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            autoFocus={i === 0}
          />
        ))}
      </View>

      {loading && (
        <View style={styles.verifyingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.verifyingText, { color: colors.primary }]}>{t("verifying")}</Text>
        </View>
      )}

      <TouchableOpacity onPress={onResend} style={styles.resendBtn}>
        <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
          {t("resend")}{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{t("resendBtn")}</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onVerify} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
        <LinearGradient
          colors={["#10B981", "#2170E4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.mainBtn}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.mainBtnText}>{t("verify")}</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function RoleScreen({ onSelect, loading, colors, isRtl }: any) {
  const { t } = useLang();
  const align = isRtl ? "right" : "left";
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"rider" | "driver" | null>(null);

  return (
    <View style={styles.formSection}>
      <View style={[styles.successBadge, { backgroundColor: colors.primary + "15", alignSelf: isRtl ? "flex-end" : "flex-start" }]}>
        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
        <Text style={[styles.successBadgeText, { color: colors.primary }]}>{t("numberVerified")}</Text>
      </View>

      <Text style={[styles.screenTitle, { color: colors.foreground, textAlign: align }]}>{t("createProfile")}</Text>
      <Text style={[styles.screenSub, { color: colors.mutedForeground, textAlign: align }]}>{t("profileSub")}</Text>

      <View style={{ gap: 8, marginTop: 24, marginBottom: 8 }}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground, textAlign: align }]}>{t("yourName")}</Text>
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.surfaceContainerHighest,
              color: colors.foreground,
              borderColor: name ? colors.primary : "transparent",
              textAlign: isRtl ? "right" : "left",
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder={t("namePlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
        />
      </View>

      <Text style={[styles.inputLabel, { color: colors.mutedForeground, marginBottom: 10, marginTop: 8, textAlign: align }]}>
        {t("iAm")}
      </Text>

      <View style={{ gap: 10 }}>
        <TouchableOpacity onPress={() => setSelectedRole("rider")} activeOpacity={0.85}>
          {selectedRole === "rider" ? (
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.roleCard, { flexDirection: isRtl ? "row-reverse" : "row" }]}
            >
              <View style={styles.roleIconCircle}>
                <Ionicons name="person" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleCardTitleSelected, { textAlign: align }]}>{t("rider")}</Text>
                <Text style={[styles.roleCardSubSelected, { textAlign: align }]}>{t("riderSub")}</Text>
              </View>
              <View style={styles.roleCheck}>
                <Ionicons name="checkmark" size={16} color="#10B981" />
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.roleCard, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <View style={[styles.roleIconCircle, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleCardTitle, { color: colors.foreground, textAlign: align }]}>{t("rider")}</Text>
                <Text style={[styles.roleCardSub, { color: colors.mutedForeground, textAlign: align }]}>{t("riderSub")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSelectedRole("driver")} activeOpacity={0.85}>
          {selectedRole === "driver" ? (
            <LinearGradient
              colors={["#2170E4", "#1a5cc4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.roleCard, { flexDirection: isRtl ? "row-reverse" : "row" }]}
            >
              <View style={styles.roleIconCircle}>
                <Ionicons name="car-sport" size={24} color="#2170E4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleCardTitleSelected, { textAlign: align }]}>{t("driver")}</Text>
                <Text style={[styles.roleCardSubSelected, { textAlign: align }]}>{t("driverSub")}</Text>
              </View>
              <View style={styles.roleCheck}>
                <Ionicons name="checkmark" size={16} color="#2170E4" />
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.roleCard, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <View style={[styles.roleIconCircle, { backgroundColor: colors.secondary + "15" }]}>
                <Ionicons name="car-sport" size={24} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleCardTitle, { color: colors.foreground, textAlign: align }]}>{t("driver")}</Text>
                <Text style={[styles.roleCardSub, { color: colors.mutedForeground, textAlign: align }]}>{t("driverSub")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {selectedRole && (
        <TouchableOpacity
          onPress={() => onSelect(name, selectedRole)}
          disabled={loading}
          activeOpacity={0.85}
          style={{ marginTop: 20 }}
        >
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.mainBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.mainBtnText}>{t("getStarted")}</Text>
                <Ionicons name="rocket" size={18} color="#fff" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brandPanel: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    gap: 10,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.5 },
  langToggleRow: { flexDirection: "row", gap: 4, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 3 },
  langToggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9 },
  langToggleActive: { backgroundColor: "#fff" },
  langToggleText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  brandTagline: {
    fontSize: 15, color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular", lineHeight: 22,
  },
  card: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  cardInner: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  formSection: { gap: 0 },
  backRow: { alignItems: "center", gap: 6, marginBottom: 20 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  screenTitle: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.8, marginBottom: 6 },
  screenSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  phoneRow: { gap: 10 },
  countryCode: {
    height: 56, paddingHorizontal: 14, borderRadius: 16,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  countryCodeText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  input: { flex: 1, height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 18, fontFamily: "Inter_500Medium" },
  nameInput: {
    height: 56, borderRadius: 16, paddingHorizontal: 16,
    fontSize: 16, fontFamily: "Inter_500Medium",
    borderWidth: 2,
  },
  infoBadge: {
    alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12, marginTop: 12,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  mainBtn: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  mainBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  otpIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 28, gap: 10 },
  otpInput: { flex: 1, height: 72, borderRadius: 16, fontSize: 30, fontFamily: "Inter_700Bold", borderWidth: 2 },
  verifyingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 },
  verifyingText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  resendBtn: { alignItems: "center", marginBottom: 16 },
  resendText: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  successBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 16,
  },
  successBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  roleCard: {
    padding: 16, borderRadius: 18,
    alignItems: "center", gap: 14,
  },
  roleIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  roleCardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  roleCardTitleSelected: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  roleCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  roleCardSubSelected: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  roleCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
});
