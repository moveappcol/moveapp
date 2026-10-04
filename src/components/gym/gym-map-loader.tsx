"use client";

import dynamic from "next/dynamic";
import type { Parqueadero } from "@/lib/parqueaderos";

// `dynamic(..., { ssr: false })` ya no se puede llamar directo desde un
// Server Component (Next 16) — hay que envolverlo en un Client Component
// como este, que es donde sí está permitido.
const GymMap = dynamic(() => import("./gym-map"), { ssr: false });

export default function GymMapLoader(props: {
  lat: number;
  lng: number;
  name: string;
  parqueaderos: Parqueadero[];
}) {
  return <GymMap {...props} />;
}
