import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from "child_process";

// Get git version at build time
function getGitVersion(): string {
  try {
    const gitDescribe = execSync('git describe --tags --long --dirty', { encoding: 'utf-8' }).trim();
    console.log(`Build version: ${gitDescribe}`);
    return gitDescribe;
  } catch (error) {
    console.warn('Could not get git version:', error);
    // Use a more descriptive fallback that includes timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const fallback = `v0.1.0-${timestamp}-build`;
    console.log(`Using fallback version: ${fallback}`);
    return fallback;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(getGitVersion()),
  },
}));
