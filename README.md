# Flight picker: Final Prototype (CS6750 HCI, Jonah Adler)

This is a medium-fidelity, fully clickable prototype for a one-way flight from ORD to SFO. It combines three earlier low-fi designs:
the **Simple list** (the base), the **Pin tray** for comparing, and an optional **Guided** entry.
It runs as plain static files (`index.html`, `styles.css`, `app.js`). There is no build step, no framework, no CDN and no backend.
All flights are fictional and exist only for this class prototype.

## Run locally
```bash
cd final-prototype
python3 -m http.server 8000
# open http://localhost:8000/            (participant view)
# open http://localhost:8000/?facilitator=1  (facilitator panel open)
```
You can also open the panel at any time by pressing **Shift+F**.

## Deploy to GitHub Pages (`<user>.github.io`)
1. Create a repo named `<user>.github.io`, or use any repo with Pages turned on.
2. Copy the contents of this folder to the repo root, or to a subfolder such as `/flight-prototype/`. All paths are relative, so both work.
3. Run `git add . && git commit -m "Final prototype" && git push`.
4. In the repo, go to **Settings → Pages → Deploy from branch → main / (root)**.
5. Open `https://<user>.github.io/` (or `/flight-prototype/`). Add `?facilitator=1` to the URL for sessions.

## What's in the prototype
- **Header strip:** ORD → SFO · One-way · Tuesday of next week (computed from today) · 1 adult · Checked bags 0/1/2 (default 1, $35 each).
- **Entry choice:** "Help me choose" or "Skip, show all flights". A **Guided | All flights** toggle in the top bar switches modes at any time. Switching keeps your pins, answers and bags.
- **All flights (Simple list):** each row shows only the times, the stops with layover length (or the trip time, through the **Show: Stops | Trip time** switch), and the total for the selected bags. A banner reads "Prices include N checked bag(s)". **Details** shows the flight numbers, the operator, the fare (Economy), and the fare options in plain words with full prices. Each option also gives the airline's own fare name and a one-line meaning.
- **Pin tray:** each row has a large pin button with `aria-pressed` and an `aria-label`. On first view, a coach line ("Pin two flights to compare") appears and the first pin pulses. The hint shows once per browser session and stops after you dismiss it or pin a flight. With 1 pin, the tray is a single bar. With 2 pins, it shows a side-by-side table: differences are **bold** and matching values are gray (legend: "Bold = different · gray = same"). Pinning a 3rd flight asks which pin to replace. You can unpin or select directly from the tray.
- **Guided:** three questions: arrive by (8 AM, 10 AM, noon, 3 PM, 5 PM, any time), OK with a stop (yes/no), and checked bags. The answers stay editable above the picks, and the picks update live. If no flight fits, a message offers relax buttons ("Allow a stop", or "Arrive by <next time that has a fit> instead").
- **Confirmation:** "You picked: … Total $X with N checked bag(s)", with **Back to results** and **Start over**. No payment is taken.

## Pricing
`base = total_with_1_bag − 35` and `total(N bags) = base + 35 × N`. The **Carry-on only** fare equals `base` (that is, the total minus $35). The **1 checked bag included** fare equals the listed total.

| # | Depart – Arrive | Trip | Stops | Flights | 0 bags | 1 bag | 2 bags |
|---|---|---|---|---|---|---|---|
| 1 | 6:00 AM – 8:38 AM | 4h 38m | Nonstop | UA 1191 | $294 | $329 | $364 |
| 2 | 7:45 AM – 1:20 PM | 7h 35m | 1 stop, 1h 15m DEN | UA 2217 + UA 640 | $203 | $238 | $273 |
| 3 | 10:05 AM – 4:45 PM | 8h 40m | 1 stop, 1h 50m DEN | UA 1450 + UA 2383 | $219 | $254 | $289 |
| 4 | 11:30 AM – 2:10 PM | 4h 40m | Nonstop | UA 1543 | $254 | $289 | $324 |
| 5 | 2:15 PM – 4:58 PM | 4h 43m | Nonstop | UA 652 | $239 | $274 | $309 |
| 6 | 5:40 PM – 8:25 PM | 4h 45m | Nonstop | UA 2044 | $274 | $309 | $344 |

