# NOVA · War Room 6.0 interface

A new interface layer over the same data. Files: `nova.js`, `nova.css`. Nothing new is stored: every action calls the existing app functions (outcome, toggle habit, timers, weigh-in, shutdown, command parser).

| Instrument | What it does | Why it exists |
|---|---|---|
| Orbit | The day as a 24-hour dial from the calendar; a live "now" needle; dials/body/mind rings inside; tap an arc to see, move or cancel a block; one action button for this minute; Chisinau + Florida clocks with "owners reachable" | See the whole day at a glance and do the one next thing |
| Reactor | Dial mode: one dot per dial of today's target, a core that pulses on every dial, session pace and the time the target will be hit; swipe the agency card (← no answer, → owner, ↑ voicemail, ↓ gatekeeper) | Make the dial block fast and physical |
| Pulse | The 7 standards as a constellation (kept neighbours link up), the three rings, one-tap weigh-in / meal / training / study / lights out / shutdown, rank | Body and discipline in one screen |
| Vector | Checkpoints to 1 July 2027 on one rail with "your pace" markers; 7-day velocity; 2,000-dial and 100-owner ETAs; last 28 days; a 30-day scrubber | Shows whether today's pace reaches the goal |
| Command orb | Speak (where the browser supports it) or type; preview → confirm → undo | Log without navigating |

- First run: boot sequence + 6-step tour (replay from the grid button).
- All classic screens: grid button, top right. A floating "NOVA" pill brings you back.
- Off switch per device: More → Appearance → Classic screens (`localStorage['wr-ui']='monolith'`).
- Keyboard on desktop: 1–4 switch instruments.
