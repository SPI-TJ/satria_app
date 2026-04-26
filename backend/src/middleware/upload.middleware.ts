/**
 * Upload middleware (multer)
 *
 * Menyimpan file ke `backend/uploads/<subdir>/`. File di-serve via
 * `app.use('/uploads', express.static(...))` di app.ts, sehingga URL publik
 * = `/uploads/<subdir>/<filename>`.
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

function makeStorage(subdir: string): multer.StorageEngine {
  const dir = path.join(UPLOADS_ROOT, subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ts   = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      cb(null, `${ts}_${rand}_${safe}`);
    },
  });
}

function pdfFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file PDF yang diperbolehkan.'));
  }
}

/** Upload PDF (max 10 MB) ke `uploads/ceo-letters/`. */
export const uploadCeoLetterPdf = multer({
  storage:   makeStorage('ceo-letters'),
  fileFilter: pdfFilter,
  limits:    { fileSize: 10 * 1024 * 1024 },
});

/** Public URL prefix yang konsisten dengan static serve di app.ts */
export function publicUploadUrl(subdir: string, filename: string): string {
  return `/uploads/${subdir}/${filename}`;
}

export const UPLOADS_DIR = UPLOADS_ROOT;
