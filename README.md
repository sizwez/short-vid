# 🇿🇦 Mzansi Videos - The Vibe of South Africa

Mzansi Videos is a premium, short-video social platform designed to celebrate and share South African culture. From Amapiano vibes to braai day highlights, Mzansi Videos brings the community together.

## 🌟 Key Features

- **🔥 Dynamic Video Feed**: High-performance vertical scrolling with real-time engagement tracking.
- **💬 Direct Messaging**: Real-time private chat with other users and creators.
- **🔍 Global Discovery**: Search for trending hashtags like `#amapiano` or find your favorite creators.
- **🏆 Challenges**: Participate in community challenges and compete for prizes.
- **💎 Creator Dashboard**: Professional analytics for creators to track views, likes, and earnings.
- **💳 Secure Monetization**: Paystack integration for seamless subscriptions and creator support.
- **🛡️ Safety First**: Built-in reporting system and robust account privacy settings.
- **📱 PWA Ready**: Install as an app on your iOS or Android device with offline support.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Backend/DB**: Supabase (Auth, Postgres, Realtime, Storage)
- **Payments**: Paystack
- **PWA**: vite-plugin-pwa

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Supabase Account
- Paystack Account (for payments)

### Installation

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in your Supabase and Paystack credentials.
   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   ```

3. **Database Setup**:
   Run the SQL scripts in `supabase_migrations.sql` in your Supabase SQL Editor to set up tables, RLS policies, and triggers.

4. **Run Locally**:
   ```bash
   npm run dev
   ```

## 📱 Mobile Installation (PWA)

After deploying to a secure (HTTPS) environment, users can:
- **iOS**: Tap "Share" and select "Add to Home Screen".
- **Android**: Tap the three dots and select "Install App".

## 🛡️ License
This project is private and intended for the Mzansi Videos community.

---
Built with ❤️ for South Africa.