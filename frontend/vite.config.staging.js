import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    // define: {
    //     __DEV_STAGING__: true,
    // },
    server: {
        port: 5174, // different port from your real dev server
        proxy: {
            "/api": {
                target: "http://localhost:5001", // staging backend
                changeOrigin: true,
            },
        },
    },
});
