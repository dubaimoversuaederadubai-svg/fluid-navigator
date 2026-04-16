import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useLang } from "@/context/LanguageContext";

type CallStatus = "connecting" | "ringing" | "connected" | "ended";

function getWsBase(): string {
  const native = process.env.EXPO_PUBLIC_API_URL;
  const web = process.env.EXPO_PUBLIC_API_URL_WEB;
  const isWeb = Platform.OS === "web";
  const base = isWeb ? (web || native) : (native || web);
  if (!base) return "ws://localhost:8080";
  return base.replace(/^https/, "wss").replace(/^http/, "ws");
}

export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const { isUrdu } = useLang();
  const { rideId, partnerName, party } = useLocalSearchParams<{
    rideId: string;
    partnerName: string;
    party: "rider" | "driver";
  }>();

  const myParty = (party ?? user?.role ?? "rider") as "rider" | "driver";

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundQueueRef = useRef<Audio.Sound[]>([]);
  const peerConnected = useRef(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "connected") {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ── Audio Setup ───────────────────────────────────────────────────────────
  const setupAudio = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: !speaker,
      });
    } catch {}
  }, [speaker]);

  useEffect(() => { setupAudio(); }, [setupAudio]);

  // ── Record + Send Audio Chunk ─────────────────────────────────────────────
  const sendChunk = useCallback(async () => {
    if (muted || !peerConnected.current) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      // Stop previous recording if exists
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      }

      const { status: perm } = await Audio.requestPermissionsAsync();
      if (perm !== "granted") return;

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.LOW_QUALITY,
        android: { ...Audio.RecordingOptionsPresets.LOW_QUALITY.android, extension: ".m4a", sampleRate: 16000, numberOfChannels: 1, bitRate: 32000 },
        ios: { ...Audio.RecordingOptionsPresets.LOW_QUALITY.ios, extension: ".m4a", sampleRate: 16000, numberOfChannels: 1, bitRate: 32000, audioQuality: Audio.IOSAudioQuality.LOW },
      });
      recordingRef.current = rec;
      await rec.startAsync();

      await new Promise((r) => setTimeout(r, 700));

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      if (!uri) return;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(uri, { idempotent: true });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "audio", data: base64 }));
      }
    } catch {}
  }, [muted]);

  // ── Play Incoming Chunk ───────────────────────────────────────────────────
  const playChunk = useCallback(async (base64: string) => {
    try {
      const uri = `${FileSystem.cacheDirectory}chunk_${Date.now()}.m4a`;
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundQueueRef.current.push(sound);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && !st.isPlaying && !st.isBuffering) {
          sound.unloadAsync().catch(() => {});
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
          soundQueueRef.current = soundQueueRef.current.filter((s) => s !== sound);
        }
      });
    } catch {}
  }, []);

  // ── WebSocket Connection ──────────────────────────────────────────────────
  const connect = useCallback(() => {
    const wsUrl = `${getWsBase()}/ws/call`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", rideId, party: myParty }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "joined") {
          setStatus("ringing");
          Vibration.vibrate([0, 500, 200, 500], false);
        }

        if (msg.type === "peer_joined") {
          peerConnected.current = true;
          setStatus("connected");
          Vibration.cancel();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Start recording loop
          recordingLoopRef.current = setInterval(() => { sendChunk(); }, 750);
        }

        if (msg.type === "peer_left") {
          peerConnected.current = false;
          if (status !== "ended") {
            setStatus("ringing");
          }
        }

        if (msg.type === "call_ended") {
          endCall(false);
        }

        if (msg.type === "audio" && msg.data) {
          playChunk(msg.data);
        }
      } catch {}
    };

    ws.onclose = () => {
      peerConnected.current = false;
    };

    ws.onerror = () => {};
  }, [rideId, myParty, sendChunk, playChunk]);

  useEffect(() => {
    connect();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (recordingLoopRef.current) clearInterval(recordingLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    soundQueueRef.current.forEach((s) => s.unloadAsync().catch(() => {}));
    soundQueueRef.current = [];
    Vibration.cancel();
  };

  const endCall = useCallback((sendEndMsg = true) => {
    if (sendEndMsg && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end" }));
    }
    wsRef.current?.close();
    wsRef.current = null;
    cleanup();
    setStatus("ended");
    setTimeout(() => router.back(), 1500);
  }, []);

  const toggleMute = () => {
    setMuted((m) => !m);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleSpeaker = async () => {
    const next = !speaker;
    setSpeaker(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Audio.setAudioModeAsync({ playThroughEarpieceAndroid: !next });
    } catch {}
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  const statusLabels: Record<CallStatus, string> = {
    connecting: isUrdu ? "جوڑ ہو رہا ہے..." : "Connecting...",
    ringing: isUrdu ? "گھنٹی بج رہی ہے..." : "Ringing...",
    connected: isUrdu ? "بات جاری ہے" : "Connected",
    ended: isUrdu ? "کال ختم" : "Call Ended",
  };

  const gradients: Record<CallStatus, [string, string]> = {
    connecting: ["#1e3a5f", "#2170E4"],
    ringing: ["#14532d", "#10B981"],
    connected: ["#10B981", "#2170E4"],
    ended: ["#374151", "#1f2937"],
  };

  return (
    <LinearGradient
      colors={gradients[status]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={[styles.root, { paddingTop: topPad }]}
    >
      {/* Top: Status + Back */}
      <View style={[styles.topRow, { paddingHorizontal: 20, paddingTop: 12 }]}>
        {status === "ended" ? (
          <Text style={styles.endedText}>{statusLabels.ended}</Text>
        ) : (
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: status === "connected" ? "#A7F3D0" : "#FEF08A", opacity: status === "connecting" ? 0.6 : 1 }]} />
            <Text style={styles.statusText}>{statusLabels[status]}</Text>
          </View>
        )}
      </View>

      {/* Center: Avatar + Name */}
      <View style={styles.center}>
        <View style={styles.avatarOuter}>
          <View style={styles.avatarMid}>
            <LinearGradient
              colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{partnerName?.charAt(0)?.toUpperCase() ?? "?"}</Text>
            </LinearGradient>
          </View>
        </View>

        <Text style={styles.nameText}>{partnerName ?? (isUrdu ? "پارٹنر" : "Partner")}</Text>
        <Text style={styles.roleText}>
          {myParty === "rider"
            ? (isUrdu ? "ڈرائیور" : "Driver")
            : (isUrdu ? "مسافر" : "Rider")}
        </Text>

        {status === "connected" && (
          <View style={styles.timerBadge}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          </View>
        )}

        {status === "connecting" && (
          <ActivityIndicator color="rgba(255,255,255,0.6)" size="large" style={{ marginTop: 24 }} />
        )}

        {status === "ringing" && (
          <View style={styles.ringingAnim}>
            <Ionicons name="call" size={28} color="rgba(255,255,255,0.8)" />
            <Text style={styles.ringingText}>{isUrdu ? "گھنٹی بج رہی ہے..." : "Ringing..."}</Text>
          </View>
        )}
      </View>

      {/* Bottom Controls */}
      {status !== "ended" && (
        <View style={[styles.controls, { paddingBottom: botPad + 20 }]}>
          <View style={styles.controlRow}>
            {/* Mute */}
            <View style={styles.controlItem}>
              <TouchableOpacity
                onPress={toggleMute}
                style={[styles.controlBtn, muted && styles.controlBtnActive]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={muted ? "mic-off" : "mic"}
                  size={26}
                  color={muted ? "#1f2937" : "#fff"}
                />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{isUrdu ? "خاموش" : "Mute"}</Text>
            </View>

            {/* End Call */}
            <View style={styles.controlItem}>
              <TouchableOpacity
                onPress={() => endCall(true)}
                style={styles.endBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{isUrdu ? "کال ختم کریں" : "End Call"}</Text>
            </View>

            {/* Speaker */}
            <View style={styles.controlItem}>
              <TouchableOpacity
                onPress={toggleSpeaker}
                style={[styles.controlBtn, speaker && styles.controlBtnActive]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={speaker ? "volume-high" : "volume-low"}
                  size={26}
                  color={speaker ? "#1f2937" : "#fff"}
                />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{isUrdu ? "اسپیکر" : "Speaker"}</Text>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  endedText: { color: "rgba(255,255,255,0.7)", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  avatarOuter: { width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarMid: { width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 44, color: "#fff", fontFamily: "Inter_700Bold" },
  nameText: { fontSize: 32, color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center", paddingHorizontal: 24 },
  roleText: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 2 },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  timerText: { color: "#fff", fontSize: 18, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  ringingAnim: { alignItems: "center", gap: 8, marginTop: 20 },
  ringingText: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_400Regular" },
  controls: { paddingHorizontal: 32, paddingTop: 20, backgroundColor: "rgba(0,0,0,0.2)" },
  controlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  controlItem: { alignItems: "center", gap: 10, flex: 1 },
  controlBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  controlBtnActive: { backgroundColor: "#fff" },
  controlLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  endBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", shadowColor: "#EF4444", shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
});
