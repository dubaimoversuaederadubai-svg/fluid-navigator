import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetRideHistory } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { data, isLoading, refetch, isRefetching } = useGetRideHistory();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const trips = data?.trips ?? [];
  const total = trips.reduce((s, t) => s + t.fare, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, paddingBottom: 16 }]}>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.title, { color: colors.foreground }]}>سفری سرگزشت</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {trips.length} سفر مکمل • کل: Rs {total.toFixed(0)}
          </Text>
        </View>
        <TouchableOpacity onPress={refetch} style={[styles.refreshBtn, { backgroundColor: colors.surfaceContainerLow }]}>
          <Ionicons name="refresh" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 90 }]}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>کوئی سفر نہیں</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                پہلی سواری مکمل کریں — یہاں نظر آئے گی
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.fare, { color: colors.primary }]}>Rs {item.fare.toFixed(0)}</Text>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={[styles.date, { color: colors.mutedForeground }]}>{item.date}</Text>
                  <Text style={[styles.driver, { color: colors.foreground }]}>
                    {item.driverName || item.riderName || "نامعلوم"}
                  </Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="car" size={20} color={colors.primary} />
                </View>
              </View>

              <View style={[styles.route, { borderTopColor: colors.border }]}>
                <View style={styles.routeRow}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
                      {item.pickup}
                    </Text>
                  </View>
                  <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
                </View>
                <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
                <View style={styles.routeRow}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
                      {item.dropoff}
                    </Text>
                  </View>
                  <View style={[styles.routeDotOutline, { borderColor: colors.secondary }]} />
                </View>
              </View>

              <View style={styles.cardBottom}>
                {item.rating > 0 && (
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name={n <= item.rating ? "star" : "star-outline"} size={12}
                        color={n <= item.rating ? "#10B981" : colors.border} />
                    ))}
                  </View>
                )}
                {item.duration ? (
                  <View style={styles.stat}>
                    <Text style={[styles.statText, { color: colors.mutedForeground }]}>{item.duration}</Text>
                    <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                  </View>
                ) : null}
                {item.distance ? (
                  <View style={styles.stat}>
                    <Text style={[styles.statText, { color: colors.mutedForeground }]}>{item.distance}</Text>
                    <Ionicons name="speedometer-outline" size={13} color={colors.mutedForeground} />
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  refreshBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: { borderRadius: 20, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  driver: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fare: { fontSize: 18, fontFamily: "Inter_700Bold" },
  route: { borderTopWidth: 1, paddingTop: 12, gap: 6 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "flex-end" },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeDotOutline: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  routeLine: { width: 2, height: 14, marginRight: 3, alignSelf: "flex-end" },
  routeText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  cardBottom: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 14, justifyContent: "flex-end" },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  starRow: { flexDirection: "row", gap: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
