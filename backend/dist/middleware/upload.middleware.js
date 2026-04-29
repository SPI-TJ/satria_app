"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOADS_DIR = exports.uploadCeoLetterPdf = void 0;
exports.publicUploadUrl = publicUploadUrl;
/**
 * Upload middleware (multer)
 *
 * Menyimpan file ke `backend/uploads/<subdir>/`. File di-serve via
 * `app.use('/uploads', express.static(...))` di app.ts, sehingga URL publik
 * = `/uploads/<subdir>/<filename>`.
 */
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const UPLOADS_ROOT = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(UPLOADS_ROOT)) {
    fs_1.default.mkdirSync(UPLOADS_ROOT, { recursive: true });
}
function makeStorage(subdir) {
    const dir = path_1.default.join(UPLOADS_ROOT, subdir);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    return multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, dir),
        filename: (_req, file, cb) => {
            const ts = Date.now();
            const rand = Math.random().toString(36).slice(2, 8);
            const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            cb(null, `${ts}_${rand}_${safe}`);
        },
    });
}
function pdfFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname)) {
        cb(null, true);
    }
    else {
        cb(new Error('Hanya file PDF yang diperbolehkan.'));
    }
}
/** Upload PDF (max 10 MB) ke `uploads/ceo-letters/`. */
exports.uploadCeoLetterPdf = (0, multer_1.default)({
    storage: makeStorage('ceo-letters'),
    fileFilter: pdfFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});
/** Public URL prefix yang konsisten dengan static serve di app.ts */
function publicUploadUrl(subdir, filename) {
    return `/uploads/${subdir}/${filename}`;
}
exports.UPLOADS_DIR = UPLOADS_ROOT;
//# sourceMappingURL=upload.middleware.js.map