## How guided picks are computed (in `computePicks()` in app.js)
- **Fits** means the flight arrives at or before the "arrive by" time, and it is nonstop if "OK with a stop" is No.
- **Cheapest that fits:** the lowest total for the chosen bags. Ties go to the shorter trip.
- **Fastest that fits:** the shortest trip time. Ties go to the lower price.
- **Best balance:** the lowest **score = total price + $25 × trip hours**, so an hour of your time counts as $25. Ties go to the lower price. Bags add the same amount to every flight, so they never change the ranking.
- If two labels land on the same flight, they share one card, and the card shows each label's reason and "Why?" rule. Every "Why?" states the plain rule. The Best balance "Why?" also lists the top three scores.

## Scenarios for facilitators (answer key: don't show participants)
Open the panel with `?facilitator=1` or **Shift+F**. To run a task: choose a scenario, read the text aloud, and press **Start task**. Start task resets the prototype and also re-arms the one-time pin hint. The task ends when the participant selects a flight.

| | Read aloud | Correct answer (solved from the data in code) |
|---|---|---|
| S1 | Be in San Francisco by 5 PM, 1 checked bag, spend as little as possible. | **Flight 2**, 7:45 AM – 1:20 PM, 1 stop in DEN, **$238** |
| S2 | Nonstop leaving after 10 AM, carry-on only, cheapest. | **Flight 5**, 2:15 PM – 4:58 PM nonstop, **$239 at 0 bags** ($274 with 1). The participant must switch bags to 0. |
| S3 | 1 checked bag, shortest trip that lands before 3 PM. | **Flight 1**, 6:00 AM nonstop, **4h 38m**, $329. Trap: Flight 4 is 4h 40m. |
| S4 | Use Help me choose: arrive by 5 PM, a stop is OK, 1 bag. Explain why "Best balance" was recommended, then pick. | **Flight 5**, 2:15 PM nonstop, $274. Its score is $274 + $25 × 4.72 h ≈ **$392**, the lowest (11:30 AM ≈ $406; 6:00 AM ≈ $445; 7:45 AM ≈ $428; 10:05 AM ≈ $471). A good explanation: "Nonstop, only $36 more than the cheapest, but about 3 hours shorter." Mark the explanation with the Correct/Incorrect buttons. |

Other combinations checked by the tests (cheapest / fastest / best balance):
- Any time, stop OK: 2 / 1 / 5
- By 3 PM, nonstop only: 4 / 1 / 4
- By noon, nonstop only: 1 / 1 / 1
- By 8 AM: no fit; the relax button offers "Arrive by 10:00 AM instead"

### What the log records (per task)
- Seconds on task and clicks (participant view only)
- **Look-backs** = Details re-opens (opening Details again for a flight already viewed) + scroll-ups (scrolling back up ≥ 250 px from the furthest point reached). This is an approximation.
- Details opens and "Why?" opens
- First mode and modes used
- **pinUsedUnprompted:** no scenario mentions pins, so any pin counts as unprompted. Also the number of pin actions.
- Chosen flight, bags at the time of choice, expected flight, correct/incorrect, and the S4 explanation mark

The log is saved in `localStorage`, so it survives reloads. It can be exported as **CSV** or **JSON**, and **Clear log** wipes it. The participant view never shows answers. The answer key sits in a collapsed section inside the panel.

## Tests
`tests/test_proto.py` uses Playwright with headless Chromium. It clicks through every feature and all four scenarios, checks the guided picks for all 36 answer combinations against an independent calculation, checks for console errors and mobile overflow, and regenerates `screenshots/` (1280×800):
`a_entry_choice, b_all_flights_coach_hint, c_details_open, d_two_pinned_tray, e_swap_prompt, f_guided_questions, g_guided_picks_why, h_confirmation, i_facilitator_panel`.
```bash
pip install playwright && python3 -m playwright install chromium   # or edit executable_path to a local Chrome
python3 tests/test_proto.py
```
