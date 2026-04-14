import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useCancelRide, useCompleteRide, useGetActiveRide } from "@workspace/api-client-react";
import LeafletMap from "@/components/LeafletMap";

export default function RideTrackingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { activeRide, setActiveRide } = useApp();
  const { t } = useLang();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: activeRideData } = useGetActiveRide({
    query: { refetchInterval: 6000, enabled: !!activeRide },
  });

  const cancelMutation = useCancelRide();
  const completeMutation = useCompleteRide();

  const rideId = activeRide?.id ?? activeRideData?.ride?.id ?? "";
  const currentStatus = activeRideData?.ride?.status ?? activeRide?.status ?? "accepted";

  const STATUS_LABELS: Record<string, string> = {
    accepted: t("accepted" as any) ?? "Driver accepted your ride",
    on_the_way: "Driver is on the way",
    trip_started: "Trip in progress",
    searching: "Finding a driver...",
  };

  if (!activeRide && !activeRideData?.ride) {
    router.replace("/(tabs)/home");
    return null;
  }

  const ride = activeRide ?? {
    driverName: activeRideData?.ride?.driverName ?? "Driver",
    driverRating: activeRideData?.ride?.driverRating ?? 4.9,
    carModel: activeRideData?.ride?.carModel ?? "Suzuki Alto",
    carPlate: activeRideData?.ride?.carPlate ?? "LHR-2024",
    pickup: activeRideData?.ride?.pickup ?? "",
    dropoff: activeRideData?.ride?.dropoff ?? "",
    fare: activeRideData?.ride?.finalFare ?? activeRideData?.ride?.offeredFare ?? 0,
    eta: "5 min",
    distance: activeRideData?.ride?.distance ?? "",
    duration: activeRideData?.ride?.duration ?? "",
  };

  const cancelRide = () => {
    Alert.alert(t("cancelRide"), t("cancelConfirm"), [
      { text: t("no"), style: "cancel" },
      {
        text: t("yesCancel"),
        style: "destructive",
        onPress: async () => {
          try {
            await cancelMutation.mutateAsync({ rideId });
          } catch {}
          queryClient.clear();
          setActiveRide(null);
          router.replace("/(tabs)/home");
        },
      },
    ]);
  };

  const completeRide = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await completeMutation.mutateAsync({ rideId });
      queryClient.clear();
      setActiveRide(null);
      router.replace({
        pathname: "/trip-summary",
        params: { rideId },
      });
    } catch {
      Alert.alert(t("error"), "Could not complete ride.");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.mapArea}>
        <LeafletMap
          pickupAddress={ride.pickup}
          dropoffAddress={ride.dropoff}
          mode="tracking"
          vehicleType="car"
          style={{ flex: 1 }}
        />
        <View style={[styles.pkFlag, { top: 8, right: 8, backgroundColor: colors.card + "CC" }]}>
          <Text>🇵🇰</Text>
        </View>
      </View>

      <View style={[styles.headerOverlay, { paddingTop: topPad + 8, paddingHorizontal: 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.tripStatusPill, { backgroundColor: colors.primary + "15" }]}>
          <View style={[styles.tripDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.tripStatusText, { color: colors.primary }]}>{t("onTrip")}</Text>
        </View>
      </View>

      <View style={[styles.etaCard, { top: topPad + 68, backgroundColor: colors.card + "E6" }]}>
        <View style={styles.etaRow}>
          <View>
            <Text style={[styles.etaNum, { color: colors.foreground }]}>
              {ride.eta}
            </Text>
            <Text style={[styles.etaLabel, { color: colors.mutedForeground }]}>{t("eta")}</Text>
          </View>
          <View style={[styles.boltBtn, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="flash" size={20} color={colors.primary} />
          </View>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statusText, { color: colors.foreground }]}>
            {STATUS_LABELS[currentStatus] ?? "Ride accepted"}
          </Text>
        </View>
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.surfaceContainerHigh }]} />

        <View style={styles.driverSection}>
          <View style={styles.driverRow}>
            <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.avatar}>
              <Text style={styles.avatarText}>{ride.driverName?.charAt(0) ?? "D"}</Text>
            </LinearGradient>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: colors.foreground }]}>{ride.driverName}</Text>
              <Text style={[styles.driverRole, { color: colors.mutedForeground }]}>{t("verifiedDriver")}</Text>
            </View>
            <View style={[styles.ratingBadge, { backgroundColor: "#F59E0B" + "15" }]}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: colors.foreground }]}>{ride.driverRating}</Text>
            </View>
          </View>

          <View style={[styles.carInfo, { backgroundColor: colors.surfaceContainerLow }]}>
            <View>
              <Text style={[styles.carModel, { color: colors.foreground }]}>
                {ride.carModel?.split("•")[0]?.trim() ?? "Suzuki Alto"}
              </Text>
              <Text style={[styles.carDetail, { color: colors.mutedForeground }]}>
                Rs {ride.fare?.toFixed(0)} {t("fare")}
              </Text>
            </View>
            <View style={[styles.plateBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.plateText, { color: colors.foreground }]}>
                {(ride as any).carPlate ?? "LHR-2024"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary + "20" }]} activeOpacity={0.8}>
            <Ionicons name="call" size={22} color={colors.secondary} />
            <Text style={[styles.actionLabel, { color: colors.secondary }]}>{t("call")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary + "20" }]} activeOpacity={0.8}>
            <Ionicons name="chatbubble" size={22} color={colors.secondary} />
            <Text style={[styles.actionLabel, { color: colors.secondary }]}>{t("chat")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.destructive + "20" }]}
            onPress={cancelRide}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={22} color={colors.destructive} />
            <Text style={[styles.actionLabel, { color: colors.destructive }]}>{t("cancel")}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={completeRide} disabled={completeMutation.isPending} activeOpacity={0.85}>
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeBtn}
          >
            <Text style={styles.completeBtnText}>{t("completeTrip")}</Text>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: botPad + 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapArea: { flex: 1, position: "relative", overflow: "hidden" },
  pkFlag: { position: "absolute", padding: 6, borderRadius: 10, flexDirection: "row", alignItems: "center", zIndex: 10 },
  headerOverlay: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  tripStatusPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tripDot: { width: 6, height: 6, borderRadius: 3 },
  tripStatusText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  etaCard: {
    position: "absolute", left: 12, right: 12, borderRadius: 20, padding: 16, gap: 10,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  etaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  etaNum: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  etaLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase" },
  boltBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  bottomSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 12,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  driverSection: { gap: 12, marginBottom: 16 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  driverRole: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 2 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ratingText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  carInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 16, padding: 14 },
  carModel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  carDetail: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, textTransform: "uppercase" },
  plateBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  plateText: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 14 },
  actionBtn: { flex: 1, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 4 },
  actionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  completeBtn: { height: 56, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  completeBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
