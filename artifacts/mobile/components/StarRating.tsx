import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface StarRatingProps {
  rating: number;
  onRate?: (n: number) => void;
  size?: number;
}

export function StarRating({ rating, onRate, size = 28 }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onRate?.(n)}
          disabled={!onRate}
          activeOpacity={0.7}
        >
          <Ionicons
            name={n <= rating ? "star" : "star-outline"}
            size={size}
            color={n <= rating ? "#10B981" : "#d1d5db"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 4,
  },
});
