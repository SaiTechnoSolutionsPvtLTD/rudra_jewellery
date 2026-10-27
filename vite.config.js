import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '127.0.0.1',
        hmr: {
            host: '127.0.0.1',
        },
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Private-Network': 'true',
        },
        watch: {
            ignored: [
                '**/storage/framework/views/**',
                '**/public/*.zip',
                '**/*.zip'
            ],
        },
    },
    build: {
        emptyOutDir: false,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                            return 'vendor-react';
                        }
                        if (id.includes('xlsx')) {
                            return 'vendor-xlsx';
                        }
                        if (id.includes('axios')) {
                            return 'vendor-axios';
                        }
                    }
                },
            },
        },
    },
});
