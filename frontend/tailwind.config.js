/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      colors: {
        ink: "#0f172a",
        muted: "var(--text-muted)",
        accent: { DEFAULT: "#5b5bf0", dark: "#4747d6", soft: "#eef0ff" },
        nav: "var(--nav-bg)",
        app: "var(--app-bg)",
        surface: "var(--surface-bg)",
        "surface-soft": "var(--surface-soft)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        line: "var(--border-color)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -8px rgba(15,23,42,0.08)",
        glow: "0 8px 24px -6px rgba(91,91,240,0.55)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(6px)" }, "100%": { opacity: 1, transform: "none" } },
      },
      animation: { rise: "rise .35s ease-out both" },
    },
  },
  plugins: [],
};
