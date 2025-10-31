import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
export default defineConfig(({ command }) => ({ base: command==="build"?".././":"/", define: { "process.env": {} }, plugins: [react()] })) => ({
  base: command === "build" ? "./" : "/",
  define: { "process.env": {} },
  plugins: [react()]
}));
