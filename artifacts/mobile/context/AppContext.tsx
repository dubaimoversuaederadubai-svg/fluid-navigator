import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type UserRole = "rider" | "driver";

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  rating: number;
  totalRides: number;
  isOnline?: boolean;
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
}

interface AppContextType {
  user: AppUser | null;
  token: string | null;
  setAuth: (user: AppUser, token: string) => Promise<void>;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  activeRide: ActiveRide | null;
  setActiveRide: (ride: ActiveRide | null) => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [onboarded, setOnboardedState] = useState(false);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [storedUser, storedToken, ob] = await Promise.all([
          AsyncStorage.getItem("fluid_user"),
          AsyncStorage.getItem("fluid_token"),
          AsyncStorage.getItem("fluid_onboarded"),
        ]);
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
        if (ob === "true") setOnboardedState(true);
      } catch {}
    };
    load();
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
    await Promise.all([
      AsyncStorage.removeItem("fluid_user"),
      AsyncStorage.removeItem("fluid_token"),
    ]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        setAuth,
        onboarded,
        setOnboarded,
        activeRide,
        setActiveRide,
        logout,
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
