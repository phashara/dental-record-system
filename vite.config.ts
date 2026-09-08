import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // 👈 ใส่บรรทัดนี้เพื่อให้ทำงานบน GitHub Pages ได้ทุกชื่อ Repo
});
