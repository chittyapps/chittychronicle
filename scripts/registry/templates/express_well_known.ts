import type { Express } from 'express';
import fs from 'fs';
import path from 'path';

export function registerServiceManifestRoute(app: Express) {
  app.get('/.well-known/service-manifest.json', (req, res) => {
    try {
      const manifestPath = path.resolve(process.cwd(), 'server', 'registry-manifest.json');
      if (fs.existsSync(manifestPath)) {
        res.sendFile(manifestPath);
      } else {
        res.status(404).json({ message: 'Manifest not found' });
      }
    } catch (err) {
      res.status(500).json({ message: 'Failed to load manifest' });
    }
  });
}

