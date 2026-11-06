import { defineConfig } from 'vitest/config'; import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base: process.env.GITHUB_ACTIONS ? '/expense-report/' : '/',test:{environment:'jsdom',setupFiles:'./src/testSetup.ts',include:['src/**/*.{test,spec}.{ts,tsx}']}});
