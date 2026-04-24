# TallySpace (Run This First)

## Run locally
Because this app uses ES modules, serve the repository with a local static server.

### Option A: Python
```bash
python3 -m http.server 8000
```
Then open: http://localhost:8000

### Option B: Node (if `serve` is installed)
```bash
npx serve .
```

## What you should see
- Current day, cash, ships, crew counts.
- Buttons to advance 1 or 10 days.
- Event log that updates with each tick.
