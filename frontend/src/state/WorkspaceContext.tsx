import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ToastKind = "success" | "error";
type RefreshHandler = () => Promise<void>;

type WorkspaceContextValue = {
  theme: ThemePreference;
  dark: boolean;
  setTheme: (theme: ThemePreference) => void;
  toast: (message: string, kind?: ToastKind) => void;
  registerRefresh: (handler: RefreshHandler) => () => void;
  refresh: () => Promise<void>;
  refreshing: boolean;
  toastMessage: { message: string; kind: ToastKind } | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const THEME_KEY = "journey-analytics-theme";

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [toastMessage, setToastMessage] = useState<WorkspaceContextValue["toastMessage"]>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshHandler = useRef<RefreshHandler | null>(null);
  const resolvedDark = theme === "dark" || (theme === "system" && systemDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", resolvedDark);
    localStorage.setItem(THEME_KEY, theme);
  }, [resolvedDark, theme]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const setTheme = useCallback((next: ThemePreference) => setThemeState(next), []);
  const toast = useCallback((message: string, kind: ToastKind = "success") => setToastMessage({ message, kind }), []);
  const registerRefresh = useCallback((handler: RefreshHandler) => {
    refreshHandler.current = handler;
    return () => {
      if (refreshHandler.current === handler) refreshHandler.current = null;
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!refreshHandler.current || refreshing) return;
    setRefreshing(true);
    try {
      await refreshHandler.current();
      toast("Data updated.", "success");
    } catch (error) {
      toast(error instanceof Error ? `Unable to refresh data. ${error.message}` : "Unable to refresh data. Previous data is still displayed.", "error");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, toast]);

  const value = useMemo(() => ({
    theme, dark: resolvedDark, setTheme, toast, registerRefresh, refresh, refreshing, toastMessage,
  }), [theme, resolvedDark, setTheme, toast, registerRefresh, refresh, refreshing, toastMessage]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return value;
}

export function useRegisterRefresh(handler: RefreshHandler, dependencies: unknown[] = []) {
  const { registerRefresh } = useWorkspace();
  useEffect(() => registerRefresh(handler), [registerRefresh, ...dependencies]);
}
