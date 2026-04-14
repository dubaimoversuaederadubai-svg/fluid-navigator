import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLang } from "@/context/LanguageContext";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { setOnboarded } = useApp();
  const { t, isUrdu } = useLang();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const SLIDES = [
    {
      icon: "car-sport" as const,
      title: isUrdu ? t("rideEasily") : "Book rides\neasily.",
      accent: isUrdu ? "آسان کریں۔" : "easily.",
      body: t("rideEasilyBody"),
      color: "#10B981",
    },
    {
      icon: "pricetag" as const,
      title: isUrdu ? t("setFare") : "Set your\nown fare.",
      accent: isUrdu ? "کرایہ طے کریں۔" : "own fare.",
      body: t("setFareBody"),
      color: "#2170E4",
    },
    {
      icon: "shield-checkmark" as const,
      title: isUrdu ? t("safeReliable") : "Safe and\nreliable.",
      accent: isUrdu ? "قابل اعتماد۔" : "reliable.",
      body: t("safeBody"),
      color: "#10B981",
    },
  ];

  const goNext = async () => {
    if (current < SLIDES.length - 1) {
      const next = current + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrent(next);
    } else {
      await setOnboarded(true);
      router.replace("/auth");
    }
  };

  const skip = async () => {
    await setOnboarded(true);
    router.replace("/auth");
  };

  const slide = SLIDES[current];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, paddingHorizontal: 24 },
        ]}
      >
        <View style={styles.logo}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="navigate" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.logoText, { color: colors.foreground }]}>Fluid</Text>
        </View>
        <TouchableOpacity onPress={skip}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>{t("skip")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.slider}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.illustration}>
              <LinearGradient
                colors={["#10B981" + "20", "#2170E4" + "10"]}
                style={styles.illustrationBg}
              />
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: s.color + "15" },
                ]}
              >
                <Ionicons name={s.icon} size={72} color={s.color} />
              </View>
            </View>
            <View style={styles.textSection}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {s.title.replace(s.accent, "")}
                <Text style={{ color: s.color }}>{s.accent}</Text>
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                {s.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 24, paddingHorizontal: 24 },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === current ? colors.primary : colors.surfaceContainerHighest,
                  width: i === current ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
          <LinearGradient
            colors={["#10B981", "#2170E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>
              {current < SLIDES.length - 1 ? t("next") : t("getStarted")}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  skip: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  slider: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  illustration: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  illustrationBg: {
    position: "absolute",
    width: "80%",
    height: "80%",
    borderRadius: 999,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  textSection: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 50,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  btn: {
    height: 56,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
});
