"use client";

import { useState } from "react";
import Image from "next/image";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["instalar"];
type Platform = "iphone" | "android";

/** Marco de teléfono en CSS puro — sin capturas de pantalla, para que se
 * vea nítido en cualquier tamaño y no dependa de imágenes que puedan
 * quedar desactualizadas si cambia el diseño del sitio. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-36 shrink-0">
      <div className="relative h-72 overflow-hidden rounded-[1.5rem] border-[5px] border-move-green bg-white shadow-md">
        {children}
      </div>
    </div>
  );
}

/** Barra superior del "sitio" recreada con los mismos tokens de marca —
 * mismo logo, mismos colores — para que el mockup se sienta como UNIQUE de
 * verdad sin necesitar una captura de pantalla real. */
function MiniSiteHeader() {
  return (
    <div className="flex items-center justify-between border-b border-move-green/10 bg-white px-2 py-1.5">
      <span className="font-brand text-[10px] font-bold uppercase tracking-tight text-move-green">
        UNIQUE
      </span>
      <div className="h-2 w-2 rounded-full bg-move-green/20" />
    </div>
  );
}

function MiniSiteHero({ t }: { t: T }) {
  return (
    <div className="flex-1 space-y-1.5 bg-white px-2.5 pt-2.5">
      <span className="inline-block rounded-full bg-move-lime/60 px-1.5 py-0.5 text-[5px] font-bold uppercase tracking-wide text-move-green">
        {t.heroBadge}
      </span>
      <p className="font-heading text-[9px] font-bold leading-tight text-move-green">{t.heroTitle}</p>
      <div className="h-10 rounded-lg bg-move-coral/90" />
      <div className="flex gap-1">
        <div className="h-3 flex-1 rounded-full bg-move-coral" />
        <div className="h-3 flex-1 rounded-full border border-move-green/20" />
      </div>
    </div>
  );
}

function SafariChrome({
  children,
  urlLabel,
  toolbarIcon = "share",
}: {
  children: React.ReactNode;
  urlLabel: string;
  /** En Safari primero hay que tocar "•••" (más opciones) y ahí adentro
   * aparece "Compartir" — no es un botón directo en la barra. */
  toolbarIcon?: "more" | "share";
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 bg-move-green/5 px-2 py-1">
        <div className="flex-1 rounded-md bg-white px-1.5 py-0.5 text-center text-[6px] text-move-green/60">
          {urlLabel}
        </div>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="flex items-center justify-around border-t border-move-green/10 bg-move-green/5 py-1.5">
        <div className="h-2 w-2 rounded-sm border border-move-green/30" />
        <div className="h-2 w-3 rounded-sm border border-move-green/30" />
        {toolbarIcon === "more" ? <MoreIcon highlighted /> : <MoreIcon />}
        <div className="h-2 w-2 rounded-full border border-move-green/30" />
      </div>
      {toolbarIcon === "share" && (
        <div className="flex justify-center border-t border-move-green/10 bg-white py-1">
          <ShareIcon highlighted />
        </div>
      )}
    </div>
  );
}

