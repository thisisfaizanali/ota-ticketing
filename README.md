# Ota Ticketing

A mini ticketing app: browse upcoming events, book a ticket, show it as a QR code, and check it in at the gate.
An Express + Prisma + MySQL API in `api/` and an Expo (React Native) app in `app/`.

## Features

- List upcoming events with venue, date, price and tickets left
- Book 1–4 tickets for an event, with no overselling under concurrent bookings
- "My tickets" screen showing each ticket as a QR code
- Gate check-in that accepts a ticket only once
- Jest test that fires concurrent bookings at the last ticket (plus a double check-in test)
- QR scanner for check-in using `expo-camera`
- English / Japanese UI with i18next (follows the device language, toggle in the header)

## Stack

| Part | Version |
| --- | --- |
| Node.js | >= 22.9 |
| Express | 5 |
| Prisma | 7 (MariaDB driver adapter) |
| MySQL | 8.4 (Docker image `mysql:8.4`) |
| TypeScript | 6 |
| Expo SDK | 58 (Expo Router) |
| React Native | 0.88 |

## Repo structure

```
api/   Express + Prisma REST API, MySQL via Docker Compose, Jest tests
app/   Expo app: events, my tickets (QR), scanner, EN/JA
```

## Prerequisites

- Node.js >= 22.9
- Docker Desktop (or your own MySQL 8)
- An Android phone with Expo Go, on the same Wi-Fi as the PC

The commands below use bash syntax (`cp`, single-quoted JSON in curl). On Windows, run them in Git Bash or WSL; PowerShell mangles the curl quoting.

## Run the API

```bash
cd api
cp .env.example .env
docker compose up -d
npm ci
npx prisma migrate deploy
npm run db:seed
npm run dev
```

