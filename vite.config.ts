import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
export default defineConfig({
  base: "/",
  define: {
    "process.env": {},
    "process.env.API_KEY": JSON.stringify("")
  },
  plugins: [react()],
});
