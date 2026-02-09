import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Colors,
  ThemePresets,
  type ThemeColors,
  type ThemePreset,
} from "@/constants/theme";

type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY_MODE = "@jatango_theme_mode";
const STORAGE_KEY_PRESET = "@jatango_theme_preset";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  theme: ThemeColors;
  presetId: string;
  setPresetId: (id: string) => void;
  presets: ThemePreset[];
}

const defaultPreset = ThemePresets[0];

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  setMode: () => {},
  isDark: false,
  theme: Colors.light,
  presetId: "default",
  setPresetId: () => {},
  presets: ThemePresets,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [presetId, setPresetIdState] = useState("default");
  const [loaded, setLoaded] = useState(false);

  // Load persisted preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedMode, savedPreset] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_MODE),
          AsyncStorage.getItem(STORAGE_KEY_PRESET),
        ]);
        if (savedMode) setModeState(savedMode as ThemeMode);
        if (savedPreset) setPresetIdState(savedPreset);
      } catch {
        // Ignore storage errors, use defaults
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY_MODE, m).catch(() => {});
  }, []);

  const setPresetId = useCallback((id: string) => {
    setPresetIdState(id);
    AsyncStorage.setItem(STORAGE_KEY_PRESET, id).catch(() => {});
  }, []);

  const isDark = useMemo(() => {
    if (mode === "system") return systemScheme === "dark";
    return mode === "dark";
  }, [mode, systemScheme]);

  const preset = useMemo(
    () => ThemePresets.find((p) => p.id === presetId) || defaultPreset,
    [presetId],
  );

  const theme = isDark ? preset.dark : preset.light;

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isDark,
      theme,
      presetId,
      setPresetId,
      presets: ThemePresets,
    }),
    [mode, setMode, isDark, theme, presetId, setPresetId],
  );

  // Don't render until preferences are loaded to avoid flash
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
