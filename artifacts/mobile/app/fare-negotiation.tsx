import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { useCreateRide, useListBids, useAcceptBid } from "@workspace/api-client-react";
import LeafletMap, { MapMessage } from "@/components/LeafletMap";
import { VEHICLE_CONFIG, VehicleType, calculateFare, formatDistance, formatDuration } from "@/utils/fareCalc";

const { height } = Dimensions.get("window");

export default function FareNegotiationScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { setActiveRide } = useApp();
  const { t, isUrdu } = useLang();
  const params = useLocalSearchParams<{
    pickup?: string;
    dropoff?: string;
    vehicleType?: string;
    distanceKm?: string;
    durationMin?: string;
    suggestedFare?: string;
    pickupLat?: string;
    pickupLng?: string;
  }>();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pickup = params.pickup ?? (isUrdu ? "گلبرگ، لاہور" : "Gulberg, Lahore");
  const dropoff = params.dropoff ?? (isUrdu ? "ایئرپورٹ، لاہور" : "Airport, Lahore");
  const vehicleType = (params.vehicleType as VehicleType) ?? "car";
  const distanceKm = parseFloat(params.distanceKm ?? "0");
  const durationMin = parseInt(params.durationMin ?? "0");
  const suggested = parseInt(params.suggestedFare ?? "0");

  const vehicleCfg = VEHICLE_CONFIG[vehicleType];
  const [myFare, setMyFare] = useState(suggested > 0 ? suggested : vehicleCfg.minFare);
  const [rideId, setRideId] = useState<string | null>(null);
  const [routeKm, setRouteKm] = useState(distanceKm);

  const createRideMutation = useCreateRide();
  const { data: bidsData, refetch: refetchBids } = useListBids(
    rideId ?? "",
    { query: { enabled: !!rideId, refetchInterval: 5000 } }
  );
  const acceptBidMutation = useAcceptBid();

  const adjustFare = (delta: number) => {
    setMyFare((prev) => Math.max(vehicleCfg.minFare, prev + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMapMessage = (msg: MapMessage) => {
    if (msg.type === "distance" && msg.distanceKm) {
      setRouteKm(msg.distanceKm);
      const newFare = calculateFare(msg.distanceKm, vehicleType);
      setMyFare(newFare);
    }
  };

  const postRide = async () => {
    try {
      const km = routeKm > 0 ? routeKm : distanceKm;
      const pLat = params.pickupLat ? parseFloat(params.pickupLat) : undefined;
      const pLng = params.pickupLng ? parseFloat(params.pickupLng) : undefined;
      const resp = await createRideMutation.mutateAsync({
        data: {
          pickup,
          dropoff,
          offeredFare: myFare,
          distance: km > 0 ? `${km.toFixed(1)} ${isUrdu ? "کلومیٹر" : "km"}` : "",
          duration: durationMin > 0 ? formatDuration(durationMin) : "",
          ...(pLat && pLng ? { pickupLat: pLat, pickupLng: pLng } : {}),
          vehicleType,
        } as any,
      });
      setRideId(resp.ride.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(t("error"), isUrdu ? "سواری پوسٹ نہیں ہو سکی۔" : "Could not post ride.");
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
        carModel: r.carModel ?? `${vehicleCfg.emoji} ${isUrdu ? vehicleCfg.label : vehicleCfg.labelEn}`,
        carPlate: (r as any).carPlate ?? "LHR-2024",
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
      Alert.alert(t("error"), isUrdu ? "بولی قبول نہیں ہو سکی۔" : "Could not accept bid.");
    }
  };

  const bids = bidsData?.bids ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceContainerLow }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.vehicleEmoji}>{vehicleCfg.emoji}</Text>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {isUrdu ? vehicleCfg.label : vehicleCfg.labelEn}
            </Text>
            {routeKm > 0 && (
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                {formatDistance(routeKm)}  •  {durationMin > 0 ? formatDuration(durationMin) : ""}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.minFareBadge, { backgroundColor: vehicleCfg.color + "15" }]}>
          <Text style={[styles.minFareText, { color: vehicleCfg.color }]}>
            {isUrdu ? `کم از کم Rs ${vehicleCfg.minFare}` : `Min Rs ${vehicleCfg.minFare}`}
          </Text>
        </View>
      </View>

      <View style={styles.mapArea}>
        <LeafletMap
          pickupAddress={pickup}
          dropoffAddress={dropoff}
          mode="picker"
          vehicleType={vehicleType}
          onMessage={handleMapMessage}
          style={{ flex: 1 }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20 }}
      >
        <View style={[styles.fareCard, { backgroundColor: colors.card }]}>
          <View style={styles.fareCardHeader}>
            <Text style={[styles.fareCardTitle, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>
              {isUrdu ? "اپنا کرایہ طے کریں" : "Set Your Fare"}
            </Text>
            <View style={[styles.perKmBadge, { backgroundColor: vehicleCfg.color + "15" }]}>
              <Text style={[styles.perKmText, { color: vehicleCfg.color }]}>
                Rs {vehicleCfg.perKm}/{isUrdu ? "کلومیٹر" : "km"}
              </Text>
            </View>
          </View>

          <View style={styles.fareInputRow}>
            <TouchableOpacity
              onPress={() => adjustFare(-10)}
              style={[styles.fareBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Ionicons name="remove" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.fareDisplay}>
              <Text style={[styles.fareCurrency, { color: vehicleCfg.color }]}>Rs</Text>
              <Text style={[styles.fareAmount, { color: colors.foreground }]}>{myFare}</Text>
            </View>
            <TouchableOpacity
              onPress={() => adjustFare(10)}
              style={[styles.fareBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Ionicons name="add" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.routeBox, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={styles.routeRow}>
              <Ionicons name="navigate-circle" size={18} color="#10B981" />
              <Text style={[styles.routeText, { color: colors.foreground, textAlign: isUrdu ? "right" : "left", flex: 1 }]} numberOfLines={1}>
                {pickup}
              </Text>
            </View>
            <View style={[styles.routeDivider, { backgroundColor: colors.border }]} />
            <View style={styles.routeRow}>
              <Ionicons name="location" size={18} color="#EF4444" />
              <Text style={[styles.routeText, { color: colors.foreground, textAlign: isUrdu ? "right" : "left", flex: 1 }]} numberOfLines={1}>
                {dropoff}
              </Text>
            </View>
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
                  {rideId
                    ? (isUrdu ? "بولیاں تازہ کریں" : "Refresh Bids")
                    : (isUrdu ? "سواری پوسٹ کریں" : "Post Ride")}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {rideId && (
            <View style={[styles.postedBadge, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={[styles.postedText, { color: colors.primary }]}>
                {isUrdu ? "سواری پوسٹ ہو گئی — بولیوں کا انتظار ہے" : "Ride posted — waiting for bids"}
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
                  <Text style={[styles.liveText, { color: colors.primary }]}>
                    {isUrdu ? "لائیو" : "LIVE"}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ alignItems: isUrdu ? "flex-end" : "flex-start" }}>
              <Text style={[styles.bidsTitle, { color: colors.foreground }]}>
                {rideId ? (isUrdu ? "ڈرائیوروں کی بولیاں" : "Driver Bids") : (isUrdu ? "قریبی ڈرائیور" : "Nearby Drivers")}
              </Text>
              <Text style={[styles.bidsSub, { color: colors.mutedForeground }]}>
                {bids.length > 0
                  ? `${bids.length} ${isUrdu ? "ڈرائیور نے بولی دی" : "drivers bid"}`
                  : rideId
                    ? (isUrdu ? "بولیوں کا انتظار ہے..." : "Waiting for bids...")
                    : (isUrdu ? "سواری پوسٹ کریں" : "Post ride to get bids")}
              </Text>
            </View>
          </View>

          {bids.length === 0 && rideId && (
            <View style={styles.waitingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
                {isUrdu ? "ڈرائیور آپ کی سواری دیکھ کر بولی دیں گے" : "Drivers will bid on your ride"}
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
              isUrdu={isUrdu}
              vehicleCfg={vehicleCfg}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function BidCard({ bid, colors, onAccept, loading, isUrdu, vehicleCfg }: any) {
  return (
    <View style={[styles.bidCard, { backgroundColor: colors.card }]}>
      <View style={styles.bidTop}>
        <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>{bid.driverName?.charAt(0) ?? "D"}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={[styles.driverName, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>{bid.driverName}</Text>
          <View style={[styles.ratingRow, { justifyContent: isUrdu ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.ratingVal, { color: colors.foreground }]}>{bid.driverRating}</Text>
            <Ionicons name="star" size={12} color="#F59E0B" />
          </View>
          <Text style={[styles.carLabel, { color: colors.mutedForeground, textAlign: isUrdu ? "right" : "left" }]}>
            {vehicleCfg.emoji} {bid.carModel ?? (isUrdu ? vehicleCfg.label : vehicleCfg.labelEn)}
          </Text>
          <View style={[styles.etaChip, { backgroundColor: colors.primary + "15", alignSelf: isUrdu ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.etaChipText, { color: colors.primary }]}>
              {isUrdu ? "وقت:" : "ETA:"} {bid.eta}
            </Text>
          </View>
        </View>

        <View style={styles.bidPriceCol}>
          <Text style={[styles.bidPrice, { color: colors.primary }]}>Rs {bid.amount.toFixed(0)}</Text>
          <Text style={[styles.bidPriceLabel, { color: colors.mutedForeground }]}>
            {isUrdu ? "بولی" : "Bid"}
          </Text>
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
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.acceptText}>{isUrdu ? "قبول کریں" : "Accept"}</Text>}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.rejectText, { color: colors.foreground }]}>{isUrdu ? "رد کریں" : "Decline"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, gap: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 3,
  },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  vehicleEmoji: { fontSize: 28 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  minFareBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  minFareText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  mapArea: { height: height * 0.28, overflow: "hidden" },
  fareCard: { borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 16, elevation: 3, gap: 14 },
  fareCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareCardTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  perKmBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  perKmText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  fareInputRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  fareBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  fareDisplay: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  fareCurrency: { fontSize: 22, fontFamily: "Inter_700Bold" },
  fareAmount: { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  routeBox: { borderRadius: 16, padding: 14, gap: 8 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  routeDivider: { height: 1, marginLeft: 28 },
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
  driverName: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 2 },
  ratingVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  carLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  etaChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
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
