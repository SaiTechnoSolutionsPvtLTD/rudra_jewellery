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
        host: '0.0.0.0',
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
    },
});
