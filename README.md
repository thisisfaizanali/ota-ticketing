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

Why not `localhost`? The app runs on the phone, so `localhost` there means the phone itself, not your PC. The phone has to reach the API over the network using the PC's LAN IP (the API binds to `0.0.0.0`).

Troubleshooting:

- Phone and PC must be on the same Wi-Fi network (guest networks often block device-to-device traffic).
- Allow Node.js through the firewall (on Windows, allow it on Private networks when prompted).
- After changing `.env`, restart with a cleared cache: `npx expo start -c`. `EXPO_PUBLIC_*` values are baked in at bundle time.

## Demo video

Screen recording: <link>
