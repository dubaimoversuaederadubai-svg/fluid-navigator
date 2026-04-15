import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { RouteConnector } from "@/components/RouteConnector";
import { useApp } from "@/context/AppContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import {
  useListRides,
  useSetOnlineStatus,
  useGetActiveRide,
  useGetRideHistory,
  customFetch,
  createBid,
} from "@workspace/api-client-react";

export default function DriverHome() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, setActiveRide, activeRide } = useApp();
  const { t, isUrdu } = useLang();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setDriverLat(loc.coords.latitude);
        setDriverLng(loc.coords.longitude);
      } catch {}
    };

    getLocation();
    locationIntervalRef.current = setInterval(getLocation, 30000);
    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, []);

  const rideParams: any = { status: "searching" };
  if (driverLat !== null && driverLng !== null) {
    rideParams.lat = driverLat.toString();
    rideParams.lng = driverLng.toString();
    rideParams.radius = "1.0";
  }

  const { data: ridesData, refetch: refetchRides } = useListRides(rideParams, {
    query: { refetchInterval: 8000, enabled: !!user?.isOnline },
  });

  const { data: historyData } = useGetRideHistory();
  const setOnlineMutation = useSetOnlineStatus();

  const { data: activeRideData } = useGetActiveRide({
    query: { refetchInterval: 5000, enabled: !activeRide },
  });

  useEffect(() => {
    if (activeRideData?.ride) {
      const r = activeRideData.ride;
      setActiveRide({
        id: r.id,
        driverName: r.driverName ?? user?.name ?? "Driver",
        driverRating: r.driverRating ?? user?.rating ?? 4.9,
        carModel: r.carModel ?? "Suzuki Alto",
        carPlate: (r as any).carPlate ?? "LHR-2024",
        status: r.status as any,
        pickup: r.pickup,
        dropoff: r.dropoff,
        fare: r.finalFare ?? r.offeredFare,
        eta: isUrdu ? "4 منٹ" : "4 min",
        distance: r.distance,
        duration: r.duration,
        riderId: r.riderId,
        riderName: r.riderName,
      });
    }
  }, [activeRideData?.ride]);

  if (activeRide) {
    router.replace("/ride-tracking");
    return null;
  }

  const toggleOnline = async (val: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await setOnlineMutation.mutateAsync({ data: { isOnline: val } });
    } catch {}
  };

  const incoming = ridesData?.rides ?? [];
  const earnings = historyData?.trips.reduce((sum, trip) => sum + trip.fare, 0) ?? 0;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 90 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#10B981" + "20", "#2170E4" + "10"]}
        style={[styles.topGrad, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.topRow}>
          <View style={styles.onlineRow}>
            <Switch
              value={!!user?.isOnline}
              onValueChange={toggleOnline}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
            <Text style={[styles.onlineText, { color: user?.isOnline ? colors.primary : colors.mutedForeground }]}>
              {user?.isOnline ? t("onlineStatus") : t("offlineStatus")}
            </Text>
            <View style={[styles.onlineDot, { backgroundColor: user?.isOnline ? colors.primary : colors.mutedForeground }]} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.topLabel, { color: colors.mutedForeground }]}>{t("hello")}</Text>
            <Text style={[styles.topName, { color: colors.foreground }]}>{user?.name ?? "Driver"}</Text>
          </View>
        </View>

        {driverLat && (
          <View style={[styles.gpsRow, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="locate" size={13} color={colors.primary} />
            <Text style={[styles.gpsText, { color: colors.primary }]}>
              {isUrdu ? "GPS فعال — 1km رداس میں سواریاں" : "GPS active — rides within 1km radius"}
            </Text>
          </View>
        )}

        <View style={styles.earningsCard}>
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={["#10B981", "#2170E4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.withdrawBtn}
            >
              <Text style={styles.withdrawText}>{t("withdraw")}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.earningsLabel, { color: colors.mutedForeground }]}>{t("totalEarnings")}</Text>
            <Text style={[styles.earningsValue, { color: colors.foreground }]}>
              Rs {earnings.toFixed(0)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity
            onPress={() => refetchRides()}
            style={[styles.refreshBtn, { backgroundColor: colors.surfaceContainerLow }]}
          >
            <Ionicons name="refresh" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.liveLabel, { color: colors.primary }]}>{t("liveBids")}</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("incoming")}</Text>
          </View>
        </View>

        {!user?.isOnline ? (
          <View style={styles.empty}>
            <Ionicons name="power" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {t("goOnline")}
            </Text>
          </View>
        ) : incoming.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {driverLat
                ? (isUrdu ? "1km دائرے میں کوئی سواری نہیں" : "No rides within 1km radius")
                : t("waitingRide")}
            </Text>
            {driverLat && (
              <TouchableOpacity
                onPress={() => {
                  const p: any = { ...rideParams };
                  delete p.lat; delete p.lng; delete p.radius;
                }}
                style={[styles.expandBtn, { backgroundColor: colors.surfaceContainerLow }]}
              >
                <Text style={[styles.expandBtnText, { color: colors.mutedForeground }]}>
                  {isUrdu ? "تمام سواریاں دیکھیں" : "Show all rides"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          incoming.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              colors={colors}
              queryClient={queryClient}
              isUrdu={isUrdu}
              t={t}
              setActiveRide={setActiveRide}
            />
          ))
        )}

        <Text style={[styles.sectionTitle2, { color: colors.foreground, marginTop: 24, marginBottom: 12, textAlign: "right" }]}>
          {t("stats")}
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.miniStat, { backgroundColor: colors.card }]}>
            <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{user?.totalRides ?? 0}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>{t("rides")}</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: colors.card }]}>
            <Text style={[styles.miniStatValue, { color: colors.primary }]}>{user?.rating ?? "5.0"}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>{t("rating")}</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: colors.card }]}>
            <Text style={[styles.miniStatValue, { color: colors.secondary }]}>Rs {earnings.toFixed(0)}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>{t("earnings")}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function RequestCard({
  req, colors, queryClient, isUrdu, t, setActiveRide,
}: {
  req: any; colors: any; queryClient: any; isUrdu: boolean; t: any;
  setActiveRide: (r: any) => void;
}) {
  const [declined, setDeclined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counterModal, setCounterModal] = useState(false);
  const [counterAmount, setCounterAmount] = useState(req.offeredFare?.toString() ?? "");
  const [counterSent, setCounterSent] = useState(false);

  if (declined) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result: any = await customFetch(`/api/rides/${req.id}/driver-accept`, {
        method: "PUT",
        body: JSON.stringify({
          amount: req.offeredFare,
          eta: isUrdu ? "5 منٹ" : "5 min",
        }),
      });
      const r = result.ride;
      queryClient.clear();
      setActiveRide({
        id: r.id,
        driverName: r.driverName ?? "Driver",
        driverRating: r.driverRating ?? 4.9,
        carModel: r.carModel ?? "Suzuki Alto",
        carPlate: r.carPlate ?? "LHR-2024",
        status: r.status,
        pickup: r.pickup,
        dropoff: r.dropoff,
        fare: r.finalFare ?? r.offeredFare,
        eta: isUrdu ? "4 منٹ" : "4 min",
        distance: r.distance,
        duration: r.duration,
        riderId: r.riderId,
        riderName: r.riderName,
      });
      router.replace("/ride-tracking");
    } catch (e: any) {
      const msg = e?.data?.error ?? e?.message ?? "Error";
      Alert.alert(isUrdu ? "خرابی" : "Error", msg);
    }
    setLoading(false);
  };

  const handleCounterOffer = async () => {
    const amount = parseFloat(counterAmount);
    if (!amount || isNaN(amount) || amount < 50) {
      Alert.alert(
        isUrdu ? "رقم غلط ہے" : "Invalid Amount",
        isUrdu ? "کم از کم Rs 50 ہونا چاہیے" : "Minimum Rs 50 required"
      );
      return;
    }
    setLoading(true);
    try {
      await createBid(req.id, {
        amount,
        eta: isUrdu ? "5 منٹ" : "5 min",
      });
      setCounterModal(false);
      setCounterSent(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: [`/api/rides/${req.id}/bids`] });
    } catch (e: any) {
      const msg = e?.data?.error ?? e?.message ?? "Error";
      Alert.alert(isUrdu ? "خرابی" : "Error", msg);
    }
    setLoading(false);
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.fareAmt, { color: colors.primary }]}>Rs {req.offeredFare?.toFixed(0)}</Text>
            <Text style={[styles.fareLabel, { color: colors.mutedForeground }]}>
              {isUrdu ? "مسافر کا کرایہ" : "Rider's Fare"}
            </Text>
          </View>
          <View style={styles.riderRow}>
            <View>
              <Text style={[styles.riderName, { color: colors.foreground }]}>{req.riderName}</Text>
              <View style={styles.ratingRow}>
                <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>{req.riderRating}</Text>
                <Ionicons name="star" size={11} color="#10B981" />
              </View>
            </View>
            <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.riderAvatar}>
              <Text style={styles.riderAvatarText}>{(req.riderName ?? "?").charAt(0)}</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.routeSection}>
          <RouteConnector pickup={req.pickup} dropoff={req.dropoff} />
        </View>

        <View style={styles.statsRow2}>
          {req.distance ? (
            <View style={styles.stat}>
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>{req.distance}</Text>
              <Ionicons name="speedometer-outline" size={13} color={colors.mutedForeground} />
            </View>
          ) : null}
          {req.duration ? (
            <View style={styles.stat}>
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>{req.duration}</Text>
              <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
            </View>
          ) : null}
        </View>

        {counterSent && (
          <View style={[styles.counterSentBanner, { backgroundColor: "#10B981" + "15" }]}>
            <Ionicons name="checkmark-circle" size={15} color="#10B981" />
            <Text style={[styles.counterSentText, { color: "#10B981" }]}>
              {isUrdu ? `آپ کی بولی Rs ${counterAmount} بھیج دی گئی — مسافر کا انتظار` : `Your bid Rs ${counterAmount} sent — waiting for rider`}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          {!counterSent && (
            <TouchableOpacity
              onPress={handleAccept}
              activeOpacity={0.85}
              style={{ flex: 1 }}
              disabled={loading}
            >
              <LinearGradient
                colors={["#10B981", "#2170E4"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.acceptBtn, { opacity: loading ? 0.6 : 1 }]}
              >
                <Text style={styles.acceptText}>
                  {loading ? "..." : (isUrdu ? "قبول کریں" : "Accept")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {!counterSent && (
            <TouchableOpacity
              style={[styles.counterBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => { setCounterModal(true); setCounterAmount(req.offeredFare?.toString() ?? ""); }}
              disabled={loading}
            >
              <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
              <Text style={[styles.counterText, { color: colors.primary }]}>
                {isUrdu ? "اپنا کرایہ" : "Counter"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.declineBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            activeOpacity={0.8}
            onPress={() => setDeclined(true)}
          >
            <Text style={[styles.declineText, { color: colors.foreground }]}>
              {isUrdu ? "رد کریں" : "Decline"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={counterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCounterModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {isUrdu ? "اپنا کرایہ پیش کریں" : "Make Counter Offer"}
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              {isUrdu
                ? `مسافر کا کرایہ: Rs ${req.offeredFare}`
                : `Rider's fare: Rs ${req.offeredFare}`}
            </Text>

            <View style={[styles.fareInputRow, { backgroundColor: colors.surfaceContainerHighest }]}>
              <Text style={[styles.rsLabel, { color: colors.mutedForeground }]}>Rs</Text>
              <TextInput
                style={[styles.fareInput, { color: colors.foreground }]}
                value={counterAmount}
                onChangeText={setCounterAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, { backgroundColor: colors.surfaceContainerLow }]}
                onPress={() => setCounterModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>
                  {isUrdu ? "واپس" : "Cancel"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCounterOffer}
                disabled={loading}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={["#10B981", "#2170E4"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.modalConfirm, { opacity: loading ? 0.6 : 1 }]}
                >
                  <Text style={styles.modalConfirmText}>
                    {loading ? "..." : (isUrdu ? "بھیجیں" : "Send Bid")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topGrad: { paddingHorizontal: 20, paddingBottom: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  topLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  topName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  gpsRow: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 },
  gpsText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  earningsCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 20, padding: 16,
  },
  earningsLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  earningsValue: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  withdrawBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  withdrawText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  liveLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase" },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sectionTitle2: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  expandBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 4 },
  expandBtnText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  riderAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  riderAvatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  riderName: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2, justifyContent: "flex-end" },
  ratingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fareAmt: { fontSize: 22, fontFamily: "Inter_700Bold" },
  fareLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  routeSection: { marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 12 },
  statsRow2: { flexDirection: "row", gap: 16, marginBottom: 14, justifyContent: "flex-end" },
  miniStat: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  miniStatValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  miniStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.8 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  declineBtn: { paddingHorizontal: 14, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  declineText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  acceptBtn: { height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  acceptText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  counterBtn: { paddingHorizontal: 12, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, borderWidth: 1 },
  counterText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  counterSentBanner: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, padding: 10, marginBottom: 10 },
  counterSentText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "85%", borderRadius: 24, padding: 24, gap: 16, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -8 },
  fareInputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4 },
  rsLabel: { fontSize: 18, fontFamily: "Inter_700Bold", marginRight: 8 },
  fareInput: { flex: 1, fontSize: 32, fontFamily: "Inter_700Bold", paddingVertical: 12 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalConfirm: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalConfirmText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
