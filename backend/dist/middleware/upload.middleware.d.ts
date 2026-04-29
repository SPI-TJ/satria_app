/**
 * Upload middleware (multer)
 *
 * Menyimpan file ke `backend/uploads/<subdir>/`. File di-serve via
 * `app.use('/uploads', express.static(...))` di app.ts, sehingga URL publik
 * = `/uploads/<subdir>/<filename>`.
 */
import multer from 'multer';
/** Upload PDF (max 10 MB) ke `uploads/ceo-letters/`. */
export declare const uploadCeoLetterPdf: multer.Multer;
/** Public URL prefix yang konsisten dengan static serve di app.ts */
export declare function publicUploadUrl(subdir: string, filename: string): string;
export declare const UPLOADS_DIR: string;
//# sourceMappingURL=upload.middleware.d.ts.map