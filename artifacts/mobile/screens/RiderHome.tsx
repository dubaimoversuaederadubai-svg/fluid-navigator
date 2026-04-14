import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useGetActiveRide } from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import LeafletMap, { MapMessage } from "@/components/LeafletMap";
import { VEHICLE_CONFIG, VehicleType, calculateFare, formatDistance, formatDuration } from "@/utils/fareCalc";

const { height } = Dimensions.get("window");

export default function RiderHome() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, activeRide, setActiveRide } = useApp();
  const { t, isUrdu } = useLang();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [pickup, setPickup] = useState(isUrdu ? "گلبرگ، لاہور" : "Gulberg, Lahore");
  const [dropoff, setDropoff] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [locating, setLocating] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const mapRef = useRef<any>(null);

  const { data: activeRideData } = useGetActiveRide({
    query: {
      refetchInterval: 5000,
      enabled: !activeRide,
    },
  });

  React.useEffect(() => {
    if (activeRideData?.ride) {
      const r = activeRideData.ride;
      setActiveRide({
        id: r.id,
        driverName: r.driverName ?? "Driver",
        driverRating: r.driverRating ?? 4.9,
        carModel: r.carModel ?? "Suzuki Alto",
        carPlate: (r as any).carPlate ?? "LHR-2024",
        status: r.status as any,
        pickup: r.pickup,
        dropoff: r.dropoff,
        fare: r.finalFare ?? r.offeredFare,
        eta: isUrdu ? "5 منٹ" : "5 min",
        distance: r.distance,
        duration: r.duration,
        driverId: r.driverId ?? undefined,
        riderId: r.riderId,
      });
      router.replace("/ride-tracking");
    }
  }, [activeRideData?.ride]);

  if (activeRide) {
    router.replace("/ride-tracking");
    return null;
  }

  const handleMapMessage = useCallback((msg: MapMessage) => {
    if (msg.type === "distance" && msg.distanceKm) {
      setDistanceKm(msg.distanceKm);
      setDurationMin(msg.durationMin ?? 0);
    }
    if (msg.type === "pickup_set" && msg.address) {
      setPickup(msg.address);
    }
    if (msg.type === "dropoff_set" && msg.address) {
      setDropoff(msg.address);
    }
  }, []);

  const getMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`,
        { headers: { "Accept-Language": "ur" } }
      );
      const data = await resp.json();
      if (data?.display_name) {
        const parts = data.display_name.split(",");
        const short = parts.slice(0, 2).join(",").trim();
        setPickup(short);
        setMapKey((k) => k + 1);
      }
    } catch {}
    setLocating(false);
  };

  const calculatedFare = distanceKm > 0 ? calculateFare(distanceKm, vehicleType) : null;
  const minFare = VEHICLE_CONFIG[vehicleType].minFare;

  const handleNavigate = async () => {
    if (!dropoff.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/fare-negotiation",
      params: {
        pickup,
        dropoff: dropoff || (isUrdu ? "منزل منتخب کریں" : "Select Destination"),
        vehicleType,
        distanceKm: distanceKm.toString(),
        durationMin: durationMin.toString(),
        suggestedFare: (calculatedFare ?? minFare).toString(),
      },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.mapContainer}>
        <LeafletMap
          key={mapKey}
          pickupAddress={pickup}
          dropoffAddress={dropoff || undefined}
          mode="picker"
          vehicleType={vehicleType}
          onMessage={handleMapMessage}
          style={{ flex: 1 }}
        />

        <View style={[styles.headerBar, { top: topPad + 8 }]}>
          <View style={[styles.headerInner, { backgroundColor: colors.card }]}>
            <View style={styles.brandRow}>
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={[styles.brandName, { color: colors.primary }]}>Fluid Navigator</Text>
            </View>
            <View style={[styles.avatarSmall, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>{user?.name?.charAt(0) ?? "U"}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.searchCard, { top: topPad + 66, backgroundColor: colors.card }]}>
          <View style={[styles.searchRow, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Ionicons name="navigate-circle" size={18} color={colors.primary} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}
              value={pickup}
              onChangeText={setPickup}
              onEndEditing={() => setMapKey((k) => k + 1)}
              placeholder={isUrdu ? "کہاں سے؟" : "Pickup location"}
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity onPress={getMyLocation} disabled={locating}>
              {locating
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="locate" size={16} color={colors.primary} />}
            </TouchableOpacity>
          </View>
          <View style={[styles.routeDot, { backgroundColor: colors.border }]} />
          <View style={[styles.searchRow, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Ionicons name="location" size={18} color="#EF4444" />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}
              value={dropoff}
              onChangeText={setDropoff}
              onEndEditing={() => { if (dropoff) setMapKey((k) => k + 1); }}
              placeholder={isUrdu ? "کہاں جانا ہے؟ نقشے پر ٹیپ کریں" : "Destination? Tap map to set"}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        <View style={[styles.mapHint, { bottom: 8 }]}>
          <View style={[styles.hintPill, { backgroundColor: colors.card + "EE" }]}>
            <Ionicons name="hand-left-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              {isUrdu ? "نقشے پر ٹیپ کریں — پہلے شروع، پھر منزل" : "Tap map — first pickup, then dropoff"}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.surfaceContainerHigh }]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScroll}
        >
          {distanceKm > 0 && (
            <View style={[styles.distanceBanner, { backgroundColor: colors.primary + "12" }]}>
              <Ionicons name="map-outline" size={14} color={colors.primary} />
              <Text style={[styles.distanceText, { color: colors.primary }]}>
                {formatDistance(distanceKm)}  •  {formatDuration(durationMin)}
              </Text>
            </View>
          )}

          <Text style={[styles.vehicleTitle, { color: colors.foreground, textAlign: isUrdu ? "right" : "left" }]}>
            {isUrdu ? "سواری کی قسم منتخب کریں" : "Select Vehicle Type"}
          </Text>

          <View style={styles.vehicleGrid}>
            {(["bike", "rickshaw", "car"] as VehicleType[]).map((v) => {
              const cfg = VEHICLE_CONFIG[v];
              const isSelected = vehicleType === v;
              const fare = distanceKm > 0 ? calculateFare(distanceKm, v) : cfg.minFare;
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => { setVehicleType(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.8}
                  style={[
                    styles.vehicleCard,
                    {
                      backgroundColor: isSelected ? cfg.color + "15" : colors.surfaceContainerLow,
                      borderColor: isSelected ? cfg.color : "transparent",
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Text style={styles.vehicleEmoji}>{cfg.emoji}</Text>
                  <Text style={[styles.vehicleLabel, { color: isSelected ? cfg.color : colors.foreground }]}>
                    {isUrdu ? cfg.label : cfg.labelEn}
                  </Text>
                  <Text style={[styles.vehicleFare, { color: isSelected ? cfg.color : colors.mutedForeground }]}>
                    Rs {fare}
                  </Text>
                  <Text style={[styles.vehicleMin, { color: colors.mutedForeground }]}>
                    {distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : (isUrdu ? `کم از کم` : "min fare")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.ctaWrapper}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNavigate}
            disabled={!dropoff.trim()}
            style={{ opacity: dropoff.trim() ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={["#10B981", "#2170E4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.offerBtn}
            >
              <Text style={styles.offerBtnEmoji}>{VEHICLE_CONFIG[vehicleType].emoji}</Text>
              <Text style={styles.offerBtnText}>
                {isUrdu ? "کرایہ طے کریں" : "Negotiate Fare"}
              </Text>
              <Text style={[styles.offerBtnFare, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                Rs {calculatedFare ?? minFare}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: botPad + 72 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapContainer: { flex: 1, position: "relative" },
  headerBar: { position: "absolute", left: 12, right: 12, zIndex: 10 },
  headerInner: {
    borderRadius: 16, flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 9,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  searchCard: {
    position: "absolute", left: 12, right: 12, borderRadius: 18, padding: 10, gap: 0,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 5, zIndex: 10,
  },
  searchRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  routeDot: { width: 2, height: 10, borderRadius: 1, alignSelf: "center", marginLeft: 20, marginVertical: 2 },
  mapHint: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 5 },
  hintPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bottomSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10, maxHeight: height * 0.52,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 24, elevation: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 10 },
  sheetScroll: { paddingHorizontal: 16, paddingBottom: 4 },
  distanceBanner: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8 },
  distanceText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  vehicleTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  vehicleGrid: { flexDirection: "row", gap: 8, marginBottom: 4 },
  vehicleCard: { flex: 1, borderRadius: 14, padding: 10, alignItems: "center", gap: 3 },
  vehicleEmoji: { fontSize: 24 },
  vehicleLabel: { fontSize: 11, fontFamily: "Inter_700Bold" },
  vehicleFare: { fontSize: 13, fontFamily: "Inter_700Bold" },
  vehicleMin: { fontSize: 9, fontFamily: "Inter_400Regular" },
  ctaWrapper: { paddingHorizontal: 16, paddingTop: 10 },
  offerBtn: {
    height: 52, borderRadius: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16,
  },
  offerBtnEmoji: { fontSize: 18 },
  offerBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  offerBtnFare: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
});
