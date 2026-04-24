# TallySpace - Run This First

## What this is
A small, framework-free, browser simulation foundation for TallySpace.

## Requirements
- Any modern browser (Chrome, Firefox, Edge, Safari)
- Optional: Python 3 for a local web server

## Quick start
### Option 1: Open directly
1. Open `index.html` in your browser.

### Option 2: Local server (recommended)
From the project root:

```bash
python3 -m http.server 8080
```

Then open:
- `http://localhost:8080`

## How to use
- Click **Advance 1 Day** to simulate a single day.
- Click **Advance 10 Days** to batch-simulate ten days.
- Watch stats and event log update in real time.

## Current scope
Implemented:
- Seeded RNG
- Day-based game loop
- Company state (cash, fleet, crew, event log)
- Ship state and daily fuel use
- Crew attributes and daily morale/fatigue updates
- Event logging system to UI

Not implemented yet:
- Hiring/firing UI
- Trading/contracts/economy
- Combat and tactical actions
- Save/load system
- Multi-ship assignment rules
