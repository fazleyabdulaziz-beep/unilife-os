# AI Study Hub — Phase 1 & 2 Setup

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
