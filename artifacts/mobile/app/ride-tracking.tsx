import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
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
import { useCancelRide, useCompleteRide, useGetActiveRide, customFetch } from "@workspace/api-client-react";
import LeafletMap, { LeafletMapRef } from "@/components/LeafletMap";

export default function RideTrackingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { activeRide, setActiveRide, user } = useApp();
  const { t, isUrdu } = useLang();
  const queryClient = useQueryClient();
  const mapRef = useRef<LeafletMapRef>(null);
  const [driverLat, setDriverLat] = useState<number | undefined>(undefined);
  const [driverLng, setDriverLng] = useState<number | undefined>(undefined);
  const [driverDistKm, setDriverDistKm] = useState<number | null>(null);
  const [partnerPhone, setPartnerPhone] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  const isDriver = user?.role === "driver";
  const [startingRide, setStartingRide] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: activeRideData, refetch: refetchActive } = useGetActiveRide({
    query: { refetchInterval: 5000, enabled: !!activeRide || !!rideId },
  });

  const cancelMutation = useCancelRide();
  const completeMutation = useCompleteRide();

  const rideId = activeRide?.id ?? activeRideData?.ride?.id ?? "";
  const currentStatus = activeRideData?.ride?.status ?? activeRide?.status ?? "accepted";
  const driverId = activeRide?.driverId ?? activeRideData?.ride?.driverId;
  const tripStarted = currentStatus === "trip_started";

  // Fetch partner phone for call button
  useEffect(() => {
    if (!rideId) return;
    customFetch(`/api/rides/${rideId}/partner-phone`)
      .then((data: any) => {
        if (data?.phone) setPartnerPhone(data.phone);
        if (data?.name) setPartnerName(data.name);
      })
      .catch(() => {});
  }, [rideId]);

  // Notify map when trip starts (switches route mode)
  useEffect(() => {
    if (tripStarted) {
      mapRef.current?.sendCommand({ action: "trip_started" });
    }
  }, [tripStarted]);

  // ─── DRIVER GPS BEACON ──────────────────────────────────────────────────────
  const sendDriverLocation = useCallback(async () => {
    if (!isDriver || !rideId) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      await customFetch("/api/users/me/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
          vehicleType: user?.vehicleType ?? "car",
        }),
      });
      setDriverLat(latitude);
      setDriverLng(longitude);
      mapRef.current?.sendCommand({ action: "update_driver", lat: latitude, lng: longitude });
    } catch {}
  }, [isDriver, rideId, user?.vehicleType]);

  useEffect(() => {
    if (!isDriver || !rideId) return;
    sendDriverLocation();
    const interval = setInterval(sendDriverLocation, 5000);
    return () => clearInterval(interval);
  }, [isDriver, rideId, sendDriverLocation]);
  // ────────────────────────────────────────────────────────────────────────────

  // Detect completion
  useEffect(() => {
    if (!isDriver && activeRideData?.ride?.status === "completed") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.clear();
      const completedRideId = activeRideData.ride.id;
      setActiveRide(null);
      router.replace({ pathname: "/trip-summary", params: { rideId: completedRideId } });
    }
  }, [activeRideData?.ride?.status, isDriver]);

  useEffect(() => {
    if (!activeRide && activeRideData !== undefined && !activeRideData?.ride) {
      router.replace("/(tabs)/home");
    }
  }, [activeRide, activeRideData]);

  // ─── RIDER: Poll driver location every 8s ──────────────────────────────────
  const pollLocation = useCallback(async () => {
    if (!rideId || isDriver) return;
    try {
      if (driverId) {
        const res: any = await customFetch(`/api/users/drivers/${driverId}/location`);
        if (res.lat && res.lng) {
          setDriverLat(res.lat);
          setDriverLng(res.lng);
          mapRef.current?.sendCommand({ action: "update_driver", lat: res.lat, lng: res.lng });
          const pLat = (activeRide as any)?.pickupLat;
          const pLng = (activeRide as any)?.pickupLng;
          if (pLat && pLng) {
            const dist = haversineKm(res.lat, res.lng, pLat, pLng);
            setDriverDistKm(parseFloat(dist.toFixed(2)));
          }
        }
      }
    } catch {}
  }, [rideId, driverId, isDriver, activeRide]);

  useEffect(() => {
    if (!rideId || isDriver) return;
    pollLocation();
    const interval = setInterval(pollLocation, 8000);
    return () => clearInterval(interval);
  }, [rideId, pollLocation, isDriver]);
  // ────────────────────────────────────────────────────────────────────────────

  if (!activeRide && !activeRideData?.ride) {
    return null;
  }

  const STATUS_LABELS: Record<string, string> = {
    accepted: isUrdu ? "ڈرائیور نے سواری قبول کر لی" : "Driver accepted your ride",
    on_the_way: isUrdu ? "ڈرائیور آپ کی طرف آ رہا ہے" : "Driver is on the way",
    trip_started: isUrdu ? "سفر جاری ہے" : "Trip in progress",
    searching: isUrdu ? "ڈرائیور تلاش ہو رہا ہے..." : "Finding a driver...",
    completed: isUrdu ? "سفر مکمل ہو گیا" : "Trip completed!",
  };

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

  const pickupLat = (activeRide as any)?.pickupLat ?? undefined;
  const pickupLng = (activeRide as any)?.pickupLng ?? undefined;

  // ─── CALL BUTTON (In-App Voice Call) ────────────────────────────────────────
  const handleCall = () => {
    if (!rideId) return;
    router.push({
      pathname: "/call",
      params: {
        rideId,
        partnerName: partnerName ?? (isDriver
          ? ((ride as any).riderName ?? (isUrdu ? "مسافر" : "Rider"))
          : (ride.driverName ?? (isUrdu ? "ڈرائیور" : "Driver"))),
        party: isDriver ? "driver" : "rider",
      },
    });
  };
  // ────────────────────────────────────────────────────────────────────────────

  const CANCEL_REASONS_EN = ["Change of plan", "Driver too far", "Wrong location entered", "Found another ride", "Emergency", "Other reason"];
  const CANCEL_REASONS_UR = ["منصوبہ بدل گیا", "ڈرائیور بہت دور ہے", "غلط جگہ درج کی", "دوسری سواری مل گئی", "ایمرجنسی", "کوئی اور وجہ"];

  const cancelRide = () => {
    if (currentStatus === "trip_started") {
      Alert.alert(
        isUrdu ? "منسوخ نہیں ہو سکتا" : "Cannot Cancel",
        isUrdu ? "سفر شروع ہو چکا ہے" : "Trip has already started.",
        [{ text: "OK" }]
      );
      return;
    }
    const reasons = isUrdu ? CANCEL_REASONS_UR : CANCEL_REASONS_EN;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: isUrdu ? "منسوخی کی وجہ بتائیں" : "Why are you cancelling?",
          options: [...reasons, isUrdu ? "واپس جائیں" : "Back"],
          cancelButtonIndex: reasons.length,
        },
        async (idx) => {
          if (idx === reasons.length) return;
          await doCancelRide(reasons[idx]!);
        }
      );
    } else {
      Alert.alert(
        isUrdu ? "منسوخی کی وجہ" : "Reason for cancelling",
        undefined,
        [
          ...reasons.map((r) => ({ text: r, onPress: () => doCancelRide(r) })),
          { text: isUrdu ? "واپس جائیں" : "Back", style: "cancel" as const },
        ]
      );
    }
  };

  const doCancelRide = async (reason: string) => {
    try { await cancelMutation.mutateAsync({ rideId }); } catch {}
    queryClient.clear();
    setActiveRide(null);
    router.replace("/(tabs)/home");
  };

  const startRide = async () => {
    setStartingRide(true);
    try {
      await customFetch(`/api/rides/${rideId}/start`, { method: "PUT" });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refetchActive();
    } catch {
      Alert.alert(t("error"), isUrdu ? "سواری شروع نہیں ہو سکی" : "Could not start ride.");
    } finally {
      setStartingRide(false);
    }
  };

  const completeRide = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await completeMutation.mutateAsync({ rideId });
      queryClient.clear();
      setActiveRide(null);
      router.replace({ pathname: "/trip-summary", params: { rideId } });
    } catch {
      Alert.alert(t("error"), "Could not complete ride.");
    }
  };

  const openChat = () => {
    router.push({
      pathname: "/chat",
      params: {
        rideId,
        partnerName: partnerName ?? (isDriver
          ? ((ride as any).riderName ?? "Rider")
          : (ride.driverName ?? "Driver")),
      },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.mapArea}>
        <LeafletMap
          ref={mapRef}
          pickupAddress={ride.pickup}
          dropoffAddress={ride.dropoff}
          mode="tracking"
          vehicleType={(activeRide as any)?.vehicleType ?? user?.vehicleType ?? "car"}
          driverLat={driverLat}
          driverLng={driverLng}
          pickupLat={pickupLat}
          pickupLng={pickupLng}
          tripStarted={tripStarted}
          style={{ flex: 1 }}
        />
        <View style={[styles.pkFlag, { top: 8, right: 8, backgroundColor: colors.card + "CC" }]}>
          <Text>🇵🇰</Text>
        </View>
        {isDriver && rideId && (
          <View style={[styles.liveIndicator, { backgroundColor: "#EF4444E6" }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE GPS</Text>
          </View>
        )}
      </View>

      <View style={[styles.headerOverlay, { paddingTop: topPad + 8, paddingHorizontal: 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
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
              {driverDistKm !== null && !isDriver
                ? `${driverDistKm} km`
                : (tripStarted ? (isUrdu ? "سفر" : "Enroute") : (isDriver ? "Live" : ride.eta))}
            </Text>
            <Text style={[styles.etaLabel, { color: colors.mutedForeground }]}>
              {driverDistKm !== null && !isDriver
                ? (isUrdu ? "ڈرائیور کا فاصلہ" : "Driver Distance")
                : (tripStarted ? (isUrdu ? "منزل کی طرف" : "To Destination") : (isDriver ? "GPS Active" : t("eta")))}
            </Text>
          </View>
          <View style={[styles.boltBtn, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name={isDriver ? "navigate" : "flash"} size={20} color={colors.primary} />
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
              <Text style={styles.avatarText}>
                {isDriver
                  ? (ride as any).riderName?.charAt(0) ?? "R"
                  : ride.driverName?.charAt(0) ?? "D"}
              </Text>
            </LinearGradient>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: colors.foreground }]}>
                {isDriver
                  ? ((ride as any).riderName ?? (partnerName ?? (isUrdu ? "مسافر" : "Rider")))
                  : (ride.driverName ?? (partnerName ?? "Driver"))}
              </Text>
              <Text style={[styles.driverRole, { color: colors.mutedForeground }]}>
                {isDriver ? (isUrdu ? "تصدیق شدہ مسافر" : "Verified Rider") : t("verifiedDriver")}
              </Text>
            </View>
            <View style={[styles.ratingBadge, { backgroundColor: "#F59E0B15" }]}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: colors.foreground }]}>
                {ride.driverRating ?? 4.9}
              </Text>
            </View>
          </View>

          <View style={[styles.carInfo, { backgroundColor: colors.surfaceContainerLow }]}>
            <View>
              <Text style={[styles.carModel, { color: colors.foreground }]}>
                {isDriver
                  ? (isUrdu ? "سواری قبول کی" : "Ride Accepted")
                  : (ride.carModel?.split("•")[0]?.trim() ?? "Suzuki Alto")}
              </Text>
              <Text style={[styles.carDetail, { color: colors.mutedForeground }]}>
                Rs {ride.fare?.toFixed(0)} • {t("fare")}
              </Text>
            </View>
            {!isDriver && (
              <View style={[styles.plateBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.plateText, { color: colors.foreground }]}>
                  {(ride as any).carPlate ?? "LHR-2024"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actions}>
          {/* CALL BUTTON */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#10B98120" }]}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={22} color="#10B981" />
            <Text style={[styles.actionLabel, { color: "#10B981" }]}>{isUrdu ? "کال" : "Call"}</Text>
          </TouchableOpacity>

          {/* CHAT BUTTON */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + "20" }]}
            onPress={openChat}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble" size={22} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.primary }]}>{isUrdu ? "چیٹ" : "Chat"}</Text>
          </TouchableOpacity>

          {!isDriver && !tripStarted && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.destructive + "20" }]}
              onPress={cancelRide}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={22} color={colors.destructive} />
              <Text style={[styles.actionLabel, { color: colors.destructive }]}>{t("cancel")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DRIVER: Arrived → Start Ride */}
        {isDriver && !tripStarted && (
          <TouchableOpacity onPress={startRide} disabled={startingRide} activeOpacity={0.85}>
            <LinearGradient
              colors={["#F59E0B", "#EF4444"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.completeBtn}
            >
              {startingRide
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="navigate" size={20} color="#fff" />
                    <Text style={styles.completeBtnText}>{isUrdu ? "پہنچ گیا — سواری شروع کریں" : "Arrived — Start Ride"}</Text>
                  </>}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* DRIVER: Complete Trip */}
        {isDriver && tripStarted && (
          <TouchableOpacity onPress={completeRide} disabled={completeMutation.isPending} activeOpacity={0.85}>
            <LinearGradient
              colors={["#10B981", "#2170E4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.completeBtn}
            >
              {completeMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Text style={styles.completeBtnText}>{t("completeTrip")}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </>}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* RIDER: Status banner */}
        {!isDriver && !tripStarted && (
          <View style={[styles.riderWaitBanner, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="navigate-circle" size={20} color={colors.primary} />
            <Text style={[styles.riderWaitText, { color: colors.primary }]}>
              {isUrdu ? "ڈرائیور آپ کی طرف آ رہا ہے" : "Driver is heading to your location"}
            </Text>
          </View>
        )}
        {!isDriver && tripStarted && (
          <View style={[styles.riderWaitBanner, { backgroundColor: "#10B98112" }]}>
            <Ionicons name="car" size={18} color="#10B981" />
            <Text style={[styles.riderWaitText, { color: "#10B981" }]}>
              {isUrdu ? "سفر جاری ہے — منزل تک پہنچ رہے ہیں" : "Trip in progress — heading to destination"}
            </Text>
          </View>
        )}

        <View style={{ height: botPad + 8 }} />
      </View>
    </View>
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapArea: { flex: 1, position: "relative", overflow: "hidden" },
  pkFlag: { position: "absolute", padding: 6, borderRadius: 10, flexDirection: "row", alignItems: "center", zIndex: 10 },
  liveIndicator: { position: "absolute", bottom: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, zIndex: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff", opacity: 0.9 },
  liveText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  headerOverlay: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  tripStatusPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tripDot: { width: 6, height: 6, borderRadius: 3 },
  tripStatusText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  etaCard: { position: "absolute", left: 12, right: 12, borderRadius: 20, padding: 16, gap: 10, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  etaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  etaNum: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  etaLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase" },
  boltBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  bottomSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 24, elevation: 8 },
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
  completeBtn: { height: 56, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 },
  completeBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  riderWaitBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 14, justifyContent: "center" },
  riderWaitText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
