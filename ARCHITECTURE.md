# UniLife OS — Architecture & Sheet Schema

Frontend (GitHub Pages): index.html, css/, js/, locales/ -> JSON over HTTPS -> Google Apps Script Web App (Phase 2) -> Google Sheets.

Every user-owned row has `id` (unique) and `user_id`. The backend derives user_id from the session token, never from the request body.

| Sheet | Columns |
|---|---|
| Users | id, email, password_hash, salt, name, university_id, created_at |
| UserPreferences | user_id, font, theme, lang, density, widget_order, widget_hidden, notif_json |
| Universities | id, name, country |
| Semesters | id, user_id, label, academic_year, start, end, gpa |
| Courses | id, user_id, semester_id, code, name, credit, grade |
| Timetable | id, user_id, course_id, day, start, end, room, lecturer |
| Assignments | id, user_id, course_id, title, due, priority, status, notes |
| Examinations | id, user_id, course_id, date, time, venue, revision |
| Finance | id, user_id, kind(tx/goal/budget), type, category, amount, date, target, saved |
| Habits | id, user_id, kind(habit/task/goal), name, days_json, done, progress |
| Notifications | id, user_id, type, ref_id, fire_at, sent_at, status, attempts |
| PushSubscriptions | id, user_id, endpoint, p256dh, auth, created_at |
| ActivityLogs | id, user_id, action, entity, at |

Design system: tokens in css/themes.css (light/dark via `data-theme`, density via `data-density`); components in css/main.css; text only via locales/*.json and `UL.i18n.t()`.
