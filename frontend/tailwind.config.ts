import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0f172a",
          muted: "#334155",
        },
        brand: {
          50: "#eef4ff",
          100: "#dce9ff",
          500: "#2f6af2",
          600: "#2156d9",
          700: "#1b47b6",
          800: "#173f94",
          900: "#122f71",
        },
      },
    },
  },
  plugins: [],
};

export default config;