function MoreIcon({ highlighted = false }: { highlighted?: boolean }) {
  return (
    <div
      className={`flex h-4 w-4 items-center justify-center rounded-md ${highlighted ? "bg-move-coral/20 ring-2 ring-move-coral" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-move-green">
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
      </svg>
    </div>
  );
}

function ShareIcon({ highlighted = false }: { highlighted?: boolean }) {
  return (
    <div
      className={`flex h-4 w-4 items-center justify-center rounded-md ${highlighted ? "bg-move-coral/20 ring-2 ring-move-coral" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-move-green stroke-[2]">
        <path d="M12 3v12" strokeLinecap="round" />
        <path d="M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ShareSheetIOS({ t }: { t: T }) {
  return (
    <div className="flex h-full flex-col justify-end bg-move-green/5">
      <div className="rounded-t-xl bg-white p-2 shadow-[0_-4px_10px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-1.5 h-1 w-8 rounded-full bg-move-green/15" />
        <div className="mb-2 flex items-center gap-1.5 border-b border-move-green/10 pb-1.5">
          <div className="h-4 w-4 rounded-md bg-move-coral" />
          <div className="text-[6px] text-move-green/70">uniqueappcol.com</div>
        </div>
        <div className="space-y-1">
          <div className="h-3 rounded bg-move-green/5" />
          <div className="h-3 rounded bg-move-green/5" />
          <div className="flex items-center gap-1 rounded bg-move-coral/15 px-1 py-0.5 ring-1 ring-move-coral">
            <div className="h-2 w-2 rounded-sm border border-move-green" />
            <span className="text-[5.5px] font-bold text-move-green">{t.addToHomeScreen}</span>
          </div>
          <div className="h-3 rounded bg-move-green/5" />
        </div>
      </div>
    </div>
  );
}

function AddConfirmIOS({ t }: { t: T }) {
  return (
    <div className="flex h-full flex-col bg-white p-2">
      <div className="mb-2 flex items-center justify-between text-[6px] font-semibold text-move-green/50">
        <span>{t.cancelar}</span>
        <span className="rounded bg-move-coral px-1.5 py-0.5 text-white ring-2 ring-move-coral/40">
          {t.agregar}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-move-coral">
          <span className="font-brand text-[6px] font-bold text-move-green">UQ</span>
        </div>
        <p className="text-[7px] font-bold text-move-green">UNIQUE</p>
        <p className="text-[5px] text-move-green/50">uniqueappcol.com</p>
      </div>
    </div>
  );
}

function HomeScreen({ withNotch = false, opening = false }: { withNotch?: boolean; opening?: boolean }) {
  return (
    <div className="relative grid h-full grid-cols-4 gap-2 bg-gradient-to-b from-move-green/10 to-move-green/20 p-2.5 pt-4">
      {withNotch && <div className="absolute left-1/2 top-0 h-2.5 w-10 -translate-x-1/2 rounded-b-lg bg-move-green" />}
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-4 w-4 rounded-md bg-white/50" />
      ))}
      <div
        className={`flex h-4 w-4 items-center justify-center rounded-md bg-move-coral ring-2 ring-white ${opening ? "scale-125 shadow-[0_0_0_4px_rgba(255,79,63,0.35)]" : ""}`}
      >
        <span className="font-brand text-[4px] font-bold text-move-green">UQ</span>
      </div>
      {opening && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40">
          <div className="h-3 w-3 animate-pulse rounded-full bg-move-coral" />
        </div>
      )}
    </div>
  );
}

function ChromeMenu({ t }: { t: T }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-end gap-1 bg-move-green/5 px-1.5 py-1">
        <div className="h-2 w-2 rounded-full border border-move-green/30" />
        <div className="flex h-3 w-3 flex-col items-center justify-center gap-[1.5px] rounded ring-2 ring-move-coral">
          <span className="h-[1.5px] w-[1.5px] rounded-full bg-move-green" />
          <span className="h-[1.5px] w-[1.5px] rounded-full bg-move-green" />
          <span className="h-[1.5px] w-[1.5px] rounded-full bg-move-green" />
        </div>
      </div>
      <div className="flex-1 bg-move-green/5 p-1.5">
        <div className="ml-auto w-3/4 space-y-1 rounded-md bg-white p-1.5 shadow-md">
          <div className="h-2.5 rounded bg-move-green/5" />
          <div className="h-2.5 rounded bg-move-green/5" />
          <div className="flex items-center gap-1 rounded bg-move-coral/15 px-1 py-0.5 ring-1 ring-move-coral">
            <span className="text-[5px] font-bold text-move-green">{t.instalarAplicacion}</span>
          </div>
          <div className="h-2.5 rounded bg-move-green/5" />
        </div>
      </div>
    </div>
  );
}

function InstallingAndroid({ t }: { t: T }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-white p-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-move-coral">
        <span className="font-brand text-[6px] font-bold text-move-green">UQ</span>
      </div>
      <p className="text-[6px] font-semibold text-move-green">{t.instalandoUnique}</p>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-move-green/10">
        <div className="h-full w-2/3 rounded-full bg-move-coral" />
      </div>
    </div>
  );
}

type Step = { title: string; screen: React.ReactNode };

