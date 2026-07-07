import { Poppins, Inter } from "next/font/google";

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// TAN Canard es de pago y no existe todavía en src/fonts/tan-canard/.
// Ver src/fonts/tan-canard/README.md para instrucciones de activación.
// Cuando tengas el archivo, reemplaza este bloque por:
//
// import localFont from "next/font/local";
// export const tanCanard = localFont({
//   src: "../fonts/tan-canard/TanCanard-Bold.woff2",
//   variable: "--font-tan-canard",
//   weight: "700",
//   display: "swap",
// });
//
// y quita `tanCanardFallbackVariable` de layout.tsx.
export const tanCanardFallbackVariable = "font-tan-canard-fallback";
