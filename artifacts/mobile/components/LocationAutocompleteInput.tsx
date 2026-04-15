import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelectSuggestion: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  colors: any;
  iconName?: any;
  iconColor?: string;
  isUrdu?: boolean;
  rightElement?: React.ReactNode;
}

export function LocationAutocompleteInput({
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder,
  colors,
  iconName = "navigate-circle",
  iconColor,
  isUrdu = false,
  rightElement,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowList(false);
      return;
    }
    setLoading(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json` +
        `&q=${encodeURIComponent(query + " Pakistan")}` +
        `&limit=5&countrycodes=pk&addressdetails=1`;
      const resp = await fetch(url, { headers: { "Accept-Language": "ur,en" } });
      const data: Suggestion[] = await resp.json();
      setSuggestions(data);
      setShowList(data.length > 0);
    } catch {}
    setLoading(false);
  }, []);

  const handleChange = (text: string) => {
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 500);
  };

  const handleSelect = (s: Suggestion) => {
    const parts = s.display_name.split(",");
    const short = parts.slice(0, 2).join(",").trim();
    onSelectSuggestion(short, parseFloat(s.lat), parseFloat(s.lon));
    setShowList(false);
    setSuggestions([]);
  };

  const handleBlur = () => {
    setTimeout(() => setShowList(false), 200);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) setShowList(true);
  };

  return (
    <View style={{ position: "relative", zIndex: 100 }}>
      <View style={[styles.row, { backgroundColor: colors.surfaceContainerHighest }]}>
        <Ionicons name={iconName} size={18} color={iconColor ?? colors.primary} />
        <TextInput
          style={[
            styles.input,
            { color: colors.foreground, textAlign: isUrdu ? "right" : "left" },
          ]}
          value={value}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : rightElement ?? null}
      </View>
      {showList && suggestions.length > 0 && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {suggestions.map((s, idx) => {
            const parts = s.display_name.split(",");
            const name = parts[0]?.trim() ?? "";
            const sub = parts.slice(1, 3).join(",").trim();
            return (
              <TouchableOpacity
                key={`${s.place_id}-${idx}`}
                onPress={() => handleSelect(s)}
                style={[
                  styles.suggestion,
                  {
                    borderBottomColor: idx < suggestions.length - 1 ? colors.border : "transparent",
                    borderBottomWidth: idx < suggestions.length - 1 ? 1 : 0,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.sugName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  {sub ? (
                    <Text
                      style={[styles.sugSub, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {sub}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 22,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 999,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
    overflow: "hidden",
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sugName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  sugSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});
