# JaTango - Live Selling App

## Overview
JaTango is a live selling mobile application built with React Native (Expo) and Express.js. It allows sellers to broadcast live streams and showcase products to buyers in real-time, creating an engaging shopping experience.

## Current State
MVP implementation with the following features:
- Browse live streams on the Home tab
- Explore products in a searchable grid
- View purchase history
- User profile with seller mode
- Full-screen live stream viewing with chat and product carousel
- Broadcaster dashboard for going live and adding products to the carousel
- Product detail pages

## Design Theme
- **Primary Color**: Orange (#FF6B35) - Used for CTAs, buttons, prices
- **Secondary Color**: Purple (#7C3AED) - Used for accents, branding, badges
- **Background**: White with soft purple tints
- **Clean, vibrant aesthetic with purple and orange accents on white**

## Project Architecture

### Frontend (React Native + Expo)
```
client/
├── App.tsx                     # Root component with providers
├── components/                 # Reusable UI components
│   ├── Button.tsx             # Animated button component
│   ├── Card.tsx               # Card with elevation levels
│   ├── EmptyState.tsx         # Empty state with illustration
│   ├── ErrorBoundary.tsx      # Error boundary wrapper
│   ├── GoLiveButton.tsx       # Animated FAB for going live
│   ├── HeaderTitle.tsx        # App branding header (JaTango)
│   ├── LiveBadge.tsx          # Pulsing LIVE indicator
│   ├── OrderCard.tsx          # Order history item
│   ├── ProductCard.tsx        # Product grid item
│   ├── ProductCarousel.tsx    # Floating product carousel for streams
│   ├── ProductSelectionSheet.tsx # Modal for selecting products
│   ├── StreamCard.tsx         # Live stream card
│   └── ThemedText/View.tsx    # Theme-aware components
├── constants/
│   └── theme.ts               # Colors, spacing, typography
├── data/
│   └── mockData.ts            # Sample data for MVP
├── hooks/                     # Custom hooks
├── navigation/                # React Navigation setup
│   ├── RootStackNavigator.tsx # Main stack navigator
│   ├── MainTabNavigator.tsx   # Bottom tab navigator
│   └── *StackNavigator.tsx    # Individual tab stacks
├── screens/                   # Screen components
│   ├── HomeScreen.tsx         # Browse live streams
│   ├── ExploreScreen.tsx      # Search products
│   ├── PurchasesScreen.tsx    # Order history
│   ├── ProfileScreen.tsx      # User profile
│   ├── LiveStreamScreen.tsx   # Watch live stream
│   ├── BroadcasterScreen.tsx  # Go live & add products
│   ├── ProductDetailScreen.tsx # Product info
│   └── SettingsScreen.tsx     # App settings
└── types/
    └── index.ts               # TypeScript interfaces
```

### Backend (Express.js)
```
server/
├── index.ts          # Server entry point
├── routes.ts         # API routes
└── storage.ts        # Data storage interface
```

## Key Features

### Going Live
1. Tap the center FAB button or "Start Live Stream" from Profile
2. Grant camera permission
3. Tap "GO LIVE" button
4. Use "Add Products" to select items for the carousel
5. Products appear in a sliding carousel for viewers

### Product Carousel
- Appears during live streams at the bottom
- Auto-hides after 5 seconds
- Tap shopping bag icon to show/hide
- Each product has a "Buy" button

### Navigation Structure
- **Home Tab**: Browse active live streams
- **Explore Tab**: Search and discover products
- **Go Live (FAB)**: Start broadcasting
- **Purchases Tab**: View order history
- **Profile Tab**: Account management

## Tech Stack
- React Native with Expo
- React Navigation 7+
- Reanimated for animations
- Expo Camera for broadcasting
- Express.js backend
- TypeScript throughout

## Running the App
- **Frontend**: `npm run expo:dev` (port 8081)
- **Backend**: `npm run server:dev` (port 5000)
- Scan QR code in Expo Go app to test on physical device

## Next Steps (Future Development)
- Real authentication with Apple/Google Sign-In
- Backend database integration for persistence
- Real-time video streaming with WebRTC
- Payment integration (Stripe)
- Push notifications for live stream alerts
- Multi-device sync
