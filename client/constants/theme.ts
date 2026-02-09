import { Platform } from "react-native";

export type ThemeColors = {
  text: string;
  textSecondary: string;
  buttonText: string;
  tabIconDefault: string;
  tabIconSelected: string;
  link: string;
  primary: string;
  secondary: string;
  success: string;
  border: string;
  backgroundRoot: string;
  backgroundDefault: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  overlay: string;
  overlayLight: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  icon: string;
  light: ThemeColors;
  dark: ThemeColors;
};

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
  } as ThemeColors,
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
  } as ThemeColors,
};

export const ThemePresets: ThemePreset[] = [
  {
    id: "default",
    name: "JaTango",
    icon: "zap",
    light: Colors.light,
    dark: Colors.dark,
  },
  {
    id: "ocean",
    name: "Ocean",
    icon: "droplet",
    light: {
      text: "#334155",
      textSecondary: "#94A3B8",
      buttonText: "#FFFFFF",
      tabIconDefault: "#93C5FD",
      tabIconSelected: "#2563EB",
      link: "#2563EB",
      primary: "#2563EB",
      secondary: "#0891B2",
      success: "#10B981",
      border: "#BFDBFE",
      backgroundRoot: "#FFFFFF",
      backgroundDefault: "#EFF6FF",
      backgroundSecondary: "#DBEAFE",
      backgroundTertiary: "#BFDBFE",
      overlay: "rgba(37,99,235,0.5)",
      overlayLight: "rgba(37,99,235,0.3)",
    },
    dark: {
      text: "#E2E8F0",
      textSecondary: "#93C5FD",
      buttonText: "#FFFFFF",
      tabIconDefault: "#60A5FA",
      tabIconSelected: "#3B82F6",
      link: "#3B82F6",
      primary: "#3B82F6",
      secondary: "#06B6D4",
      success: "#10B981",
      border: "#1E40AF",
      backgroundRoot: "#0F172A",
      backgroundDefault: "#1E293B",
      backgroundSecondary: "#1E3A5F",
      backgroundTertiary: "#1E40AF",
      overlay: "rgba(37,99,235,0.7)",
      overlayLight: "rgba(37,99,235,0.5)",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    icon: "sun",
    light: {
      text: "#44403C",
      textSecondary: "#A8A29E",
      buttonText: "#FFFFFF",
      tabIconDefault: "#FDBA74",
      tabIconSelected: "#EA580C",
      link: "#EA580C",
      primary: "#EA580C",
      secondary: "#E11D48",
      success: "#10B981",
      border: "#FED7AA",
      backgroundRoot: "#FFFFFF",
      backgroundDefault: "#FFF7ED",
      backgroundSecondary: "#FFEDD5",
      backgroundTertiary: "#FED7AA",
      overlay: "rgba(234,88,12,0.5)",
      overlayLight: "rgba(234,88,12,0.3)",
    },
    dark: {
      text: "#FED7AA",
      textSecondary: "#FDBA74",
      buttonText: "#FFFFFF",
      tabIconDefault: "#FB923C",
      tabIconSelected: "#F97316",
      link: "#F97316",
      primary: "#F97316",
      secondary: "#FB7185",
      success: "#10B981",
      border: "#9A3412",
      backgroundRoot: "#1C1210",
      backgroundDefault: "#2C1A14",
      backgroundSecondary: "#3D2419",
      backgroundTertiary: "#4D2E1E",
      overlay: "rgba(234,88,12,0.7)",
      overlayLight: "rgba(234,88,12,0.5)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    icon: "feather",
    light: {
      text: "#374151",
      textSecondary: "#9CA3AF",
      buttonText: "#FFFFFF",
      tabIconDefault: "#86EFAC",
      tabIconSelected: "#059669",
      link: "#059669",
      primary: "#059669",
      secondary: "#0D9488",
      success: "#10B981",
      border: "#BBF7D0",
      backgroundRoot: "#FFFFFF",
      backgroundDefault: "#F0FDF4",
      backgroundSecondary: "#DCFCE7",
      backgroundTertiary: "#BBF7D0",
      overlay: "rgba(5,150,105,0.5)",
      overlayLight: "rgba(5,150,105,0.3)",
    },
    dark: {
      text: "#D1FAE5",
      textSecondary: "#6EE7B7",
      buttonText: "#FFFFFF",
      tabIconDefault: "#34D399",
      tabIconSelected: "#10B981",
      link: "#10B981",
      primary: "#10B981",
      secondary: "#14B8A6",
      success: "#10B981",
      border: "#065F46",
      backgroundRoot: "#0B1A14",
      backgroundDefault: "#132A1F",
      backgroundSecondary: "#1A3A2A",
      backgroundTertiary: "#224A35",
      overlay: "rgba(5,150,105,0.7)",
      overlayLight: "rgba(5,150,105,0.5)",
    },
  },
  {
    id: "rose",
    name: "Rose",
    icon: "heart",
    light: {
      text: "#4B5563",
      textSecondary: "#9CA3AF",
      buttonText: "#FFFFFF",
      tabIconDefault: "#FDA4AF",
      tabIconSelected: "#E11D48",
      link: "#E11D48",
      primary: "#E11D48",
      secondary: "#DB2777",
      success: "#10B981",
      border: "#FECDD3",
      backgroundRoot: "#FFFFFF",
      backgroundDefault: "#FFF1F2",
      backgroundSecondary: "#FFE4E6",
      backgroundTertiary: "#FECDD3",
      overlay: "rgba(225,29,72,0.5)",
      overlayLight: "rgba(225,29,72,0.3)",
    },
    dark: {
      text: "#FFE4E6",
      textSecondary: "#FDA4AF",
      buttonText: "#FFFFFF",
      tabIconDefault: "#FB7185",
      tabIconSelected: "#F43F5E",
      link: "#F43F5E",
      primary: "#F43F5E",
      secondary: "#EC4899",
      success: "#10B981",
      border: "#9F1239",
      backgroundRoot: "#1A0A10",
      backgroundDefault: "#2A1018",
      backgroundSecondary: "#3A1620",
      backgroundTertiary: "#4A1C28",
      overlay: "rgba(225,29,72,0.7)",
      overlayLight: "rgba(225,29,72,0.5)",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    icon: "star",
    light: {
      text: "#374151",
      textSecondary: "#9CA3AF",
      buttonText: "#FFFFFF",
      tabIconDefault: "#A5B4FC",
      tabIconSelected: "#4F46E5",
      link: "#4F46E5",
      primary: "#4F46E5",
      secondary: "#7C3AED",
      success: "#10B981",
      border: "#C7D2FE",
      backgroundRoot: "#FFFFFF",
      backgroundDefault: "#EEF2FF",
      backgroundSecondary: "#E0E7FF",
      backgroundTertiary: "#C7D2FE",
      overlay: "rgba(79,70,229,0.5)",
      overlayLight: "rgba(79,70,229,0.3)",
    },
    dark: {
      text: "#E0E7FF",
      textSecondary: "#A5B4FC",
      buttonText: "#FFFFFF",
      tabIconDefault: "#818CF8",
      tabIconSelected: "#6366F1",
      link: "#6366F1",
      primary: "#6366F1",
      secondary: "#8B5CF6",
      success: "#10B981",
      border: "#3730A3",
      backgroundRoot: "#0F0E1A",
      backgroundDefault: "#1A1830",
      backgroundSecondary: "#252246",
      backgroundTertiary: "#302C5C",
      overlay: "rgba(79,70,229,0.7)",
      overlayLight: "rgba(79,70,229,0.5)",
    },
  },
];

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
