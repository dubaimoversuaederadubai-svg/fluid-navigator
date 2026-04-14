# Fluid Navigator — Ride-Hailing Mobile App (Pakistan)

## Overview
A full-stack ride-hailing mobile app (inDrive-style fare negotiation) built with Expo React Native + Express/PostgreSQL. Pakistan-specific: PKR fares (Rs), +92 phone OTP, bilingual Urdu/English UI, CNIC/license verification, JazzCash/EasyPaisa/Cash payments.

## Architecture
- **Mobile App** — Expo React Native (file-based routing via Expo Router)
- **API Server** — Express.js + PostgreSQL (via Drizzle ORM)
- **Auth** — Phone OTP (4-digit code, returned as `devCode` in dev mode), stored in sessions table with Bearer token
- **Generated API Client** — orval codegen from OpenAPI spec → React Query hooks
- **Token Storage** — AsyncStorage key `fluid_token`; injected via `setAuthTokenGetter` in `_layout.tsx`
- **Language** — `LanguageContext` (context/LanguageContext.tsx) with EN/UR translations (i18n/translations.ts); default Urdu

## Twilio SMS
- Twilio integration was proposed but dismissed by the user
- Backend auth.ts is coded to use Twilio via env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- Falls back to `devCode` in development
- To enable Twilio: provide TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER as secrets

## Backend (artifacts/api-server)
### Routes
- `POST /api/auth/send-otp` — sends OTP (returns `devCode` in dev)
- `POST /api/auth/verify-otp` — verifies OTP, creates session, returns token + user + isNewUser
- `POST /api/auth/register` — sets name + role for new users
- `POST /api/auth/logout` — deletes session
- `GET/PUT /api/users/me` — get/update current user
- `PUT /api/users/me/online` — toggle driver online status
- `PUT /api/users/me/payment` — update preferred payment method (cash/jazzcash/easypaisa/sadapay/nayapay)
- `PUT /api/users/me/verify` — submit CNIC + license/vehicle info for verification
- `POST /api/rides` — rider creates a ride (status: searching)
- `GET /api/rides` — driver: lists searching rides; rider: lists own rides
- `GET /api/rides/history` — completed trips for current user
- `GET /api/rides/active` — get current user's active ride (excludes completed/cancelled)
- `GET /api/rides/:id` — get specific ride
- `PUT /api/rides/:id/cancel` — cancel ride
- `PUT /api/rides/:id/complete` — complete ride (sets completedAt)
- `POST /api/rides/:id/bids` — driver places a bid
- `GET /api/rides/:id/bids` — list pending bids for a ride
- `PUT /api/rides/:id/bids/:bidId/accept` — rider accepts a bid (ride → accepted, finalFare set)
- `POST /api/rides/:id/review` — submit review, updates reviewee's rating average

### Database Schema (lib/db)
- `users` — id, phone, name, role, rating, totalRides, isOnline, cnicNumber, cnicVerified, licenseNumber, licenseVerified, vehicleModel, vehicleNumber, paymentMethod, createdAt
- `otps` — id, phone, code, used, expiresAt
- `sessions` — id, userId, token, expiresAt, createdAt
- `rides` — id, riderId, driverId, pickup, dropoff, offeredFare, finalFare, distance, duration, status, createdAt, completedAt
- `bids` — id, rideId, driverId, amount, status, eta, createdAt
- `reviews` — id, rideId, reviewerId, revieweeId, rating, comment, createdAt

## Mobile (artifacts/mobile)
### Design Tokens
- Primary: `#10B981` (emerald green)
- Secondary: `#2170E4` (blue)
- Gradient: `#10B981` → `#2170E4` (left to right)
- Font: Inter (400/500/600/700)
- Pakistan locale: +92 prefix, Rs (PKR) currency, Lahore districts (Gulberg, DHA, Allama Iqbal Airport)

