# ⛔ BUILD GATE (system audit, 18 Nov 2026) — read before changing anything

Evidence: since the 22 Oct commitment (225, then 350 dials/week) War Room logged 3 dials and 0 owner
conversations, while the app went 13.0 → 13.20 and 25+ plan documents were written. The constraint is
execution, not tools. Every Claude session that builds War Room, plans, or writes study material must:

1. **Check the number first** (Supabase, SELECT only): dials logged this week (Mon..today) in the main row
   (days.<date>.counters.dials, or :queue log entries).
2. **If the week is under its floor** (floor = 20 dials × weekdays so far, Mon–Sat): say so plainly, in one
   line with the number, and ask Egor to do the next dial block first. Do not start building until he has
   either dialled or explicitly overridden the gate *in that message* ("override the gate").
3. **Allowed regardless:** critical bug fixes that block dialling, logging or data integrity; calendar/tasks
   housekeeping he asks for; tennis-coaching admin.
4. **Earned builds:** one feature/plan change per 100 dials logged. Keep a line in the changelog: "built X ·
   dials at the time: N".

The aim (Egor's own principle, 15 Nov): "War Room exists to improve my life outside War Room."

