import { Platform } from "react-native";

const primaryColor = "#FF6B35";
const secondaryColor = "#7C3AED";

export const Colors = {
  light: {
    text: "#4B5563",
    textSecondary: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#C4B5FD",
    tabIconSelected: primaryColor,
    link: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    success: "#10B981",
    border: "#E9D5FF",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#FAF5FF",
    backgroundSecondary: "#F3E8FF",
    backgroundTertiary: "#E9D5FF",
    overlay: "rgba(124,58,237,0.5)",
    overlayLight: "rgba(124,58,237,0.3)",
  },
  dark: {
    text: "#F3E8FF",
    textSecondary: "#C4B5FD",
    buttonText: "#FFFFFF",
    tabIconDefault: "#A78BFA",
    tabIconSelected: primaryColor,
    link: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    success: "#10B981",
    border: "#7C3AED",
    backgroundRoot: "#1E1033",
    backgroundDefault: "#2D1B4E",
    backgroundSecondary: "#3D2563",
    backgroundTertiary: "#4C2F78",
    overlay: "rgba(124,58,237,0.7)",
    overlayLight: "rgba(124,58,237,0.5)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Shadows = {
  sm: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
