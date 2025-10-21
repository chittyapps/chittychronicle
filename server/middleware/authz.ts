import type { Request, Response, NextFunction } from 'express';

export function requireServiceTokenIfConfigured(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.CHITTYCHRONICLE_SERVICE_TOKEN;
  if (!expected) return next();
  const auth = req.header('authorization') || req.header('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing bearer token' });
  }
  const token = auth.slice('Bearer '.length).trim();
  if (token !== expected) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
  return next();
}

