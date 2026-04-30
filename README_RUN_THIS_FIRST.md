# TallySpace - Run This First

## Version
Current playable version: **v0.3.0**

## Requirements
- Any modern browser (Chrome, Firefox, Edge, Safari)
- Optional: Python 3 for local static hosting

## Exact run command (recommended)
From the project root:

```bash
python3 -m http.server 8080
```

Then open:
- `http://localhost:8080`

## What you can do in v0.3.0
- Advance 1 or 10 days and monitor economy/morale.
- Hire crew with archetypes, traits, XP, level, and history.
- Assign captain and change ship operation mode (LOW/NORMAL/HIGH).
- View sector map systems and connected travel destinations.
- Travel between systems (captain/fuel/integrity required).
- Use contract board to accept one mission at a time.
- Complete/fail contracts with payouts, damage risk, morale impact, and XP gain.
- Refuel and repair based on local system prices/modifiers.
- Export full simulation JSON and copy JSON with visible feedback + fallback download.

## Notes
- Contract board refreshes every 5 days and removes expired entries.
- Export includes version, systems, contracts, crew progression data, ship readiness/location, and last 300 events.

## v1.0.1 — Real New Game Flow
- Start with no save data to open the 3-step New Game setup.
- Step 1: Enter captain name, choose one archetype, choose command style.
- Step 2: Choose exactly two companions from five generated candidates.
- Step 3: Choose one starter ship and press **Start Company**.
- Reset save via browser localStorage clear or in-app Reset Save flow.

### What v1.0.1 adds
- Real captain archetype + companion + starter ship setup.
- Setup choices now initialize live game state and are exported in JSON.
- Crew pools initialize near 70% of chosen ship optimal crew.

### Known limitations
- Save rehydration is still not fully implemented.
- Continue flow currently prompts reset/continue message before entering a fresh session.