The API listens on `http://localhost:3000` (`PORT` in `.env`). MySQL runs in Docker on host port **3307** (not 3306, so it won't clash with a local MySQL).

Run the tests (needs the database up and migrated):

```bash
npm test
```

**Using your own MySQL:** skip `docker compose up -d` and point `DATABASE_URL` in `api/.env` at your server, e.g. `mysql://USER:PASSWORD@localhost:3306/ota`. Create the `ota` database first, then run the migrate and seed steps as above.

## Seeded data

`npm run db:seed` resets the database to this data. Event dates are relative to when you seed.

Users (send the id as `X-User-Id`):

| id | name |
| --- | --- |
| 1 | Aiko |
| 2 | Kenji |
| 3 | Yui |

Events:

| id | name | venue | date | price (JPY) | tickets left |
| --- | --- | --- | --- | --- | --- |
| 1 | Tokyo Jazz Night | Blue Note Tokyo | seed + 3 days | 8000 | 50 |
| 2 | Indie Rock Live | Shibuya O-East | seed + 7 days | 5500 | **2** |
| 3 | J-Pop Festival | Saitama Super Arena | seed + 14 days | 12000 | 200 |
| 4 | Acoustic Evening | Billboard Live Osaka | seed + 21 days | 6500 | 30 |
| 5 | Electronic Showcase | Zepp Haneda | seed + 30 days | 7000 | 100 |

Event 2 has only 2 tickets left, handy for trying a sold-out (409) booking.

## Run the app

```bash
cd app
cp .env.example .env
```

Edit `app/.env`:

```
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000
EXPO_PUBLIC_USER_ID=1
```

`EXPO_PUBLIC_USER_ID` picks which seeded user the app acts as (1, 2 or 3).

Find the PC's LAN IP:

- Windows: `ipconfig`, look for "IPv4 Address" under your Wi-Fi adapter (e.g. `192.168.1.23`)
- macOS: `ipconfig getifaddr en0`

Then:

```bash
npm ci
npx expo start
```

Scan the QR code in the terminal with Expo Go on your phone.

Tested on Android with Expo Go. iOS Expo Go should work the same way but wasn't tested.

Why not `localhost`? The app runs on the phone, so `localhost` there means the phone itself, not your PC. The phone has to reach the API over the network using the PC's LAN IP (the API binds to `0.0.0.0`).

Troubleshooting:

- Phone and PC must be on the same Wi-Fi network (guest networks often block device-to-device traffic).
- Allow Node.js through the firewall (on Windows, allow it on Private networks when prompted).
- After changing `.env`, restart with a cleared cache: `npx expo start -c`. `EXPO_PUBLIC_*` values are baked in at bundle time.

### Try the scanner

The Scan tab checks a ticket in by reading its QR code with the camera. A phone can't scan its own screen, so show the QR on another screen, e.g. on the PC:

```bash
npx --yes qrcode-terminal <code>
```

Scan it: the result is green the first time and amber "Already checked in" the second time.

## API reference

Base URL: `http://localhost:3000`. Request bodies are JSON (`Content-Type: application/json`).

| Method & path | `X-User-Id` | Body | Success |
| --- | --- | --- | --- |
| `GET /events` | no | none | `200`, upcoming events, soonest first |
| `POST /events/:id/book` | yes | `{ "quantity": 1-4 }` | `201`, array of created tickets |
| `GET /me/tickets` | yes | none | `200`, the user's tickets with their event, newest first |
| `POST /checkins` | no | `{ "code": "<ticket code>" }` | `200`, the checked-in ticket with its event |

Errors always look like `{ "error": "message" }`:

| Status | When |
| --- | --- |
| `400` | Invalid body (`quantity` not an integer 1-4, missing/empty `code`, malformed JSON) |
| `401` | `X-User-Id` missing or not a seeded user |
| `404` | Event not found or already past, ticket code not found, unknown route |
| `409` | Not enough tickets left; ticket already checked in (also returns `checkedInAt`) |
| `500` | Unexpected server error |

### curl examples

List upcoming events:

```bash
curl -s http://localhost:3000/events
```

```json
[{"id":1,"name":"Tokyo Jazz Night","venue":"Blue Note Tokyo","date":"2026-11-02T20:38:41.849Z","priceYen":8000,"ticketsLeft":50},{"id":2,"name":"Indie Rock Live","venue":"Shibuya O-East","date":"2026-11-06T20:38:41.849Z","priceYen":5500,"ticketsLeft":2}, ...]
```

Book 1 ticket for event 1 as user 1 (`201`):

```bash
curl -s -X POST http://localhost:3000/events/1/book -H 'Content-Type: application/json' -H 'X-User-Id: 1' -d '{"quantity":1}'
```

```json
[{"code":"287910d6df9c1e43","userId":1,"eventId":1,"checkedInAt":null,"createdAt":"2026-10-30T20:39:06.112Z"}]
```

Quantity above 4 (`400`):

```bash
curl -s -X POST http://localhost:3000/events/1/book -H 'Content-Type: application/json' -H 'X-User-Id: 1' -d '{"quantity":5}'
```

```json
{"error":"quantity must be an integer from 1 to 4"}
```

No `X-User-Id` header (`401`):

```bash
curl -s -X POST http://localhost:3000/events/1/book -H 'Content-Type: application/json' -d '{"quantity":1}'
```

```json
{"error":"invalid or missing X-User-Id"}
```

Ask for 3 tickets of event 2, which has only 2 left (`409`):

```bash
curl -s -X POST http://localhost:3000/events/2/book -H 'Content-Type: application/json' -H 'X-User-Id: 2' -d '{"quantity":3}'
```

```json
{"error":"not enough tickets left"}
```

My tickets as user 1:

```bash
curl -s http://localhost:3000/me/tickets -H 'X-User-Id: 1'
```

```json
[{"code":"287910d6df9c1e43","userId":1,"eventId":1,"checkedInAt":null,"createdAt":"2026-10-30T20:39:06.112Z","event":{"id":1,"name":"Tokyo Jazz Night", ...,"ticketsLeft":49}}]
```

Check in a ticket (use the `code` from your booking, `200`):

```bash
curl -s -X POST http://localhost:3000/checkins -H 'Content-Type: application/json' -d '{"code":"287910d6df9c1e43"}'
```

```json
{"code":"287910d6df9c1e43","userId":1,"eventId":1,"checkedInAt":"2026-10-30T20:39:13.327Z","createdAt":"2026-10-30T20:39:06.112Z","event":{...}}
```

The same code again (`409`, with the first check-in time):

```bash
curl -s -X POST http://localhost:3000/checkins -H 'Content-Type: application/json' -d '{"code":"287910d6df9c1e43"}'
```

```json
{"error":"ticket already checked in","checkedInAt":"2026-10-30T20:39:13.327Z"}
```

Codes, dates and timestamps will differ on your machine.

## How overselling is prevented

Booking runs one conditional `UPDATE` inside a transaction: decrement `ticketsLeft` by `quantity` only `WHERE ticketsLeft >= quantity`. MySQL row-locks the event row for that update, so two concurrent bookings can't both pass the check; if it affects 0 rows the API returns `409`, and the tickets are created only when it succeeded (same transaction).
`npm test` fires 10 concurrent bookings at an event with 1 ticket and asserts exactly one `201`, nine `409`s and `ticketsLeft = 0`.

## Check-in only once

Check-in is a conditional `UPDATE ... SET checkedInAt = now WHERE code = ? AND checkedInAt IS NULL`. If it affects 0 rows for an existing ticket, the API returns `409` with the original `checkedInAt`.

## Decisions & assumptions

- `X-User-Id` identifies the user; it is not authentication.
- `POST /checkins` needs no user: it is used by gate staff, not the ticket holder.
- "Upcoming" means the event date is after now; past events are hidden and can't be booked.
- Prices are integer JPY (`priceYen`), no decimals.
- Ticket codes are random 16-hex-character strings (8 random bytes) and are the ticket's primary key.
- The app aborts API requests after 10 seconds and shows a network error.

## With more time

- Real authentication, plus a staff role allowed to check tickets in
- Pagination for events and tickets
- Persist the language choice across app restarts
- Offline cache of tickets so the QR shows without a connection

## Demo video

Screen recording: <link>
