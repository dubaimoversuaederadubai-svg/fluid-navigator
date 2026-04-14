import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StarRating } from "@/components/StarRating";
import { useColors } from "@/hooks/useColors";
import { useGetRide, useCreateReview } from "@workspace/api-client-react";
import { useLang } from "@/context/LanguageContext";

export default function TripSummaryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ rideId?: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { t } = useLang();
  const { data: rideData, isLoading } = useGetRide(params.rideId ?? "", {
    query: { enabled: !!params.rideId },
  });
  const createReviewMutation = useCreateReview();
  const ride = rideData?.ride;

  const submitReview = async () => {
    if (!ride || !params.rideId || submitted) return;
    const revieweeId = ride.driverId;
    if (!revieweeId) { finishRide(); return; }
    try {
      await createReviewMutation.mutateAsync({ rideId: params.rideId, data: { revieweeId, rating, comment } });
      setSubmitted(true);
    } catch {}
    finishRide();
  };

  const finishRide = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)/home");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const fare = ride?.finalFare ?? ride?.offeredFare ?? 0;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: topPad + 16, paddingHorizontal: 20, gap: 20 }}>
        <View style={styles.successSection}>
          <View style={[styles.checkCircle, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>{t("rideComplete")}</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>{t("thankYou")}</Text>
        </View>

        <View style={[styles.fareCard, { backgroundColor: colors.card }]}>
          <View style={styles.fareRow}>
            <View style={[styles.walletBadge, { backgroundColor: colors.secondary + "20" }]}>
              <Ionicons name="wallet" size={14} color={colors.secondary} />
              <Text style={[styles.walletText, { color: colors.secondary }]}>{t("paid")}</Text>
            </View>
            <View>
              <Text style={[styles.fareLabel, { color: colors.mutedForeground }]}>{t("totalFare")}</Text>
              <Text style={[styles.fareAmount, { color: colors.foreground }]}>Rs {fare.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Ionicons name="git-network-outline" size={20} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t("distance")}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{ride?.distance ?? "—"}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Ionicons name="time-outline" size={20} color={colors.secondary} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t("duration")}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{ride?.duration ?? "—"}</Text>
          </View>
        </View>

        <View style={[styles.routeCard, { backgroundColor: colors.card }]}>
          <View style={styles.routeRow}>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
                {ride?.pickup ?? t("startPoint")}
              </Text>
            </View>
            <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          </View>
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <View style={styles.routeRow}>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
                {ride?.dropoff ?? t("endPoint")}
              </Text>
            </View>
            <View style={[styles.routeDotOutline, { borderColor: colors.secondary }]} />
          </View>
        </View>

        {ride?.driverId && (
          <View style={[styles.ratingCard, { backgroundColor: colors.card }]}>
            <View style={styles.driverRow}>
              <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>{(ride.driverName ?? "D").charAt(0)}</Text>
              </LinearGradient>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[styles.driverName, { color: colors.foreground }]}>
                  {ride.driverName ?? t("yourDriver")}
                </Text>
                <View style={styles.driverSub}>
                  <Text style={[styles.driverRating, { color: colors.mutedForeground }]}>
                    {ride.driverRating ?? "5.0"}
                  </Text>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                </View>
              </View>
            </View>

            <View style={[styles.ratingSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>{t("rateDrv")}</Text>
              <StarRating
                rating={rating}
                onRate={(n) => {
                  setRating(n);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
              <TextInput
                style={[
                  styles.commentInput,
                  { backgroundColor: colors.surfaceContainerLow, color: colors.foreground },
                ]}
                placeholder={t("addComment")}
                placeholderTextColor={colors.mutedForeground}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlign="right"
              />
            </View>
          </View>
        )}

        <TouchableOpacity onPress={submitReview} disabled={createReviewMutation.isPending} activeOpacity={0.85}>
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.finishBtn}
          >
            {createReviewMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.finishText}>
                {ride?.driverId ? t("submitRating") : t("finish")}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  successSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  successTitle: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  fareCard: { borderRadius: 24, padding: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", textAlign: "right" },
  fareAmount: { fontSize: 40, fontFamily: "Inter_700Bold", letterSpacing: -1, marginTop: 4, textAlign: "right" },
  walletBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  walletText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderRadius: 20, padding: 16, gap: 6 },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase", textAlign: "right" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "right" },
  routeCard: { borderRadius: 20, padding: 16, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "flex-end" },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeDotOutline: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  routeLine: { width: 2, height: 20, marginRight: 4, alignSelf: "flex-end" },
  routeText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  ratingCard: { borderRadius: 24, padding: 20, gap: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  driverAvatarText: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  driverName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  driverSub: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  driverRating: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ratingSection: { borderTopWidth: 1, paddingTop: 16, gap: 12 },
  rateLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center" },
  commentInput: { borderRadius: 14, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top" },
  finishBtn: { height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  finishText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
