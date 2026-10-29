import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: { ink: "#0a0a0a", paper: "#ece9e1", coral: "#fa4a3b" },
      fontFamily: { sans: ["Arial", "Helvetica", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
