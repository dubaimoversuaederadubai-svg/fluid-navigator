import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { customFetch } from "@workspace/api-client-react";

interface Message {
  id: string;
  rideId: string;
  senderId: string;
  senderRole: "rider" | "driver";
  content: string;
  createdAt: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user } = useApp();
  const { isUrdu } = useLang();
  const { rideId, partnerName } = useLocalSearchParams<{ rideId: string; partnerName: string }>();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const fetchMessages = useCallback(async () => {
    if (!rideId) return;
    try {
      const data: any = await customFetch(`/api/rides/${rideId}/messages`);
      if (data?.messages) {
        setMessages(data.messages);
      }
    } catch {}
    setLoading(false);
  }, [rideId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || !rideId) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await customFetch(`/api/rides/${rideId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      await fetchMessages();
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === user?.id;
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMine && (
          <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.avatar}>
            <Text style={styles.avatarText}>{partnerName?.charAt(0) ?? "?"}</Text>
          </LinearGradient>
        )}
        <View style={[
          styles.bubble,
          isMine
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.card, borderBottomLeftRadius: 4 }
        ]}>
          <Text style={[styles.msgText, { color: isMine ? "#fff" : colors.foreground }]}>
            {item.content}
          </Text>
          <Text style={[styles.msgTime, { color: isMine ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <LinearGradient
          colors={["#10B981", "#2170E4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: topPad + 8 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{partnerName ?? (isUrdu ? "ڈرائیور" : "Driver")}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{isUrdu ? "آن لائن" : "Online"}</Text>
            </View>
          </View>
          <View style={[styles.headerAvatar]}>
            <Text style={styles.headerAvatarText}>{partnerName?.charAt(0) ?? "D"}</Text>
          </View>
        </LinearGradient>

        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {isUrdu ? "ابھی کوئی پیغام نہیں" : "No messages yet"}
                </Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  {isUrdu ? "پہلا پیغام بھیجیں" : "Send the first message"}
                </Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={[styles.inputArea, {
          backgroundColor: colors.card,
          paddingBottom: botPad + 8,
          borderTopColor: colors.border,
        }]}>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceContainerHighest }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={input}
              onChangeText={setInput}
              placeholder={isUrdu ? "پیغام لکھیں..." : "Type a message..."}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              textAlign={isUrdu ? "right" : "left"}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={sending || !input.trim()}
              activeOpacity={0.8}
              style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.4 }]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <LinearGradient colors={["#10B981", "#2170E4"]} style={styles.sendBtnGrad}>
                  <Ionicons name={isUrdu ? "arrow-back" : "send"} size={18} color="#fff" />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerName: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#A7F3D0" },
  onlineText: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontFamily: "Inter_400Regular" },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  headerAvatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  msgRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  msgRowLeft: { alignSelf: "flex-start", maxWidth: "80%" },
  msgRowRight: { alignSelf: "flex-end", maxWidth: "80%", flexDirection: "row-reverse" },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 3, maxWidth: "100%" },
  msgText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
  msgTime: { fontSize: 10, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 14 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 6 },
  inputArea: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 8 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", borderRadius: 26, paddingLeft: 16, paddingRight: 4, paddingVertical: 6, gap: 6 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100, paddingVertical: 6 },
  sendBtn: { width: 40, height: 40 },
  sendBtnGrad: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
