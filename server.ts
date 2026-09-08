import app, { DOCTORS } from './server/app';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

export { DOCTORS };

const PORT = 3000;

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Denture Registry Server running on port ${PORT}`);
  });
}

// Start standalone dev/production server when not running in Vercel Serverless environment
if (!process.env.VERCEL) {
  start();
}

export default app;
