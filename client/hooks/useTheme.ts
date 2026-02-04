import { Colors } from "@/constants/theme";

export function useTheme() {
  // Force light theme to match the reference design
  const isDark = false;
  const theme = Colors.light;

  return {
    theme,
    isDark,
  };
}
