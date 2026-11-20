# War Room · intelligence backlog

Order is by dependency, then by value. Each item has the test that decides whether it is done.

| # | Item | Brief | Done when | State |
|---|---|---|---|---|
| 1 | The system's own weekly forecasts, marked and compared with a naive rule, with a replay over past weeks | 11 | Forecast exists before the week; marked after it; replay numbers match a hand calculation | **Done 13.58.0** (`forecast.js`, test_1358) |
| 2 | Kind of claim on every number the main screens show (eight kinds), one tap to see where it came from | 3, 3.2 | Mission Control, scorecard, day header and money totals each show the kind; a test plants one of each | **Partly, 13.60.0**: scorecard rows and a page for today's numbers; not yet inside the day header, money screen or Mission Control |
| 3 | "Happened at" kept apart from "recorded at" for day entries, calls and money | 3.1 | An entry made two days late is shown as late and excluded where timing matters | **Partly, 13.60.0**: day records changed on a later day are counted and shown; per-entry times for calls and money, and exclusion, not built |
| 4 | What changed since last week, per part of life | 3.3 | A seeded change appears; an unchanged week says so | After 3 |
| 5 | Hypotheses as records, each tied to an experiment or marked untested | 8.1, 8.2 | A hypothesis cannot be marked true without an experiment result | After 2 |
| 6 | Tested cross-domain links (for example sleep and next-day dials) with a minimum of 20 paired days and a plain "not enough" below it | 4.1 | With 19 pairs it refuses; with 20 it shows the difference and its size | After 3 |
| 7 | More forecast variables and probability forecasts by the system, with calibration | 11 | Brier score against a base rate | After 1 has four real weeks |
| 8 | Drift note: when the last four weeks stop resembling the four before | 11 | Seeded shift is flagged; noise is not | After 7 |
| 9 | Gap engine weighted by the decision a gap blocks | 15 | The top gap names the decision it would unblock | After 2 |
| 10 | Simulation with ranges in the Future Lab | 10 | Only after items 1 and 7 show the method beats the naive rule on his data | Blocked on evidence |
| 11 | Hardware opportunity assessment (document, no purchase) | 6, 21 | Each candidate has the fourteen answers the brief lists, with sources | Not started |
| 12 | World-model validation; search service for server research | 7 | His decision on a search service first | Blocked on him |
