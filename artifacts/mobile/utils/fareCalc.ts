export type VehicleType = "bike" | "rickshaw" | "car";

export const VEHICLE_CONFIG: Record<VehicleType, {
  label: string;
  labelEn: string;
  emoji: string;
  minFare: number;
  perKm: number;
  color: string;
  description: string;
  descriptionEn: string;
}> = {
  bike: {
    label: "بائیک",
    labelEn: "Bike",
    emoji: "🏍️",
    minFare: 70,
    perKm: 15,
    color: "#10B981",
    description: "تیز، سستا، ایک سواری",
    descriptionEn: "Fast, cheap, 1 passenger",
  },
  rickshaw: {
    label: "رکشہ",
    labelEn: "Rickshaw",
    emoji: "🛺",
    minFare: 150,
    perKm: 25,
    color: "#F59E0B",
    description: "3 سواریاں، آرام دہ",
    descriptionEn: "3 passengers, comfortable",
  },
  car: {
    label: "کار",
    labelEn: "Car",
    emoji: "🚗",
    minFare: 250,
    perKm: 45,
    color: "#2170E4",
    description: "4 سواریاں، ایئر کنڈیشن",
    descriptionEn: "4 passengers, AC",
  },
};

export function calculateFare(distanceKm: number, vehicleType: VehicleType): number {
  const cfg = VEHICLE_CONFIG[vehicleType];
  const raw = Math.max(cfg.minFare, cfg.perKm * distanceKm);
  return Math.ceil(raw / 10) * 10;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} میٹر`;
  return `${km.toFixed(1)} کلومیٹر`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} منٹ`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} گھنٹہ ${m > 0 ? m + " منٹ" : ""}`.trim();
}
