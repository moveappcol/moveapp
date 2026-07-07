"use client";

import { useMemo, useState } from "react";
import type { Gym } from "@/lib/gyms";
import { distanceKm } from "@/lib/geo";

type GeoStatus = "idle" | "loading" | "denied" | "unsupported" | "success";

export default function GymsExplorer({ gyms }: { gyms: Gym[] }) {
  const [query, setQuery] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");

  const activityOptions = useMemo(
    () => Array.from(new Set(gyms.flatMap((g) => g.activities))).sort(),
    [gyms]
  );

  function toggleActivity(activity: string) {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoStatus("success");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = gyms
      .filter((gym) =>
        selectedActivities.length === 0
          ? true
          : selectedActivities.some((a) => gym.activities.includes(a))
      )
      .filter((gym) =>
        q === ""
          ? true
          : [gym.name, gym.city, gym.address].some((f) =>
              f.toLowerCase().includes(q)
            )
      )
      .map((gym) => ({
        ...gym,
        distance:
          userLocation && gym.lat !== null && gym.lng !== null
            ? distanceKm(userLocation, { lat: gym.lat, lng: gym.lng })
            : null,
      }));

    if (userLocation) {
      list = list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

    return list;
  }, [gyms, query, selectedActivities, userLocation]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o ciudad…"
          className="w-full max-w-sm rounded-full border border-move-green/20 px-5 py-3 font-body text-sm text-move-green outline-none focus:border-move-coral"
        />

        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoStatus === "loading"}
          className="rounded-full border border-move-green/20 px-5 py-3 font-heading text-sm font-medium text-move-green transition-colors hover:border-move-green disabled:opacity-50"
        >
          {geoStatus === "loading" ? "Buscando tu ubicación…" : "Usar mi ubicación"}
        </button>

        <div className="flex flex-wrap gap-2">
          {activityOptions.map((activity) => {
            const active = selectedActivities.includes(activity);
            return (
              <button
                key={activity}
                type="button"
                onClick={() => toggleActivity(activity)}
                className={`rounded-full border px-4 py-2 font-heading text-xs font-medium transition-colors ${
                  active
                    ? "border-move-coral bg-move-coral text-white"
                    : "border-move-green/15 text-move-green/60 hover:border-move-green/40"
                }`}
              >
                {activity}
              </button>
            );
          })}
        </div>
      </div>

      {geoStatus === "denied" && (
        <p className="mt-3 font-body text-sm text-move-coral">
          No pudimos acceder a tu ubicación. Revisa los permisos del navegador
          e inténtalo de nuevo.
        </p>
      )}
      {geoStatus === "unsupported" && (
        <p className="mt-3 font-body text-sm text-move-coral">
          Tu navegador no soporta geolocalización.
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((gym) => (
          <div
            key={gym.id}
            className="overflow-hidden rounded-2xl border border-move-green/10"
          >
            <div className="flex h-36 items-center justify-center bg-move-green/5">
              {gym.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gym.photoUrl}
                  alt={gym.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-heading text-xs font-medium uppercase tracking-wide text-move-green/40">
                  Foto próximamente
                </span>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-heading text-base font-semibold text-move-green">
                  {gym.name}
                </p>
                {gym.distance !== null && (
                  <span className="whitespace-nowrap font-heading text-xs font-semibold text-move-coral">
                    {gym.distance < 1
                      ? `${Math.round(gym.distance * 1000)} m`
                      : `${gym.distance.toFixed(1)} km`}
                  </span>
                )}
              </div>
              <p className="mt-1 font-body text-sm text-move-green/60">
                {gym.activities.join(", ")} · {gym.address}
              </p>
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <p className="col-span-full font-body text-sm text-move-green/60">
            No encontramos gimnasios con esos filtros.
          </p>
        )}
      </div>
    </>
  );
}
