import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        routeBgStart: "#0B0F1A",
        routeBgEnd: "#121826",
        routeTeal: "#00E5FF",
        routePurple: "#7C3AED",
      },
      boxShadow: {
        glass: "0 10px 30px rgba(0, 229, 255, 0.08)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
