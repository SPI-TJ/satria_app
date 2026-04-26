# 📋 SATRIA Backend Logging Guide

## Ringkasan

Backend SATRIA sekarang menggunakan **Winston** untuk logging yang lebih terstruktur dan professional. Ini menggantikan `console.log()` dan `console.error()` yang tidak terstruktur.

## 📁 Struktur Log

### Location
Logs disimpan di folder `backend/logs/`:
- **combined-YYYY-MM-DD.log** - Semua log (info, warn, error, debug)
- **error-YYYY-MM-DD.log** - Hanya error logs
- **Console output** - Real-time di terminal saat development

### Retention
- Max file size: 10MB per file
- Max age: 30 hari (auto-delete older logs)
- Daily rotation

## 🎯 Log Levels

Winston menggunakan 5 log levels:

| Level | Priority | Penggunaan | Contoh |
|-------|----------|-----------|--------|
| **error** | 0 (Tertinggi) | Exception, database errors | DB connection failed |
| **warn** | 1 | Warning conditions | Deprecated API used |
| **info** | 2 | Normal operational info | User logged in |
| **http** | 3 | HTTP requests/responses | GET /api/users |
| **debug** | 4 (Terendah) | Development debugging | Variable values |

## 🚀 Cara Menggunakan Logger

### 1. Import Logger
```typescript
import logger from '../utils/logger';
```

### 2. Logging Success Operations
```typescript
// Sebelum return res.json({ success: true })
logger.info('[USERS] User created successfully', { 
  user_id: result.rows[0].id, 
  nik: user.nik, 
  created_by: req.user!.id 
});
```

### 3. Logging Errors
```typescript
try {
  // ... operation ...
} catch (err) {
  logger.error(`[USERS] Create user failed: ${(err as Error).message}`, { 
    error: err, 
    nik: req.body.nik 
  });
  return res.status(500).json({ success: false, message: 'Server error' });
}
```

### 4. Logging Info/Debug
```typescript
// Info - operasi penting
logger.info('[AUTH] Password changed', { user_id });

// Debug - untuk development
logger.debug('[DATABASE] Query executed', { query, duration: 45 });
```

## 📊 Log Format

### Console Output (Development)
```
2024-04-21 15:30:45:123 | info | [AUTH] User login successful: 12345 (user-001)
2024-04-21 15:30:46:456 | error | [AUTH] Login failed: User not found
2024-04-21 15:30:47:789 | http | 127.0.0.1 - - [21/Apr/2024 15:30:47] "POST /api/auth/login HTTP/1.1" 200 245 "-" "Mozilla/5.0"
```

### File Output (JSON Format)
```json
{
  "timestamp": "2024-04-21 15:30:45:123",
  "level": "error",
  "message": "[AUTH] Login failed: User not found",
  "error": { "message": "User not found", "stack": "..." }
}
```

## ✅ Best Practices

### ✓ DO:
```typescript
// 1. Gunakan prefixes yang konsisten untuk module
logger.info('[USERS] User profile updated', { user_id });
logger.info('[RISK] Risk created', { risk_id, created_by });

// 2. Include context data untuk debugging
logger.error(`[OPERATION] Failed: ${err.message}`, { 
  error: err,
  user_id,
  request_body: req.body // jangan include sensitive data seperti password
});

// 3. Log di critical points
logger.info('[DATABASE] Connection established');
logger.info('[API] Server started on port 5000');
```

### ✗ DON'T:
```typescript
// ✗ Jangan gunakan console.log
console.log('User logged in');

// ✗ Jangan log sensitive data
logger.info('User login', { password: user.password });

// ✗ Jangan log terlalu banyak di loop
for (let i = 0; i < 1000; i++) {
  logger.info('Processing item', { item_id: i }); // ✗ Jangan!
}

// ✓ Better approach
logger.info('Starting batch processing', { total_items: 1000 });
// ... process items ...
logger.info('Batch processing completed', { processed: 1000 });
```

## 🔍 Monitoring Logs

### Real-time di Terminal
```bash
# Terminal 1 - Terminal sudah menampilkan logs live
npm run dev
```

### View Recent Errors
```bash
# Last 50 lines of error log
tail -50 logs/error-2024-04-21.log

# Filter specific errors
grep "DATABASE" logs/combined-2024-04-21.log
```

### Search Logs
```bash
# Cari logs dari user tertentu
grep "user-001" logs/combined-*.log

# Cari semua errors
grep "\"level\":\"error\"" logs/error-*.log

# Cari logs dalam 2 jam terakhir
find logs -name "combined-*.log" -newermt "2 hours ago"
```

