# Fluid Navigator 🚗🇵🇰

  **Pakistan-specific ride-hailing app** with inDrive-style fare negotiation — riders set their own price, drivers bid.

  [![Expo](https://img.shields.io/badge/Expo-React%20Native-blue)](https://expo.dev)
  [![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

  ---

  ## Features

  - 🇵🇰 **Pakistan-first** — +92 phone numbers, Rs (PKR) currency, Urdu UI
  - 💰 **Fare Negotiation** — Rider sets their price, drivers bid, rider accepts best offer
  - 📱 **Real-time OTP** — Twilio SMS to Pakistan numbers (+92)
  - 🗣️ **Urdu Interface** — Full Urdu labels, right-to-left text support
  - 🚗 **Live Bid Polling** — Bids refresh every 5 seconds
  - 🏙️ **Pakistani Cities** — Lahore, Karachi, Islamabad presets
  - ⭐ **Reviews & Ratings** — Post-ride rating system

  ---

  ## Tech Stack

  | Layer | Technology |
  |-------|-----------|
  | Mobile | Expo React Native, React Query, expo-router |
  | Backend | Express.js, TypeScript, PostgreSQL |
  | ORM | Drizzle ORM |
  | Auth | Phone OTP via Twilio SMS |
  | API | OpenAPI 3.0 + orval codegen |

  ---

  ## Project Structure

  ```
  fluid-navigator/
  ├── artifacts/
  │   ├── mobile/              # Expo React Native app
  │   │   ├── app/             # Expo Router screens
  │   │   │   ├── auth.tsx     # OTP login + role selection (Urdu)
  │   │   │   ├── fare-negotiation.tsx  # Bid flow
  │   │   │   ├── ride-tracking.tsx     # Live tracking
  │   │   │   └── trip-summary.tsx      # Post-ride rating
  │   │   └── screens/
  │   │       ├── RiderHome.tsx  # Rider map + quick destinations
  │   │       └── DriverHome.tsx # Driver dashboard + live bids
  │   └── api-server/          # Express.js REST API
  │       └── src/routes/
  │           ├── auth.ts      # OTP send/verify (Twilio)
  │           ├── rides.ts     # Ride management
  │           ├── bids.ts      # Bid flow
  │           └── reviews.ts   # Ratings
  ├── lib/
  │   ├── api-spec/            # OpenAPI 3.0 spec
  │   ├── api-client-react/    # Generated React Query hooks
  │   └── db/                  # Drizzle schema & migrations
  └── package.json             # pnpm monorepo
  ```

  ---

  ## Screens

  | Screen | Description |
  |--------|-------------|
  | **Auth** | +92 phone → SMS OTP → Role (Rider/Driver) |
  | **Rider Home** | Map view, Pakistani city presets, "Set Your Fare" CTA |
  | **Fare Negotiation** | Set price in Rs, see driver bids live |
  | **Ride Tracking** | Driver info, route, complete/cancel |
  | **Trip Summary** | Fare receipt + star rating |
  | **Driver Home** | Online toggle, incoming ride requests |
  | **Activity** | Trip history with Rs fares |
  | **Profile** | Stats, earnings, settings |

  ---

  ## Setup

  ```bash
  # Install dependencies
  pnpm install

  # Set environment variables
  TWILIO_ACCOUNT_SID=your_sid
  TWILIO_AUTH_TOKEN=your_token
  TWILIO_PHONE_NUMBER=+1234567890
  DATABASE_URL=postgresql://...

  # Start backend
  pnpm --filter @workspace/api-server dev

  # Start mobile app
  pnpm --filter @workspace/mobile dev
  ```

  ---

  ## License

  MIT
  