function buildIphoneSteps(t: T): Step[] {
  return [
    {
      title: t.iphoneSteps[0],
      screen: (
        <SafariChrome urlLabel="uniqueappcol.com">
          <MiniSiteHeader />
          <MiniSiteHero t={t} />
        </SafariChrome>
      ),
    },
    {
      title: t.iphoneSteps[1],
      screen: (
        <SafariChrome urlLabel="uniqueappcol.com" toolbarIcon="more">
          <MiniSiteHeader />
          <MiniSiteHero t={t} />
        </SafariChrome>
      ),
    },
    {
      title: t.iphoneSteps[2],
      screen: (
        <SafariChrome urlLabel="uniqueappcol.com" toolbarIcon="share">
          <MiniSiteHeader />
          <MiniSiteHero t={t} />
        </SafariChrome>
      ),
    },
    { title: t.iphoneSteps[3], screen: <ShareSheetIOS t={t} /> },
    { title: t.iphoneSteps[4], screen: <AddConfirmIOS t={t} /> },
    { title: t.iphoneSteps[5], screen: <HomeScreen withNotch /> },
    { title: t.iphoneSteps[6], screen: <HomeScreen withNotch opening /> },
  ];
}

function buildAndroidSteps(t: T): Step[] {
  return [
    {
      title: t.androidSteps[0],
      screen: (
        <div className="flex h-full flex-col">
          <MiniSiteHeader />
          <MiniSiteHero t={t} />
        </div>
      ),
    },
    { title: t.androidSteps[1], screen: <ChromeMenu t={t} /> },
    { title: t.androidSteps[2], screen: <ChromeMenu t={t} /> },
    { title: t.androidSteps[3], screen: <InstallingAndroid t={t} /> },
    { title: t.androidSteps[4], screen: <InstallingAndroid t={t} /> },
    { title: t.androidSteps[5], screen: <HomeScreen opening /> },
  ];
}

export default function InstalarGuide({ t }: { t: T }) {
  const [platform, setPlatform] = useState<Platform>("iphone");
  const steps = platform === "iphone" ? buildIphoneSteps(t) : buildAndroidSteps(t);

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-center justify-between">
        <Image
          src="/brand/unique-wordmark.png"
          alt="UNIQUE"
          width={854}
          height={277}
          className="h-6 w-auto"
        />
        <div className="flex rounded-full border border-move-green/15 p-1">
          <button
            type="button"
            onClick={() => setPlatform("iphone")}
            className={`rounded-full px-3 py-1 font-heading text-xs font-semibold transition ${
              platform === "iphone" ? "bg-move-green text-white" : "text-move-green/60"
            }`}
          >
            iPhone
          </button>
          <button
            type="button"
            onClick={() => setPlatform("android")}
            className={`rounded-full px-3 py-1 font-heading text-xs font-semibold transition ${
              platform === "android" ? "bg-move-green text-white" : "text-move-green/60"
            }`}
          >
            Android
          </button>
        </div>
      </div>

      <h1 className="mt-8 font-heading text-3xl font-bold text-move-green sm:text-4xl">
        {t.titleFor(platform === "iphone" ? "iPhone" : "Android")}
      </h1>
      <p className="mt-2 max-w-xl font-body text-move-green/70">{t.subtitle}</p>

      {platform === "android" && (
        <p className="mt-4 max-w-xl rounded-xl bg-move-lime/30 px-4 py-3 font-body text-sm text-move-green/80">
          <strong className="font-heading">{t.samsungWarningStrong}</strong> {t.samsungWarningBody}
        </p>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, i) => (
          <div key={i} className="rounded-2xl border border-move-green/10 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-move-green font-heading text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="font-body text-sm text-move-green/80">{step.title}</p>
            </div>
            <div className="mt-3">
              <PhoneFrame>{step.screen}</PhoneFrame>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-2xl bg-move-green px-6 py-5 text-white">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-white stroke-[3]">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-body text-sm">
          <strong className="font-heading">{t.listoStrong}</strong> {t.listoBody}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {t.features.map((f) => (
          <div
            key={f}
            className="rounded-2xl border border-move-green/10 bg-white px-3 py-4 text-center font-body text-xs font-semibold text-move-green/80"
          >
            {f}
          </div>
        ))}
      </div>

      <p className="mt-10 text-center font-body text-xs text-move-green/40">uniqueappcol.com</p>
    </section>
  );
}
