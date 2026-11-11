# Push notification setup

1. **Firebase web config** (`js/push-config.js`): Firebase console > Project settings > Your apps > Web app.
   Copy the full config. `appId` must look like `1:112009133406:web:xxxxxxxx` (NOT just the sender ID).
2. **Service account** (backend): Firebase console > Project settings > Service accounts > Generate new private key.
   In Apps Script: Project Settings > Script Properties > add `FCM_SERVICE_ACCOUNT` = the whole JSON file contents.
   Never commit this file.
3. In the Apps Script editor, run `setup()` again (updates the PushSubscriptions columns to id, user_id, token, platform, created_at),
   then run `installTriggers()` once (checks reminders every 15 minutes).
4. Deploy a NEW version of the Web App (Deploy > Manage deployments > Edit > New version).
5. Deploy the frontend. In the app: Settings > Notifications > Enable push, then "Send test".

iPhone/iPad: the app must be added to the Home Screen first (iOS 16.4+).
