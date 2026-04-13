import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteConnector } from "@/components/RouteConnector";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useCreateRide, useListBids, useAcceptBid } from "@workspace/api-client-react";

export default function FareNegotiationScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { setActiveRide } = useApp();
  const params = useLocalSearchParams<{ pickup?: string; dropoff?: string }>();
  const [myFare, setMyFare] = useState(500);
  const [rideId, setRideId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pickup = params.pickup ?? "گلبرگ، لاہور";
  const dropoff = params.dropoff ?? "ایئرپورٹ، لاہور";

  const createRideMutation = useCreateRide();
  const { data: bidsData, refetch: refetchBids } = useListBids(
    rideId ?? "",
    { query: { enabled: !!rideId, refetchInterval: 5000 } }
  );
  const acceptBidMutation = useAcceptBid();

  const adjustFare = (delta: number) => {
    setMyFare((prev) => Math.max(100, prev + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const postRide = async () => {
    try {
      const resp = await createRideMutation.mutateAsync({
        data: { pickup, dropoff, offeredFare: myFare, distance: "15 کلومیٹر", duration: "30 منٹ" },
      });
      setRideId(resp.ride.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("خرابی", "سواری پوسٹ نہیں ہو سکی۔ دوبارہ کوشش کریں۔");
    }
  };

  const handleAcceptBid = async (bidId: string, bid: any) => {
    if (!rideId) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const resp = await acceptBidMutation.mutateAsync({ rideId, bidId });
      const r = resp.ride;
      setActiveRide({
        id: r.id,
        driverName: r.driverName ?? bid.driverName,
        driverRating: r.driverRating ?? bid.driverRating,
        carModel: r.carModel ?? "Suzuki Alto",
        carPlate: "LHR-2024",
        status: "accepted",
        pickup: r.pickup,
        dropoff: r.dropoff,
        fare: r.finalFare ?? r.offeredFare,
        eta: bid.eta,
        distance: r.distance,
        duration: r.duration,
        driverId: r.driverId ?? undefined,
        riderId: r.riderId,
      });
      router.replace("/ride-tracking");
    } catch {
      Alert.alert("خرابی", "بولی قبول نہیں ہو سکی۔");
    }
  };

  const bids = bidsData?.bids ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceContainerLow }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>کرایہ طے کریں</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20 }}
      >
        <View style={[styles.fareCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.fareCardTitle, { color: colors.foreground }]}>اپنا کرایہ طے کریں</Text>
          <Text style={[styles.fareCardSub, { color: colors.mutedForeground }]}>
            کرایہ لکھیں — ڈرائیور اپنی بولی دیں گے
          </Text>

          <View style={styles.fareInputRow}>
            <TouchableOpacity
              onPress={() => adjustFare(-50)}
              style={[styles.fareBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Ionicons name="remove" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.fareDisplay}>
              <Text style={[styles.fareCurrency, { color: colors.primary }]}>Rs</Text>
              <Text style={[styles.fareAmount, { color: colors.foreground }]}>{myFare}</Text>
            </View>
            <TouchableOpacity
              onPress={() => adjustFare(50)}
              style={[styles.fareBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Ionicons name="add" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.routeBox, { backgroundColor: colors.surfaceContainerLow }]}>
            <RouteConnector pickup={pickup} dropoff={dropoff} />
          </View>

          <TouchableOpacity
            onPress={rideId ? refetchBids : postRide}
            disabled={createRideMutation.isPending}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#10B981", "#2170E4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.updateBtn}
            >
              {createRideMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.updateBtnText}>
                  {rideId ? "بولیاں تازہ کریں" : "سواری پوسٹ کریں"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {rideId && (
            <View style={[styles.postedBadge, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={[styles.postedText, { color: colors.primary }]}>
                سواری پوسٹ ہو گئی — بولیوں کا انتظار ہے
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bidsSection}>
          <View style={styles.bidsHeader}>
            <View style={{ flex: 1 }}>
              {rideId && (
                <View style={[styles.livePill, { backgroundColor: colors.primary + "20" }]}>
                  <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.liveText, { color: colors.primary }]}>لائیو</Text>
                </View>
              )}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.bidsTitle, { color: colors.foreground }]}>
                {rideId ? "ڈرائیوروں کی بولیاں" : "قریبی ڈرائیور"}
              </Text>
              <Text style={[styles.bidsSub, { color: colors.mutedForeground }]}>
                {bids.length > 0
                  ? `${bids.length} ڈرائیور نے بولی دی`
                  : rideId ? "بولیوں کا انتظار ہے..." : "سواری پوسٹ کریں"}
              </Text>
            </View>
          </View>

          {bids.length === 0 && rideId && (
            <View style={styles.waitingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
                ڈرائیور آپ کی سواری دیکھ کر بولی دیں گے
              </Text>
            </View>
          )}

          {bids.map((bid) => (
            <BidCard
              key={bid.id}
              bid={bid}
              colors={colors}
              onAccept={() => handleAcceptBid(bid.id, bid)}
              loading={acceptBidMutation.isPending}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function BidCard({ bid, colors, onAccept, loading }: any) {
  return (
    <View style={[styles.bidCard, { backgroundColor: colors.card }]}>
      <View style={styles.bidTop}>
        <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>{bid.driverName?.charAt(0) ?? "ڈ"}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={[styles.driverName, { color: colors.foreground }]}>{bid.driverName}</Text>
          <View style={styles.ratingRow}>
            <Text style={[styles.ratingVal, { color: colors.foreground }]}>{bid.driverRating}</Text>
            <Ionicons name="star" size={12} color="#F59E0B" />
          </View>
          <Text style={[styles.carLabel, { color: colors.mutedForeground }]}>{bid.carModel}</Text>
          <View style={[styles.etaChip, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.etaChipText, { color: colors.primary }]}>وقت: {bid.eta}</Text>
          </View>
        </View>

        <View style={styles.bidPriceCol}>
          <Text style={[styles.bidPrice, { color: colors.primary }]}>Rs {bid.amount.toFixed(0)}</Text>
          <Text style={[styles.bidPriceLabel, { color: colors.mutedForeground }]}>بولی</Text>
        </View>
      </View>

      <View style={[styles.bidActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={onAccept} disabled={loading} activeOpacity={0.85} style={{ flex: 1 }}>
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.acceptBtn}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptText}>قبول کریں</Text>}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.rejectText, { color: colors.foreground }]}>رد کریں</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  fareCard: { borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 16, elevation: 3, gap: 14 },
  fareCardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "right" },
  fareCardSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "right" },
  fareInputRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  fareBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  fareDisplay: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  fareCurrency: { fontSize: 22, fontFamily: "Inter_700Bold" },
  fareAmount: { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  routeBox: { borderRadius: 16, padding: 14 },
  updateBtn: { height: 52, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  updateBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  postedBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, padding: 10, justifyContent: "center" },
  postedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bidsSection: { gap: 12 },
  bidsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  bidsTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  bidsSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  waitingState: { alignItems: "center", paddingVertical: 32, gap: 12 },
  waitingText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  bidCard: { borderRadius: 20, padding: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  bidTop: { flexDirection: "row", gap: 12, marginBottom: 14 },
  driverAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  driverAvatarText: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  driverName: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2, textAlign: "right" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 2, justifyContent: "flex-end" },
  ratingVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  carLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4, textAlign: "right" },
  etaChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-end" },
  etaChipText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  bidPriceCol: { alignItems: "flex-start", justifyContent: "center", gap: 2 },
  bidPrice: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  bidPriceLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  bidActions: { flexDirection: "row", gap: 10, borderTopWidth: 1, paddingTop: 12 },
  rejectBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rejectText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  acceptBtn: { height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  acceptText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
