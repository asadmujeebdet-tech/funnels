/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182338",
        muted: "#718096",
        accent: "#3459e6",
        surface: "#ffffff",
      },
      boxShadow: {
        card: "0 8px 30px rgba(28, 42, 74, 0.06)",
      },
    },
  },
  plugins: [],
};
