import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { customFetch } from "@workspace/api-client-react";

export type UserRole = "rider" | "driver";

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  rating: number;
  totalRides: number;
  isOnline?: boolean;
  vehicleType?: "bike" | "rickshaw" | "car";
  driverLat?: number | null;
  driverLng?: number | null;
  profilePhoto?: string | null;
  cnicVerified?: boolean;
  licenseVerified?: boolean;
  vehicleModel?: string | null;
  vehicleNumber?: string | null;
  paymentMethod?: string;
}

export interface ActiveRide {
  id: string;
  driverName: string;
  driverRating: number;
  carModel: string;
  carPlate: string;
  status: "searching" | "accepted" | "on_the_way" | "trip_started" | "completed";
  pickup: string;
  dropoff: string;
  fare: number;
  eta: string;
  distance: string;
  duration: string;
  driverId?: string;
  riderId?: string;
  riderName?: string;
  vehicleType?: "bike" | "rickshaw" | "car";
  pickupLat?: number;
  pickupLng?: number;
}

interface AppContextType {
  user: AppUser | null;
  token: string | null;
  authReady: boolean;
  setAuth: (user: AppUser, token: string) => Promise<void>;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  activeRide: ActiveRide | null;
  setActiveRide: (ride: ActiveRide | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

function getApiBase(): string {
  const isWeb = typeof window !== "undefined" && window?.navigator?.product !== "ReactNative";
  const webUrl = process.env.EXPO_PUBLIC_API_URL_WEB;
  const nativeUrl = process.env.EXPO_PUBLIC_API_URL;
  return (isWeb ? (webUrl || nativeUrl) : (nativeUrl || webUrl)) ?? "";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [onboarded, setOnboardedState] = useState(false);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const load = async () => {
      try {
        const [storedUser, storedToken, ob] = await Promise.all([
          AsyncStorage.getItem("fluid_user"),
          AsyncStorage.getItem("fluid_token"),
          AsyncStorage.getItem("fluid_onboarded"),
        ]);

        if (ob === "true") setOnboardedState(true);

        if (!storedToken) {
          setAuthReady(true);
          return;
        }

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }

        const apiBase = getApiBase();
        if (apiBase) {
          try {
            const resp = await fetch(`${apiBase}/api/users/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (resp.ok) {
              const data = await resp.json();
              const freshUser: AppUser = data.user;
              setUser(freshUser);
              setToken(storedToken);
              await AsyncStorage.setItem("fluid_user", JSON.stringify(freshUser));
            } else if (resp.status === 401) {
              setUser(null);
              setToken(null);
              await AsyncStorage.multiRemove(["fluid_user", "fluid_token"]);
            }
          } catch {
            if (storedUser && storedToken) {
              setUser(JSON.parse(storedUser));
              setToken(storedToken);
            }
          }
        }
      } catch {}
      setAuthReady(true);
    };
    load();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data: any = await customFetch("/api/users/me");
      if (data?.user) {
        setUser(data.user);
        await AsyncStorage.setItem("fluid_user", JSON.stringify(data.user));
      }
    } catch {}
  }, []);

  const setAuth = useCallback(async (u: AppUser, t: string) => {
    setUser(u);
    setToken(t);
    await Promise.all([
      AsyncStorage.setItem("fluid_user", JSON.stringify(u)),
      AsyncStorage.setItem("fluid_token", t),
    ]);
  }, []);

  const setOnboarded = useCallback(async (v: boolean) => {
    setOnboardedState(v);
    await AsyncStorage.setItem("fluid_onboarded", v ? "true" : "false");
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setActiveRide(null);
    // Clear all cached API data so next user starts fresh
    queryClient.clear();
    await AsyncStorage.multiRemove(["fluid_user", "fluid_token"]);
  }, [queryClient]);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        authReady,
        setAuth,
        onboarded,
        setOnboarded,
        activeRide,
        setActiveRide,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
