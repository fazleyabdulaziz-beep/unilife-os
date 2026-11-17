# UniLife OS 2.0 — Smart Timetable AI (Groq + Qwen)

## What changed
- Added Smart Timetable Import to the Timetable page.
- Accepts timetable photos (JPG/PNG/WEBP), PDFs (up to 3 pages), and pasted lecturer text.
- Sends the content to Groq Qwen Vision through Google Apps Script.
- Shows an editable review before saving.
- Checks existing duplicates and overlapping sessions before import.
- Uses the existing Timetable sheet and existing Calendar auto-sync flow.
- Existing CSV importer remains available.

## 1. Configure Groq
1. Create an API key at https://console.groq.com/keys
2. Open the UniLife OS Apps Script project.
3. Open Project Settings → Script Properties.
4. Add `GROQ_API_KEY` = your Groq API key.
5. Optional: add `GROQ_TIMETABLE_MODEL` = `qwen/qwen3.8-27b`.
6. Do not put the API key in GitHub, `js/config.js`, or any frontend file.

The Qwen model ID is configurable because Groq may change model availability. The currently documented model is `qwen/qwen3.8-27b`. It is a Preview model, so Groq may change or retire it.

## 2. Update Apps Script backend
The `apps-script/` folder contains the complete backend source set based on the files supplied with this project, plus `GroqTimetable.gs`.
1. Open the existing Apps Script project linked to your current Web App.
2. Add the new `GroqTimetable.gs` file.
3. Replace the existing `API.gs` with `apps-script/API.gs`.
4. Replace the existing `Configuration.gs` with `apps-script/Configuration.gs`.
5. Keep all other existing backend files. If you prefer, compare them with the matching files in this folder; they were copied from the supplied backend files.
6. Save, then Deploy → Manage deployments → Edit → New version → Deploy.
7. Keep the same Web App URL in `js/config.js` if you updated the existing deployment.

The API action is authenticated with the existing UniLife session. AI uploads are not written to Google Drive or Sheets. The model response is returned to the browser for review.

## 3. Deploy frontend
1. Extract this ZIP.
2. Replace your local project files with the contents of `unilife-os 2.0/` (keep your `.git` folder if you want to preserve your local Git history; this ZIP intentionally excludes `.git`).
3. Commit and push to GitHub Pages.

## 4. Use Smart Timetable Import
1. Open UniLife OS → Timetable → AI Import.
2. Upload a timetable photo/PDF or paste lecturer schedule text.
3. Select Analyze timetable.
4. Review and correct every extracted class.
5. Confirm & Add.

## Limits and privacy
- Maximum 3 images/pages per analysis; each source file is limited to 12 MB in the browser.
- Groq account rate limits apply and are shared by users of the same API key. This backend also applies a per-user limit of 10 analyses per rolling 6-hour window and a 15-second cooldown.
- Timetable contents are sent to Groq for inference. Do not upload documents containing sensitive personal information unrelated to the timetable.
- Qwen is not guaranteed to interpret every timetable correctly. Review every row before importing.
- PDF pages are rendered in the browser to JPEG images before upload.
