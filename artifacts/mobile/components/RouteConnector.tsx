import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface RouteConnectorProps {
  pickup: string;
  dropoff: string;
}

export function RouteConnector({ pickup, dropoff }: RouteConnectorProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <View style={styles.iconCol}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <View style={[styles.dotOutline, { borderColor: colors.primary }]} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>PICKUP</Text>
          <Text style={[styles.addr, { color: colors.foreground }]} numberOfLines={1}>{pickup}</Text>
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>DROPOFF</Text>
          <Text style={[styles.addr, { color: colors.foreground }]} numberOfLines={1}>{dropoff}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
  },
  iconCol: {
    alignItems: "center",
    paddingTop: 4,
    width: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  dotOutline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  textCol: {
    flex: 1,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  addr: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
