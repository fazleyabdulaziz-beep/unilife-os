# UniBot Voice Companion Setup

## Frontend
The updated frontend adds the graduation-cap mascot, greeting bubble, bilingual greeting, browser Text-to-Speech, voice controls, and automatic speech for AI replies.

## Apps Script backend
1. Open the Apps Script project connected to this UniLife OS deployment.
2. Add a new script file named `UniBot` and paste the contents of `apps-script/UniBot.gs`.
3. In `apps-script/API.gs`, add the `case 'unibotChat': return uniBotChat_(uid, d);` route (already included in this project copy).
4. Confirm Script Properties contains `GROQ_API_KEY`. The assistant reuses `GROQ_TIMETABLE_MODEL`; if that property is absent, it uses the same default model as the timetable AI.
5. Save the Apps Script project and deploy a **new version** of the existing Web App deployment. Keep the same deployment URL in `js/config.js`.

## Voice behaviour
- Speech uses the browser's built-in Web Speech API; there is no separate TTS API key.
- The greeting bubble appears on the first successful app load in a browser tab session.
- Browsers may block audio until the user interacts with the page. If that happens, tap **Tap to hear UniBot**.
- The speaker button in the chat header enables/disables voice. The waveform button toggles automatic speech for replies. The chat bubble button toggles automatic greetings.
- Voice availability and accent depend on voices installed by the browser/operating system. The app tries `en-SG` and `ms-MY`, with browser fallback when those voices are unavailable.
- Preferences are saved locally in the current browser profile.

## Important
This package has been syntax-checked for JavaScript. The Apps Script endpoint still needs to be added/deployed in the user's Apps Script project and tested with their own Groq credentials. Browser audio behaviour must be tested on the target browser/device.