## 🎨 Log Prefixes Used

Konsisten gunakan prefixes ini untuk clarity:

```typescript
// Authentication
[AUTH] - Login, password, tokens
[AUTH] User login successful

// User Management
[USERS] - User CRUD operations
[USERS] User created successfully

// Organisasi/Master Data
[ORG] - Direktorat, Divisi, Departemen
[ORG] Direktorat updated

// Risk Management
[RISK] - Risk CRUD, operations
[RISK] Risk analysis completed

// PKPT/Annual Plans
[PLAN] - Annual plans, PKPT
[PLAN] Plan finalized

// Notifications
[NOTIFICATIONS] - Notification operations
[NOTIFICATIONS] Notification sent

// Activity Log
[ACTIVITY_LOG] - Activity tracking
[ACTIVITY_LOG] Activity recorded

// Database
[DATABASE] - DB operations, connections
[DATABASE] Query executed

// General
[HTTP] - HTTP request/response (morgan)
[APP] - Application startup/shutdown
```

## 📈 Environment Variables

Sesuaikan logging behavior dengan variables:

```bash
# .env file
LOG_LEVEL=debug        # debug, http, info, warn, error
NODE_ENV=development   # development, production
```

### Log Levels by Environment
- **Development**: `debug` (semua logs)
- **Production**: `warn` (hanya warnings & errors)

## 🔧 Configuration

Logger dikonfigurasi di `backend/src/utils/logger.ts`:

```typescript
// Ubah format
winston.format.printf((info) => `${info.timestamp} | ${info.level} | ${info.message}`)

// Tambah transport baru
new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/custom-%DATE%.log'),
  // ...
})
```

## 🚨 Common Issues & Solutions

### Issue: Logs tidak muncul
```typescript
// ✓ Pastikan sudah import logger
import logger from '../utils/logger';

// ✓ Pastikan menggunakan logger, bukan console
logger.error('error message'); // ✓
console.error('error message'); // ✗
```

### Issue: File log terlalu besar
- Logs auto-rotate setelah 10MB
- Old files dihapus setelah 30 hari
- Tidak perlu action manual

### Issue: Sensitive data di logs
```typescript
// ✗ Jangan
logger.info('User data', { password: user.password });

// ✓ Lakukan
logger.info('User login', { user_id: user.id, nik: user.nik });
```

## 📚 Contoh Implementasi

### Authentication Flow
```typescript
import logger from '../utils/logger';

export async function login(req: Request, res: Response) {
  try {
    logger.info('[AUTH] Login attempt', { nik: req.body.nik });
    
    const user = await query('SELECT ... FROM users WHERE nik = $1', [nik]);
    if (!user) {
      logger.warn('[AUTH] Login failed - user not found', { nik });
      return res.status(401).json({ success: false });
    }
    
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      logger.warn('[AUTH] Login failed - invalid password', { nik });
      return res.status(401).json({ success: false });
    }
    
    const token = generateToken(user);
    logger.info('[AUTH] Login successful', { user_id: user.id, nik });
    
    return res.json({ success: true, data: { token, user } });
  } catch (err) {
    logger.error(`[AUTH] Login error: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false });
  }
}
```

### Data Management Flow
```typescript
export async function updateRisk(req: Request, res: Response) {
  try {
    const { id } = req.params;
    logger.info('[RISK] Update initiated', { risk_id: id, updated_by: req.user!.id });
    
    const result = await query('UPDATE risks SET ... WHERE id = $1', [id]);
    
    logger.info('[RISK] Risk updated successfully', { 
      risk_id: id, 
      updated_by: req.user!.id 
    });
    
    return res.json({ success: true });
  } catch (err) {
    logger.error(`[RISK] Update failed: ${(err as Error).message}`, {
      error: err,
      risk_id: req.params.id,
      updated_by: req.user!.id
    });
    return res.status(500).json({ success: false });
  }
}
```

## 🎯 Next Steps

1. **Test logging**: Jalankan backend dengan `npm run dev`
2. **Check logs**: Lihat file logs di `backend/logs/`
3. **Monitor terminal**: Amati real-time logs di console
4. **Add custom logging**: Sesuaikan untuk use cases spesifik

## 📞 Support

Untuk pertanyaan tentang logging:
1. Cek `backend/src/utils/logger.ts` untuk konfigurasi
2. Cek `backend/src/utils/morgan.middleware.ts` untuk HTTP logging
3. Referensi Winston docs: https://github.com/winstonjs/winston
