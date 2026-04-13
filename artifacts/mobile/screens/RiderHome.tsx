import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetActiveRide } from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { height } = Dimensions.get("window");

const QUICK_DESTINATIONS = [
  { label: "دفتر", addr: "آئی ٹی پارک، لاہور", icon: "briefcase" as const, duration: "22 منٹ", color: "#10B981" },
  { label: "گھر", addr: "ڈیفنس فیز 6، لاہور", icon: "home" as const, duration: "35 منٹ", color: "#2170E4" },
  { label: "ایئرپورٹ", addr: "علامہ اقبال انٹرنیشنل، لاہور", icon: "airplane" as const, duration: "45 منٹ", color: "#F59E0B" },
];

export default function RiderHome() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, activeRide, setActiveRide } = useApp();
  const [pickup, setPickup] = useState("گلبرگ، لاہور");
  const [dropoff, setDropoff] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

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
        driverName: r.driverName ?? "ڈرائیور",
        driverRating: r.driverRating ?? 4.9,
        carModel: r.carModel ?? "Suzuki Alto",
        carPlate: "LHR-2024",
        status: r.status as any,
        pickup: r.pickup,
        dropoff: r.dropoff,
        fare: r.finalFare ?? r.offeredFare,
        eta: "5 منٹ",
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.mapArea}>
        <View style={[styles.mapBg, { backgroundColor: "#d4e8d4" }]}>
          <View style={styles.mapGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={[styles.mapLine, { backgroundColor: "#b8d4b8", top: `${i * 14}%` as any }]} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.mapLineV, { backgroundColor: "#b8d4b8", left: `${i * 20}%` as any }]} />
            ))}
          </View>

          <View style={[styles.pkLabel, { bottom: 80, left: 20, backgroundColor: colors.card + "CC" }]}>
            <Text style={{ fontSize: 12 }}>🇵🇰</Text>
            <Text style={[styles.pkLabelText, { color: colors.foreground }]}>پاکستان</Text>
          </View>

          {[{ top: "38%", left: "28%" }, { top: "52%", left: "58%" }, { top: "28%", left: "68%" }].map((pos, i) => (
            <View key={i} style={[styles.carMarker, { top: pos.top as any, left: pos.left as any, backgroundColor: colors.card }]}>
              <Ionicons name="car" size={14} color={colors.primary} />
            </View>
          ))}
        </View>

        <View style={[styles.headerBar, { top: topPad + 8 }]}>
          <View style={[styles.headerInner, { backgroundColor: colors.card }]}>
            <View style={styles.brandRow}>
              <Ionicons name="navigate" size={18} color={colors.primary} />
              <Text style={[styles.brandName, { color: colors.primary }]}>Fluid Navigator</Text>
            </View>
            <View style={[styles.avatarSmall, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>{user?.name?.charAt(0) ?? "U"}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.searchCard, { top: topPad + 74, backgroundColor: colors.card }]}>
          <View style={[styles.searchRow, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Ionicons name="navigate-circle" size={18} color={colors.primary} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={pickup}
              onChangeText={setPickup}
              placeholder="کہاں سے جانا ہے؟"
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
            />
          </View>
          <View style={[styles.searchRow, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Ionicons name="location" size={18} color={colors.secondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={dropoff}
              onChangeText={setDropoff}
              placeholder="کہاں جانا ہے؟"
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.locationFab, { backgroundColor: colors.card, bottom: height * 0.35 + 16 }]}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.surfaceContainerHigh }]} />

        <View style={styles.sheetHeader}>
          <View style={[styles.etaBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.etaText, { color: colors.primary }]}>3 منٹ</Text>
          </View>
          <View>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>سفر کریں؟</Text>
            <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>قریبی ڈرائیور دستیاب ہیں</Text>
          </View>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_DESTINATIONS.map((d) => (
            <TouchableOpacity
              key={d.label}
              style={[styles.quickCard, { backgroundColor: colors.surfaceContainerLow }]}
              activeOpacity={0.8}
              onPress={() => setDropoff(d.addr)}
            >
              <Ionicons name={d.icon} size={20} color={d.color} />
              <Text style={[styles.quickLabel, { color: colors.foreground }]}>{d.label}</Text>
              <Text style={[styles.quickDuration, { color: colors.mutedForeground }]}>{d.duration}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: "/fare-negotiation",
              params: { pickup, dropoff: dropoff || "منزل منتخب کریں" },
            });
          }}
        >
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.offerBtn}
          >
            <Ionicons name="pricetag" size={18} color="#fff" />
            <Text style={styles.offerBtnText}>اپنا کرایہ طے کریں</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: botPad }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapArea: { flex: 1, position: "relative" },
  mapBg: { flex: 1, position: "relative", overflow: "hidden" },
  mapGrid: { ...StyleSheet.absoluteFillObject },
  mapLine: { position: "absolute", left: 0, right: 0, height: 1, opacity: 0.5 },
  mapLineV: { position: "absolute", top: 0, bottom: 0, width: 1, opacity: 0.5 },
  pkLabel: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  pkLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  carMarker: {
    position: "absolute", padding: 7, borderRadius: 18,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    borderWidth: 2, borderColor: "#10B981" + "40",
  },
  headerBar: { position: "absolute", left: 12, right: 12 },
  headerInner: {
    borderRadius: 18, flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  searchCard: {
    position: "absolute", left: 12, right: 12, borderRadius: 18, padding: 10, gap: 8,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  searchRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  locationFab: {
    position: "absolute", right: 16, width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  bottomSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 18, paddingTop: 12,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3, textAlign: "right" },
  sheetSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  etaBadge: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  etaText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  quickGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickCard: { flex: 1, borderRadius: 14, padding: 12, gap: 4, alignItems: "center" },
  quickLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  quickDuration: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  offerBtn: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  offerBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
