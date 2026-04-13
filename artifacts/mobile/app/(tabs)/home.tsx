import { useApp } from "@/context/AppContext";
import DriverHome from "@/screens/DriverHome";
import RiderHome from "@/screens/RiderHome";
import React from "react";

export default function HomeTab() {
  const { user } = useApp();
  if (user?.role === "driver") return <DriverHome />;
  return <RiderHome />;
}