### Screens & Routes
| Path | Screen |
|------|--------|
| `/` | Redirect (auth gate) |
| `/onboarding` | 3-slide onboarding |
| `/auth` | Phone → OTP → Role selection (calls real API) |
| `/(tabs)/home` | RiderHome or DriverHome (role-based) |
| `/(tabs)/activity` | Trip history (real API) |
| `/(tabs)/profile` | Profile, stats, language toggle, logout |
| `/fare-negotiation` | Set fare, create ride, receive live bids |
| `/ride-tracking` | Live ride tracker, complete/cancel ride |
| `/trip-summary` | Rate driver, submit review, fare receipt |
| `/verify-id` | CNIC + license + vehicle verification form |
| `/payment-methods` | Select payment (JazzCash, EasyPaisa, Cash, etc.) |

### Key Components
- `components/GradientButton.tsx` — Primary CTA button
- `components/RouteConnector.tsx` — Visual pickup/dropoff connector
- `components/StarRating.tsx` — Interactive star rating
- `components/LeafletMap.web.tsx` — Web-specific Leaflet.js map via native iframe (OpenStreetMap, OSRM routing, Nominatim geocoding)
- `components/LeafletMap.tsx` — Native Leaflet map via react-native-webview (used on iOS/Android)
- `utils/fareCalc.ts` — Vehicle fare calculator (Bike/Rickshaw/Car, km-based, minimum fares)
- `screens/RiderHome.tsx` — Full-screen Leaflet map, location search, GPS button, vehicle selector, km-based fares
- `screens/DriverHome.tsx` — Driver dashboard with live incoming requests
- `context/LanguageContext.tsx` — Bilingual EN/UR language provider
- `i18n/translations.ts` — All translation strings for both languages

### State (AppContext)
- `user` — Authenticated AppUser (from API), persisted in AsyncStorage
- `token` — Bearer token, persisted in AsyncStorage
- `setAuth(user, token)` — saves auth state
- `onboarded` / `setOnboarded` — onboarding completion flag
- `activeRide` / `setActiveRide` — current active ride data
- `logout()` — clears auth from storage

### Blank Screen Bug Fix (Applied)
After ride completes/cancels, `queryClient.clear()` is called in ride-tracking.tsx before navigation. This prevents stale React Query cache from causing RiderHome/DriverHome to redirect back to ride-tracking.

## Vehicle Fare System (utils/fareCalc.ts)
- **Bike (بائیک)**: min Rs 70, Rs 15/km — fast, 1 passenger
- **Rickshaw (رکشہ)**: min Rs 150, Rs 25/km — 3 passengers, comfortable
- **Car (کار)**: min Rs 250, Rs 45/km — 4 passengers, AC
- Fare = max(minFare, distanceKm × perKm), rounded up to nearest Rs 10
- Distance from OSRM routing API (open-source, free); falls back to Haversine if OSRM fails

## Map System
- **Web**: `LeafletMap.web.tsx` — uses native browser `<iframe>` with inline Leaflet HTML (platform-specific file, no react-native-webview needed on web)
- **Native**: `LeafletMap.tsx` — uses `react-native-webview@13.15.0`
- **Tiles**: OpenStreetMap (free, no API key needed)
- **Routing**: OSRM routing API (`router.project-osrm.org`)
- **Geocoding**: Nominatim (`nominatim.openstreetmap.org`)
- **Communication**: postMessage (map → parent) for distance/address updates

## Packages Used
- expo-linear-gradient, expo-haptics, expo-blur
- expo-location (GPS, reverse geocoding)
- react-native-webview@13.15.0 (Leaflet map for native)
- @react-native-async-storage/async-storage
- react-native-safe-area-context, react-native-gesture-handler
- @expo/vector-icons (Ionicons)
- @expo-google-fonts/inter
- @tanstack/react-query (via @workspace/api-client-react)

## Dev Flow
1. OTP dev mode: `devCode` is returned in send-otp response and auto-filled on the OTP screen
2. Driver accept flow: driver calls createBid then acceptBid (direct API calls in DriverHome)
3. Rider accept flow: rider posts ride → polls listBids → calls acceptBid → /ride-tracking
4. Ride completion: either party calls completeRide → queryClient.clear() → /trip-summary → createReview
5. Language: default Urdu; user can toggle in Profile tab → stored in AsyncStorage `fluid_lang`
6. Verification: user submits CNIC (riders) or CNIC + license + vehicle (drivers) via /verify-id
7. Payment: user selects payment method in /payment-methods; saved to DB via PUT /api/users/me/payment
