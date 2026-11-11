import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const APP_NAME = "Horaire Cégep";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Horaire de cours, devoirs et examens pour le Cégep de Sainte-Foy.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: {
    capable: true,
    title: "Horaire",
    // Contenu sous la barre d'etat : on gere l'espace avec env(safe-area-inset-top)
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        // Ecran de demarrage iPhone 13 / 13 Pro / 14 (390 x 844 @3x)
        url: "/icons/splash-1170x2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Balise historique encore lue par iOS pour le mode plein ecran
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
