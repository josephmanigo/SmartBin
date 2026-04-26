# SmartBin — IoT Waste Monitoring Platform

A production-ready, user-centric IoT dashboard for monitoring smart trash bins in real-time.

---

## Tech Stack

| Layer      | Technology                      |
|------------|---------------------------------|
| Frontend   | Next.js 14 (App Router) + Tailwind CSS |
| Backend    | PHP 8.1+ RESTful API            |
| Database   | MySQL 8+                        |
| Auth       | JWT (firebase/php-jwt)          |
| Hardware   | Arduino + HC-SR04 + ESP8266     |

---

## Project Structure

```
SmartBin/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/
│       │   ├── login/
│       │   ├── register/
│       │   ├── dashboard/
│       │   ├── bins/[id]/
│       │   └── profile/
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── BinCard.tsx
│       │   ├── BinModal.tsx
│       │   ├── DeleteModal.tsx
│       │   └── FullBinAlert.tsx
│       ├── context/AuthContext.tsx
│       └── lib/api.ts
├── backend/           # PHP API
│   ├── config/database.php
│   ├── middleware/AuthMiddleware.php
│   ├── controllers/
│   │   ├── AuthController.php
│   │   ├── BinController.php
│   │   └── ArduinoController.php
│   ├── database/schema.sql
│   └── index.php
└── arduino/
    └── smartbin_sensor/smartbin_sensor.ino
```

---

## Quick Start

### 1. Database Setup
```sql
-- In phpMyAdmin or MySQL CLI:
SOURCE backend/database/schema.sql;
```

### 2. Backend Setup (XAMPP)
```bash
# Copy backend/ to your XAMPP htdocs:
xcopy backend "C:\xampp\htdocs\smartbin\backend" /E /I

# Install PHP dependencies:
cd C:\xampp\htdocs\smartbin\backend
composer install
```

> Edit `backend/config/database.php` to set your MySQL credentials.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

> Edit `frontend/.env.local` to point to your backend URL.

---

## API Endpoints

| Method | Endpoint                   | Auth     | Description          |
|--------|----------------------------|----------|----------------------|
| POST   | `/api/auth/register`       | No       | Register             |
| POST   | `/api/auth/login`          | No       | Login → JWT          |
| GET    | `/api/auth/me`             | JWT      | Current user         |
| GET    | `/api/bins`                | JWT      | List user's bins     |
| POST   | `/api/bins`                | JWT      | Create bin           |
| GET    | `/api/bins/{id}`           | JWT      | Get bin              |
| PUT    | `/api/bins/{id}`           | JWT      | Update bin           |
| DELETE | `/api/bins/{id}`           | JWT      | Delete bin           |
| GET    | `/api/bins/{id}/logs`      | JWT      | Bin log history      |
| POST   | `/api/arduino/data`        | None     | Arduino data push    |

### Arduino Data Format
```json
POST /api/arduino/data
{ "bin_id": "BIN-001", "distance": 12.5 }
```

---

## Status Logic

| Distance from sensor    | Status     | Colour |
|-------------------------|------------|--------|
| > 66% of bin height     | Empty      | 🟢 Green  |
| 33–66% of bin height    | Half-Full  | 🟡 Yellow |
| ≤ 33% of bin height     | Full       | 🔴 Red    |

---

## Features

- ✅ JWT authentication (register / login / logout)
- ✅ Per-user isolated data (no shared bins)
- ✅ Full CRUD for bins with modals
- ✅ Real-time polling every 8 seconds
- ✅ Colour-coded status cards with fill-level bars
- ✅ Full bin alerts with pulse animation
- ✅ Bin detail page with Recharts area graph
- ✅ Log history table
- ✅ Arduino sketch for HC-SR04 + ESP8266
- ✅ Glassmorphism dark-mode UI
- ✅ Skeleton loaders & empty states
- ✅ Mobile-first responsive layout
