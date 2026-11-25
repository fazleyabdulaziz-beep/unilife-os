# UniLife OS — Complete Theme Engine Update

## What's included

- A separate `visualTheme` preference, independent of the existing accent palette and light/dark appearance settings.
- Five complete visual packs: Classic, Lofi Study, Forest Camp, Dreamy Sky and Pixel Gamer.
- Login, registration, forgot-password and reset-password pages can select a visual pack before signing in.
- Dashboard Theme Studio button and Settings → Appearance use the same theme library.
- Theme styling covers the application shell, navigation, cards, dashboard widgets, forms, dialogs, AI workspace and UniBot surfaces.
- UniBot changes its visual character by pack: original bot, cat, fox, cloud or neon robot.
- Visual theme preference is stored locally and in the account's Apps Script preference record.
- Service Worker cache version bumped to `unilife-v30-complete-visual-theme-engine` and `css/theme-packs.css` added to the app shell cache.

## Deploy steps

1. Replace the GitHub Pages project files with the contents of this ZIP.
2. Open the Google Apps Script project used by UniLife OS and replace its `API.gs` with the updated `apps-script/API.gs` from this project.
3. Save and deploy a new Apps Script Web App version using the same deployment settings and URL already configured in `js/config.js`.
4. Reload the app. If an older theme remains cached, close the installed PWA/browser tab and reopen it after the Service Worker activates, or clear the site's cached data once.
5. Choose a theme on the login screen or use the palette button in the dashboard top bar.

## Notes

- The original `palette` preference remains available as an advanced accent palette for Classic. Other visual packs define their own coherent colour systems.
- Light/dark appearance remains a separate setting. Lofi, Forest and Sky include dark variants; Pixel Gamer is intentionally dark-first.
- Theme selection does not change application data, account records, module behaviour or API business logic.
- Google Fonts are loaded from Google Fonts; system font fallbacks remain available if the network is unavailable.
