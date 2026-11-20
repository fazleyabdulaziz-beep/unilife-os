# AI Study Hub — Phase 1, 2, 3 & 4 Setup

This update adds the AI Study Hub navigation page, responsive dashboard, separate persistent conversations, and a server-side chat endpoint.

## What is included
- New `AI Study Hub` sidebar navigation route.
- Lo-Fi theme-aware desktop and mobile UI.
- Eight dashboard prompt shortcuts.
- Separate conversations with create, open, delete and persistent message history.
- Backend student context sourced from the authenticated student's own Courses, Timetable, Assignments and Examinations rows.
- Read-only AI behaviour: the assistant cannot modify student records.
- Uses the existing `GROQ_API_KEY` Script Property and `GROQ_TIMETABLE_MODEL` setting (or the existing default model). Provider selection remains a later decision; the current adapter uses the existing Groq configuration so Phase 2 chat can work without exposing a vendor choice in the UI.

## Apps Script deployment steps
1. Open the Google Apps Script project connected to the existing UniLife OS spreadsheet.
2. Add the updated files from `apps-script/`, including the new `AIStudyHub.gs` and `AIProvider.gs`. If using the Apps Script editor, copy the contents into matching script files.
3. Save all files.
4. Run the existing `setup()` function once from the Apps Script editor. Approve permissions if prompted. The additive schema migration creates `AIConversations` and `AIChatMessages`; existing sheets and columns are retained.
5. Confirm Script Properties contain `GROQ_API_KEY`. The implementation reuses `GROQ_TIMETABLE_MODEL` when set.
6. Deploy > Manage deployments > Edit the existing Web App deployment, choose a new version, and deploy. Keep the same access policy used by the existing UniLife OS API.
7. Update the GitHub Pages project with the updated frontend files from this ZIP.

## Important
- Do not put the AI API key in frontend JavaScript, `config.js`, or GitHub.
- The AI context is built on the backend from the authenticated session. Browser-supplied student context is not trusted.
- Current Phase 1/2 tool cards are prompt shortcuts into the chat. PDF upload, document summarization, quiz storage, flashcards and planner automation are planned for later phases.
- AI use is subject to the provider's quota, availability and current pricing. The implementation applies a separate per-user limit of 20 requests per six-hour window.
- AI responses can be wrong. Students should verify important academic information with their official course materials.


## Phase 3 — AI Document Intelligence
- Add `AIDocuments.gs` to Apps Script and update the other Apps Script files in this ZIP.
- Run `setup()` once again. The additive schema migration creates `AIDocuments` and `AIDocumentChunks`, and appends `document_id` to `AIConversations` without reordering existing columns.
- The frontend uses the PDF.js library already included by `index.html` to extract selectable text in the browser.
- The extracted text is stored in the user's spreadsheet rows in chunks. The original PDF bytes are not uploaded to Apps Script or stored in Drive.
- Current limits: PDF only, 8 MB per file, 50 pages, 60,000 extracted characters, 20 documents per user. Scanned/image-only PDFs are not supported because OCR is not included.
- Document-grounded conversations are linked to a library document. Summaries, study guides, quizzes and flashcards are generated through the existing AI provider adapter.
- Deploy a new Apps Script Web App version and update GitHub Pages after the schema migration.


## Phase 3 validation performed on this package
- JavaScript syntax checks: all passed.
- Apps Script syntax checks: all passed.
- English and Bahasa Melayu locale key parity: passed.
- AI Hub and document library render smoke tests: passed.
- PDF text extraction/upload API flow smoke test with a mocked PDF.js document: passed.
- Backend document ownership/storage smoke test: passed.
- CSS parse, API/schema wiring, PDF.js script order and PWA cache wiring: passed.

These are local/static and mocked smoke tests. A live deployment test against the user's Google Apps Script, spreadsheet and Groq credentials is still required after deployment.


## Phase 4 — Personal Study Intelligence
- Add `AIStudyIntelligence.gs` to Apps Script and update `Configuration.gs` and `API.gs` from this package.
- Run `setup()` again. The additive migration creates `AIStudyPlans`, `AIStudySessions`, `AIFlashcards` and `AIReviewLogs`; existing sheets and columns are retained.
- The dashboard builds a deterministic revision plan from upcoming exams already saved in UniLife OS. It creates up to seven 30-minute sessions per exam, avoids creating a duplicate active plan for the same exam, and lets students mark sessions complete.
- Flashcards can be added manually. The review queue uses an SM-2-style spaced repetition interval and ease-factor update from the student's 0–5 recall rating. Cards rated below 3 are scheduled again the next day.
- Exam readiness is a transparent heuristic based on completed generated sessions and days remaining; it is not an AI prediction or a guarantee of exam performance. It starts at 0% when no revision plan exists.
- All study plans, sessions, cards and review logs are scoped to the authenticated user. The current implementation stores up to 500 cards per user.
- Deploy a new Apps Script Web App version and update GitHub Pages.

## Phase 4 validation notes
Validation performed for this package: all frontend JavaScript and Apps Script syntax checks passed; English/Malay locale key parity passed (491 keys); CSS parsing passed; mocked plan generation, duplicate-plan prevention, session completion, flashcard review scheduling and review-log creation passed; AI Hub render smoke test passed. These are local/static and mocked checks. Live Apps Script/Sheets/Groq deployment testing is still required.


## Phase 5 — AI Learning Coach

Add `apps-script/AITutor.gs` to the Apps Script project and update all changed Apps Script and frontend files. Run `setup()` again to create `AITutorQuizzes` and `AITutorAttempts` (existing sheets and data are preserved). Deploy a new Web App version and publish the updated GitHub Pages files.

The coach generates five multiple-choice questions for a selected topic using the existing Groq configuration. Correct answers remain server-side until submission. Attempts are stored per user and topic-level accuracy is used to surface areas for further practice. The weak-topic indicator is a learning signal from quiz history, not a formal diagnosis of ability.
