import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // VITE_BASE: public path the app is served from.
  //   Domain root  → '/'
  //   Subfolder    → '/marbefapoultry/dist/'  (XAMPP local)
  //   Subdirectory → '/poultry/'
  const base = env.VITE_BASE || '/'

  return {
    plugins: [react()],
    base,
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
  }
})
