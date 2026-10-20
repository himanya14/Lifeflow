
# LifeFlow — Synchronized Donor + Hospital Portals

A full-stack donor-side prototype based on the LifeFlow capstone PPT.

## What changed in this build
- Login redesigned to fit within one desktop/laptop screen without vertical scrolling
- Backend connection indicator in the top bar
- Backend server time endpoint (`GET /time`)
- Visible "Synced Xs ago" indicator with backend time
- Dashboard auto-sync every 5 seconds
- Eligibility + screening history auto-sync every 5 seconds
- Emergency requests auto-sync every 5 seconds
- Donation history, notifications and activity auto-sync every 5 seconds
- Donor profile is re-fetched from FastAPI every 5 seconds
- Manual **Sync now** buttons on Overview and Emergencies
- Screening submission confirms backend save and re-evaluates eligibility
- Emergency Accept/Decline and journey changes immediately re-fetch backend data
- UTC-tagged API timestamps for consistent local-time rendering

## Implemented
- Login + registration
- Donor profile and preferences
- Emergency availability + adjustable alert radius
- Smart health pre-screening with explainable rule codes
- Hemoglobin check
- Screening freshness / expiry
- Donation interval calculator (56-day whole blood, 112-day double red cell)
- Readiness score
- Donor Health Passport
- Recovery timeline
- "Can I donate today?" safety lock
- Blood compatibility explorer
- Emergency request filtering
- Distance / ETA simulation
- "Why you were matched" explainability
- Emergency map-style radius visualization
- Accept / decline
- Active emergency response mode
- Journey statuses: en route → arrived → completed
- Completed emergency automatically creates a donation record
- Donation history + downloadable record
- Notifications
- Activity / audit trail
- Seeded realistic demo data
- Idempotent seed logic (no duplicate donor_code crash)
- Seeded synthetic donor directory covering all eight standard ABO/Rh blood groups: O-, O+, A-, A+, B-, B+, AB-, AB+
- Hospital command center with donor coverage and low-stock warnings
- Hospital donor directory with group counts, screening readiness, availability and approximate distance
- Explainable donor match analysis with compatibility / eligibility reasons and distance-based ranking
- What-if dispatch simulator for testing declines and escalation without changing real records
- Hospital inventory seeds every blood group idempotently, including when an older database already exists

## Demo credentials
Email: aarav@lifeflow.com
Password: lifeflow123

## Run backend (PowerShell)
```powershell
cd backend
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If `python` is not on PATH, use:
```powershell
& "C:\Users\himan\AppData\Local\Programs\Python\Python313\python.exe" -m venv .venv
```

Health check:
http://127.0.0.1:8000/health

Swagger:
http://127.0.0.1:8000/docs

## Run frontend (new terminal)
```powershell
cd frontend
npm install
npm run dev
```

Open:
http://localhost:5173

## Reset demo database
Stop backend, then:
```powershell
Remove-Item .\lifeflow.db
```
Restart Uvicorn.

## Prototype note
Medical rules and thresholds in this prototype are for demonstrating software flow. They are not a substitute for clinical screening or production blood-bank policy.


## Hospital portal
Open `http://localhost:5173/hospital` for the separate hospital workspace. Both portals use the same FastAPI API and SQLite database. Hospital requests are saved as shared emergency requests; eligible donors matching blood group, alert radius and backend eligibility receive in-app notifications. Hospital request response lists refresh from the database.

### Hospital demo accounts
- Apollo Hospitals: `apollo@lifeflow.com` / `apollo123`
- CARE Hospitals: `care@lifeflow.com` / `care123`
- AIG Hospitals: `aig@lifeflow.com` / `aig123`

### Donor demo accounts
- `aarav@lifeflow.com` / `lifeflow123` (B+)
- `nisha.o.neg@lifeflow.com` / `donor123` (O-)
- `kabir.o.pos@lifeflow.com` / `donor123` (O+)
- `meera.a.neg@lifeflow.com` / `donor123` (A-)
- `arjun.a.pos@lifeflow.com` / `donor123` (A+)
- `zoya.b.neg@lifeflow.com` / `donor123` (B-)
- `ishaan.ab.neg@lifeflow.com` / `donor123` (AB-)
- `tara.ab.pos@lifeflow.com` / `donor123` (AB+)

All added donor accounts and locations are synthetic demo records, not real or verified donors. The dispatch lab is a simulation only: it does not contact donors or modify live request records. The portals are separate interfaces with shared backend records. Donor matching and eligibility are prototype rules, not medical clearance. The map is coordinate-based rather than a third-party live map, and notifications are in-app rather than SMS/push.


## UI refresh (CINTRA-inspired)
- Preserves the existing LifeFlow donor and hospital workflows and backend/API integration.
- Refines the interface with a light operational-console layout, deep navy, restrained brass/gold accents, clearer status hierarchy, stronger focus states, denser data panels, and responsive mobile navigation.
- Donor workspace includes readiness, health passport, screening, eligibility/recovery timeline, emergency matching, donations, activity, notifications, and profile.
- Hospital workspace includes emergency requests, inventory, donor directory, command-centre views, matching, and simulation/processing feedback where implemented.
- The interface is a prototype; clinical eligibility and donation decisions must be verified by qualified medical staff.


## Dashboard pages added from the supplied UI references
- Donor overview: health/readiness intelligence cards, health passport, recovery timeline, alert filtering and emergency activity.
- Hospital command centre: compact operations navigation, live request/inventory KPIs, an illustrative coverage-map panel, response-activity chart, priority watch, donor group coverage, and latest emergency requests.
- Existing donor pages remain available for screening, eligibility, emergencies, donations, activity, notifications and profile.
- Existing hospital pages remain available for requests, new request, inventory, donor directory, match/dispatch simulator and responses.
- The coverage map and weekly bar chart are visual prototype summaries, not a live geographic map or historical analytics feed.


## Reference-inspired dashboard implementation
- Added a donor readiness indicator panel and an emergency-request mix visualization using current donor dashboard API counts.
- Hospital command centre now calculates its seven-day request/response chart from request records returned by the backend rather than fixed illustrative bar values.
- Added a blood-group inventory chart and request-status breakdown from current inventory/request API data.
- Hospital navigation is a persistent left operations rail on desktop and becomes horizontally scrollable on smaller screens.
- Kept the donor health-screening, eligibility, emergency, donations, activity, notifications, profile, and hospital request/inventory/directory/matching/dispatch pages.
- The coverage map remains an illustrative schematic, not a live geospatial map. No clinical decisions should be made from prototype visuals.
