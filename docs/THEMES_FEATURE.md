# Themes Feature Documentation

## Overview

JaTango supports switchable color themes with light/dark mode. Users can choose from 6 color presets and toggle between system, light, and dark appearance modes. Both preferences are persisted to AsyncStorage.

---

## Architecture

### Theme System

| Layer | File | Purpose |
|-------|------|---------|
| Constants | `client/constants/theme.ts` | Color presets, spacing, typography, shadows |
| Context | `client/contexts/ThemeContext.tsx` | Mode + preset state, persistence |
| Hook | `client/hooks/useTheme.ts` | Convenience hook returning `{ theme, isDark }` |

### Theme Context — `ThemeContext.tsx`

Manages two independent settings:

| Setting | Storage Key | Values |
|---------|------------|--------|
| Mode | `@jatango_theme_mode` | `system`, `light`, `dark` |
| Preset ID | `@jatango_theme_preset` | `default`, `ocean`, `sunset`, `forest`, `rose`, `midnight` |

**Exposed values:**

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `string` | Current mode (`system`/`light`/`dark`) |
| `setMode(mode)` | `function` | Change appearance mode |
| `isDark` | `boolean` | Whether dark mode is active |
| `theme` | `ThemeColors` | Resolved color palette for current mode + preset |
| `presetId` | `string` | Current preset ID |
| `setPresetId(id)` | `function` | Change color preset |
| `presets` | `ThemePreset[]` | All available presets |

---

## Color Presets

### 6 Built-in Presets

| ID | Name | Icon | Primary | Secondary |
|----|------|------|---------|-----------|
| `default` | JaTango | `zap` | `#FF6B35` (Orange) | `#7C3AED` (Purple) |
| `ocean` | Ocean | `droplet` | `#2563EB` (Blue) | `#0891B2` (Cyan) |
| `sunset` | Sunset | `sun` | `#EA580C` (Deep Orange) | `#E11D48` (Rose) |
| `forest` | Forest | `feather` | `#059669` (Emerald) | `#0D9488` (Teal) |
| `rose` | Rose | `heart` | `#E11D48` (Rose) | `#DB2777` (Pink) |
| `midnight` | Midnight | `star` | `#4F46E5` (Indigo) | `#7C3AED` (Violet) |

Each preset defines a complete `light` and `dark` color palette.

### ThemeColors Type

Every preset provides these 16 color tokens:

```typescript
type ThemeColors = {
  text: string;              // Primary text
  textSecondary: string;     // Secondary/muted text
  buttonText: string;        // Button label color
  tabIconDefault: string;    // Inactive tab icon
  tabIconSelected: string;   // Active tab icon
  link: string;              // Link color
  primary: string;           // Primary action color
  secondary: string;         // Secondary accent
  success: string;           // Success/green
  border: string;            // Border color
  backgroundRoot: string;    // Root background
  backgroundDefault: string; // Default surface
  backgroundSecondary: string; // Secondary surface
  backgroundTertiary: string;  // Tertiary surface
  overlay: string;           // Modal overlay
  overlayLight: string;      // Light overlay
};
```

---

## Design Tokens

### Spacing

```typescript
Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20,
  "2xl": 24, "3xl": 32, "4xl": 40, "5xl": 48,
  inputHeight: 48, buttonHeight: 52
}
```

### Border Radius

```typescript
BorderRadius = {
  xs: 8, sm: 12, md: 18, lg: 24, xl: 30,
  "2xl": 40, "3xl": 50, full: 9999
}
```

### Typography

| Style | Size | Line Height | Weight |
|-------|------|-------------|--------|
| `h1` | 28 | 36 | 700 |
| `h2` | 22 | 28 | 600 |
| `h3` | 18 | 24 | 600 |
| `h4` | 16 | 22 | 600 |
| `body` | 16 | 24 | 400 |
| `small` | 14 | 20 | 400 |
| `caption` | 12 | 16 | 500 |
| `link` | 16 | 24 | 400 |

### Shadows

Three levels (`sm`, `md`, `lg`) with purple-tinted shadows (`#7C3AED`).

### Fonts

Platform-specific font stacks for `sans`, `serif`, `rounded`, and `mono`.

---

## Settings UI

**File:** `client/screens/SettingsScreen.tsx`

### Appearance Section

Toggle between Light, Dark, and System modes using segmented buttons.

### Color Theme Section

2-column grid of `PresetCard` components. Each card shows:
- Color swatches (primary + secondary)
- Mini UI preview with the preset's colors
- Preset name
- Checkmark on the active preset

---

## Usage Pattern

All screens access theme colors via the `useTheme` hook:

```typescript
const { theme, isDark } = useTheme();

// Use theme colors
<View style={{ backgroundColor: theme.backgroundRoot }}>
  <Text style={{ color: theme.text }}>Hello</Text>
</View>
```

Themed wrapper components are also available:
- `ThemedText` — Text with automatic `theme.text` color
- `ThemedView` — View with automatic `theme.backgroundDefault` color

---

## Files

| File | Purpose |
|------|---------|
| `client/constants/theme.ts` | All presets, spacing, typography, shadows, fonts |
| `client/contexts/ThemeContext.tsx` | Theme state management + persistence |
| `client/hooks/useTheme.ts` | `{ theme, isDark }` convenience hook |
| `client/components/ThemedText.tsx` | Auto-themed text component |
| `client/components/ThemedView.tsx` | Auto-themed view component |
| `client/screens/SettingsScreen.tsx` | Theme selection UI |
