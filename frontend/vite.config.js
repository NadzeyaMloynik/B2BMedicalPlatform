import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var target = env.VITE_API_BASE_URL || 'http://localhost:8085';
    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },
        server: {
            port: 5173,
            open: true,
            proxy: {
                '/api': {
                    target: target,
                    changeOrigin: true,
                    secure: false
                }
            }
        },
        preview: {
            port: 4173
        }
    };
});
