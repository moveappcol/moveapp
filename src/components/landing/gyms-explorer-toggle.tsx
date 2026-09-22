"use client";

import { useState } from "react";
import type { Gym } from "@/lib/gyms";
import type { Clase } from "@/lib/classes";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import GymsExplorer from "./gyms-explorer";
import ClassesByDayExplorer, { type GymInfo } from "./classes-by-day-explorer";

type Modo = "gimnasio" | "dia";

export default function GymsExplorerToggle({
  gyms,
  classes,
  reservedClaseIds,
  locale,
  t,
}: {
  gyms: Gym[];
  classes: Clase[];
  reservedClaseIds?: string[];
  locale: Locale;
  t: Dictionary["home"]["gyms"];
}) {
  const [modo, setModo] = useState<Modo>("gimnasio");

  const gymsById: Record<string, GymInfo> = Object.fromEntries(
    gyms.map((g) => [g.id, { name: g.name, activities: g.activities }])
  );

  return (
    <div>
      <div className="mt-8 inline-flex rounded-full border border-move-green/15 p-1">
        <button
          type="button"
          onClick={() => setModo("gimnasio")}
          className={`rounded-full px-4 py-2 font-heading text-sm font-semibold transition-colors ${
            modo === "gimnasio"
              ? "bg-move-green text-white"
              : "text-move-green/60 hover:text-move-green"
          }`}
        >
          {t.tabPorGimnasio}
        </button>
        <button
          type="button"
          onClick={() => setModo("dia")}
          className={`rounded-full px-4 py-2 font-heading text-sm font-semibold transition-colors ${
            modo === "dia" ? "bg-move-green text-white" : "text-move-green/60 hover:text-move-green"
          }`}
        >
          {t.tabPorDia}
        </button>
      </div>

      {modo === "gimnasio" ? (
        <GymsExplorer gyms={gyms} t={t} />
      ) : (
        <ClassesByDayExplorer
          classes={classes}
          gymsById={gymsById}
          reservedClaseIds={reservedClaseIds}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}
