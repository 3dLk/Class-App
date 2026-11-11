# Horaire Cégep (PWA)

PWA Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Lucide. Données dans `localStorage`, aucun serveur ni base de données.

## Développement

```bash
npm install
npm run dev        # http://localhost:3000 (service worker désactivé en dev)
npm run build      # build de production
npm start          # sert le build (service worker actif)
npm run icons      # régénère les icônes PNG de public/icons
```

## Structure

| Chemin | Rôle |
| --- | --- |
| `app/layout.tsx` | Meta-tags iOS (`apple-mobile-web-app-capable`, `viewport-fit=cover`, icône, écran de démarrage iPhone 13) |
| `app/manifest.ts` | Manifeste servi sur `/manifest.webmanifest` |
| `public/sw.js` | Service worker natif : hors ligne + clic sur notification |
| `components/ScheduleTab.tsx` | Onglet Horaire (jours, cours en cours / prochain) |
| `components/TasksTab.tsx` | Onglet Devoirs / Examens, tri par date limite |
| `components/SettingsTab.tsx` | Session, rappels, export `.ics`, sauvegarde JSON |
| `lib/store.tsx` | Stockage local |
| `lib/ics.ts` | Génération du fichier iCalendar (cours hebdomadaires + échéances, avec alertes) |
| `lib/notifications.ts` | Rappels via la Web Notifications API |

## Limite des notifications sur iOS

iOS n'autorise les notifications web que pour une app **ajoutée à l'écran d'accueil** (iOS 16.4+), et une PWA ne peut pas programmer de rappel quand elle est fermée. Les rappels partent quand l'app est ouverte ou revient au premier plan. Pour des alertes garanties, utiliser **Réglages > Exporter en .ics** : chaque événement importé dans Calendrier contient ses propres alertes.

Après une modification de `public/sw.js`, incrémenter `VERSION` dans ce fichier.
