# Fluid Navigator 🚗🇵🇰

Pakistan-specific ride-hailing app built with **inDrive-style fare negotiation**.

## Features
- 📱 Expo React Native mobile app with Urdu UI
- 💰 Rider sets their own price in Pakistani Rupees (Rs)
- 🚗 Drivers bid on trips — rider picks the best offer
- 📱 Real-time OTP via Twilio SMS (+92 Pakistan numbers)
- 🗣️ Bilingual Urdu/English interface
- 🏙️ Pakistan cities: Lahore, Karachi, Islamabad

## Tech Stack
- **Frontend**: Expo React Native, React Query, OpenAPI codegen
- **Backend**: Express.js, PostgreSQL (Drizzle ORM), TypeScript
- **Auth**: Phone OTP (Twilio SMS)

## Project Structure
```
artifacts/
  mobile/          # Expo React Native app
  api-server/      # Express.js backend
lib/
  api-spec/        # OpenAPI spec
  api-client-react/ # Generated React Query hooks
  db/              # Database schema & migrations
```
