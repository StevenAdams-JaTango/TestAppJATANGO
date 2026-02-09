import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { theme, isDark } = useThemeContext();
  return { theme, isDark };
}
