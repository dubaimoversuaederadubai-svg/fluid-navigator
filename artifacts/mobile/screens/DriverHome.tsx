import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteConnector } from "@/components/RouteConnector";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  useListRides,
  useSetOnlineStatus,
  useGetActiveRide,
  useGetRideHistory,
} from "@workspace/api-client-react";
import { router } from "expo-router";

export default function DriverHome() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, setActiveRide, activeRide } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: ridesData, refetch: refetchRides } = useListRides(
    { status: "searching" },
    { query: { refetchInterval: 8000, enabled: !!user?.isOnline } }
  );

  const { data: historyData } = useGetRideHistory();
  const setOnlineMutation = useSetOnlineStatus();

  const { data: activeRideData } = useGetActiveRide({
    query: { refetchInterval: 5000 },
  });

  React.useEffect(() => {
    if (activeRideData?.ride) {
      const r = activeRideData.ride;
      setActiveRide({
        id: r.id,
        driverName: r.driverName ?? user?.name ?? "ڈرائیور",
        driverRating: r.driverRating ?? user?.rating ?? 4.9,
        carModel: r.carModel ?? "Suzuki Alto",
        carPlate: "LHR-2024",
        status: r.status as any,
        pickup: r.pickup,
        dropoff: r.dropoff,
        fare: r.finalFare ?? r.offeredFare,
        eta: "4 منٹ",
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
    await setOnlineMutation.mutateAsync({ data: { isOnline: val } });
  };

  const incoming = ridesData?.rides ?? [];
  const earnings = historyData?.trips.reduce((sum, t) => sum + t.fare, 0) ?? 0;

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
              {user?.isOnline ? "آن لائن" : "آف لائن"}
            </Text>
            <View style={[styles.onlineDot, { backgroundColor: user?.isOnline ? colors.primary : colors.mutedForeground }]} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.topLabel, { color: colors.mutedForeground }]}>السلام علیکم،</Text>
            <Text style={[styles.topName, { color: colors.foreground }]}>{user?.name ?? "ڈرائیور"}</Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={["#10B981", "#2170E4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.withdrawBtn}
            >
              <Text style={styles.withdrawText}>نکالیں</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.earningsLabel, { color: colors.mutedForeground }]}>کل کمائی</Text>
            <Text style={[styles.earningsValue, { color: colors.foreground }]}>
              Rs {earnings.toFixed(0)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => refetchRides()} style={[styles.refreshBtn, { backgroundColor: colors.surfaceContainerLow }]}>
            <Ionicons name="refresh" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.liveLabel, { color: colors.primary }]}>لائیو</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>آنے والی سواریاں</Text>
          </View>
        </View>

        {!user?.isOnline ? (
          <View style={styles.empty}>
            <Ionicons name="power" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              سواریاں وصول کرنے کے لیے آن لائن ہوں
            </Text>
          </View>
        ) : incoming.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>سواری کا انتظار ہے...</Text>
          </View>
        ) : (
          incoming.map((req) => (
            <RequestCard key={req.id} req={req} colors={colors} />
          ))
        )}

        <Text style={[styles.sectionTitle2, { color: colors.foreground, marginTop: 24, marginBottom: 12 }]}>
          اعداد و شمار
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.miniStat, { backgroundColor: colors.card }]}>
            <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{user?.totalRides ?? 0}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>سواریاں</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: colors.card }]}>
            <Text style={[styles.miniStatValue, { color: colors.primary }]}>{user?.rating ?? "5.0"}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>ریٹنگ</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: colors.card }]}>
            <Text style={[styles.miniStatValue, { color: colors.secondary }]}>Rs {earnings.toFixed(0)}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>کمائی</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function RequestCard({ req, colors }: { req: any; colors: any }) {
  const { setActiveRide } = useApp();

  const handleAccept = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const bidsModule = await import("@workspace/api-client-react");
      const bid = await bidsModule.createBid(req.id, { amount: req.offeredFare, eta: "5 منٹ" });
      const ride = await bidsModule.acceptBid(req.id, bid.bid.id);
      const r = ride.ride;
      setActiveRide({
        id: r.id,
        driverName: r.driverName ?? "ڈرائیور",
        driverRating: r.driverRating ?? 4.9,
        carModel: r.carModel ?? "Suzuki Alto",
        carPlate: "LHR-2024",
        status: r.status as any,
        pickup: r.pickup,
        dropoff: r.dropoff,
        fare: r.finalFare ?? r.offeredFare,
        eta: "4 منٹ",
        distance: r.distance,
        duration: r.duration,
        riderId: r.riderId,
        riderName: r.riderName,
      });
      router.replace("/ride-tracking");
    } catch (e) {
      console.error("Accept failed", e);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.fareAmt, { color: colors.primary }]}>Rs {req.offeredFare.toFixed(0)}</Text>
          <Text style={[styles.fareLabel, { color: colors.mutedForeground }]}>مسافر کا کرایہ</Text>
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

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={handleAccept} activeOpacity={0.85} style={{ flex: 1 }}>
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.acceptBtn}
          >
            <Text style={styles.acceptText}>قبول کریں</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.declineBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.declineText, { color: colors.foreground }]}>رد کریں</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topGrad: { paddingHorizontal: 20, paddingBottom: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  topLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  topName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  actionRow: { flexDirection: "row", gap: 10 },
  declineBtn: { flex: 1, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  declineText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  acceptBtn: { height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  acceptText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
