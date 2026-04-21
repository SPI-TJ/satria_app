import { Request, Response } from 'express';
import { query } from '../../config/database';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { RiskLevel, RiskStatus } from '../../types';

// ── GET /api/risks ────────────────────────────────────────────
export async function getRisks(req: Request, res: Response) {
  try {
    const { department, divisi, level, status, search, tahun, page = '1', limit = '10' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: unknown[] = [];
    const conditions = ['r.deleted_at IS NULL'];

    if (tahun)      { params.push(tahun);           conditions.push(`r.tahun = $${params.length}`); }
    if (level)      { params.push(level);           conditions.push(`r.risk_level = $${params.length}`); }
    if (status)     { params.push(status);          conditions.push(`r.status = $${params.length}`); }
    if (divisi)     { params.push(`%${divisi}%`);   conditions.push(`r.divisi ILIKE $${params.length}`); }
    if (department) { params.push(`%${department}%`); conditions.push(`r.department_name ILIKE $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(r.risk_description ILIKE $${params.length} OR r.risk_code ILIKE $${params.length} OR r.department_name ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM pkpt.risk_data r WHERE ${where}`, params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    params.push(Number(limit), offset);
    const dataRes = await query(
      `SELECT r.id, r.risk_code, r.divisi, r.department_name, r.risk_description,
              r.risk_level, r.status, r.source, r.tahun, r.created_at, r.updated_at,
              u.nama_lengkap AS imported_by_nama
       FROM pkpt.risk_data r
       LEFT JOIN auth.users u ON u.id = r.imported_by
       WHERE ${where}
       ORDER BY
         CASE r.risk_level
           WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
           WHEN 'Medium'   THEN 3 WHEN 'Low'  THEN 4
         END,
         r.risk_code
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return res.json({
      success: true,
      data: dataRes.rows,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[risk.getAll]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── GET /api/risks/:id ────────────────────────────────────────
export async function getRiskById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT r.*, u.nama_lengkap AS imported_by_nama
       FROM pkpt.risk_data r
       LEFT JOIN auth.users u ON u.id = r.imported_by
       WHERE r.id = $1 AND r.deleted_at IS NULL`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Risiko tidak ditemukan.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[risk.getById]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── POST /api/risks — tambah risiko manual satu per satu ─────
export async function createRisk(req: Request, res: Response) {
  try {
    const {
      risk_code, divisi, department_name, risk_description,
      risk_level, status = 'Open', tahun,
    } = req.body;

    if (!risk_code || !risk_description || !risk_level || !tahun) {
      return res.status(400).json({ success: false, message: 'Field wajib: risk_code, risk_description, risk_level, tahun.' });
    }

    const result = await query<{ id: string }>(
      `INSERT INTO pkpt.risk_data
         (risk_code, divisi, department_name, risk_description, risk_level, status, source, tahun, imported_by)
       VALUES ($1,$2,$3,$4,$5,$6,'Manual',$7,$8)
       ON CONFLICT (risk_code, tahun) DO UPDATE SET
         divisi           = EXCLUDED.divisi,
         department_name  = EXCLUDED.department_name,
         risk_description = EXCLUDED.risk_description,
         risk_level       = EXCLUDED.risk_level,
         status           = EXCLUDED.status,
         updated_at       = NOW()
       RETURNING id`,
      [risk_code, divisi || null, department_name || '', risk_description,
       risk_level, status, tahun, req.user!.id],
    );

    return res.status(201).json({
      success: true,
      message: 'Risiko berhasil ditambahkan.',
      data: { id: result.rows[0].id },
    });
  } catch (err) {
    console.error('[risk.create]', err);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan data risiko.' });
  }
}

// ── PATCH /api/risks/:id ──────────────────────────────────────
export async function updateRisk(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      risk_code, divisi, department_name, risk_description,
      risk_level, status,
    } = req.body;

    const existing = await query(
      `SELECT id FROM pkpt.risk_data WHERE id = $1 AND deleted_at IS NULL`, [id],
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'Risiko tidak ditemukan.' });
    }

    await query(
      `UPDATE pkpt.risk_data SET
         risk_code        = COALESCE($1, risk_code),
         divisi           = COALESCE($2, divisi),
         department_name  = COALESCE($3, department_name),
         risk_description = COALESCE($4, risk_description),
         risk_level       = COALESCE($5, risk_level),
         status           = COALESCE($6, status),
         updated_at       = NOW()
       WHERE id = $7 AND deleted_at IS NULL`,
      [risk_code, divisi, department_name, risk_description, risk_level, status, id],
    );

    return res.json({ success: true, message: 'Risiko berhasil diperbarui.' });
  } catch (err) {
    console.error('[risk.update]', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data risiko.' });
  }
}

// ── DELETE /api/risks/:id (soft delete) ──────────────────────
export async function deleteRisk(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Cek apakah risiko digunakan oleh program PKPT
    const usageCheck = await query(
      `SELECT COUNT(*) FROM pkpt.annual_plan_risks WHERE risk_id = $1`,
      [id],
    );
    if (Number(usageCheck.rows[0]?.count ?? 0) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Risiko ini sudah digunakan dalam Program PKPT dan tidak dapat dihapus.',
      });
    }

    await query(
      `UPDATE pkpt.risk_data SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    return res.json({ success: true, message: 'Risiko berhasil dihapus.' });
  } catch (err) {
    console.error('[risk.delete]', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus data risiko.' });
  }
}

// ── POST /api/risks/import/trust ──────────────────────────────
export async function importFromTrust(req: Request, res: Response) {
  try {
    const { tahun, connection_id } = req.body;
    if (!tahun) {
      return res.status(400).json({ success: false, message: 'Tahun wajib diisi.' });
    }

    const connRes = await query<{ api_url: string; api_key_hash: string }>(
      'SELECT api_url, api_key_hash FROM master.trust_connections WHERE id = $1 AND is_active = TRUE',
      [connection_id],
    );
    if (!connRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Koneksi TRUST tidak ditemukan.' });
    }

    const trustData = await fetchTrustRisks(connRes.rows[0].api_url, tahun as string);

    let imported = 0;
    for (const risk of trustData) {
      await query(
        `INSERT INTO pkpt.risk_data
           (risk_code, divisi, department_name, risk_description, risk_level, status, source, tahun, imported_by, raw_data)
         VALUES ($1,$2,$3,$4,$5,$6,'TRUST',$7,$8,$9)
         ON CONFLICT (risk_code, tahun) DO UPDATE SET
           divisi           = EXCLUDED.divisi,
           risk_description = EXCLUDED.risk_description,
           risk_level       = EXCLUDED.risk_level,
           status           = EXCLUDED.status,
           updated_at       = NOW()`,
        [risk.risk_code, risk.divisi || null, risk.department_name,
         risk.risk_description, risk.risk_level, risk.status,
         tahun, req.user!.id, JSON.stringify(risk)],
      );
      imported++;
    }

    await query(
      `UPDATE master.trust_connections SET last_sync_at = NOW(), last_sync_count = $1 WHERE id = $2`,
      [imported, connection_id],
    );

    return res.json({
      success: true,
      message: `${imported} risiko berhasil diimpor dari TRUST.`,
      data: { imported },
    });
  } catch (err) {
    console.error('[risk.importTrust]', err);
    return res.status(500).json({ success: false, message: 'Gagal import dari TRUST.' });
  }
}

// ── POST /api/risks/import/file ───────────────────────────────
export async function importFromFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File wajib diunggah.' });
    }
    const { tahun } = req.body;
    if (!tahun) {
      return res.status(400).json({ success: false, message: 'Tahun wajib diisi.' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

    let imported = 0;
    const errors: string[] = [];

    for (const [i, row] of rows.entries()) {
      try {
        const risk_code        = String(row['Risk ID'] || row['risk_code'] || '').trim();
        const divisi           = String(row['Divisi'] || row['divisi'] || '').trim() || null;
        const department_name  = String(row['Department'] || row['Departemen'] || row['department'] || '').trim();
        const risk_description = String(row['Risk Description'] || row['Deskripsi'] || row['risk_description'] || '').trim();
        const risk_level       = normalizeLevel(String(row['Level'] || row['Risk Level'] || row['risk_level'] || ''));
        const status           = normalizeStatus(String(row['Status'] || row['status'] || ''));

        if (!risk_code || !risk_description || !risk_level) {
          errors.push(`Baris ${i + 2}: Data tidak lengkap (risk_code/deskripsi/level)`);
          continue;
        }

        await query(
          `INSERT INTO pkpt.risk_data
             (risk_code, divisi, department_name, risk_description, risk_level, status, source, tahun, imported_by)
           VALUES ($1,$2,$3,$4,$5,$6,'Manual',$7,$8)
           ON CONFLICT (risk_code, tahun) DO UPDATE SET
             divisi           = EXCLUDED.divisi,
             department_name  = EXCLUDED.department_name,
             risk_description = EXCLUDED.risk_description,
             risk_level       = EXCLUDED.risk_level,
             status           = EXCLUDED.status,
             updated_at       = NOW()`,
          [risk_code, divisi, department_name, risk_description, risk_level, status, tahun, req.user!.id],
        );
        imported++;
      } catch (rowErr) {
        errors.push(`Baris ${i + 2}: ${String(rowErr)}`);
      }
    }

    fs.unlinkSync(req.file.path);

    return res.json({
      success: true,
      message: `${imported} risiko berhasil diimpor.`,
      data: { imported, errors },
    });
  } catch (err) {
    console.error('[risk.importFile]', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses file.' });
  }
}

// ── GET /api/risks/trust/status ───────────────────────────────
export async function getTrustStatus(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT id, nama_koneksi, api_url, is_active, last_sync_at, last_sync_count
       FROM master.trust_connections WHERE is_active = TRUE AND deleted_at IS NULL LIMIT 1`,
    );
    return res.json({
      success: true,
      data: result.rows[0] || null,
      connected: result.rows.length > 0,
    });
  } catch (err) {
    console.error('[risk.trustStatus]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── GET /api/risks/divisi-list ────────────────────────────────
export async function getDivisiList(req: Request, res: Response) {
  try {
    const { tahun } = req.query;
    const params: unknown[] = [];
    let where = 'deleted_at IS NULL AND divisi IS NOT NULL';
    if (tahun) { params.push(tahun); where += ` AND tahun = $${params.length}`; }

    const result = await query(
      `SELECT DISTINCT divisi FROM pkpt.risk_data WHERE ${where} ORDER BY divisi`,
      params,
    );
    return res.json({ success: true, data: result.rows.map((r) => r.divisi) });
  } catch (err) {
    console.error('[risk.divisiList]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
}

// ── Helpers ───────────────────────────────────────────────────

async function fetchTrustRisks(apiUrl: string, tahun: string): Promise<TrustRiskItem[]> {
  // Mock data untuk development — ganti dengan HTTP call ke TRUST API
  void apiUrl;
  return [
    { risk_code: `RSK-${tahun}-T01`, divisi: 'Divisi TI', department_name: 'IT Operations',  risk_description: 'Data breach due to outdated firewall configuration', risk_level: 'High',   status: 'Open' },
    { risk_code: `RSK-${tahun}-T02`, divisi: 'Divisi Keuangan', department_name: 'Finance',   risk_description: 'Inaccurate financial reporting due to manual data entry', risk_level: 'Medium', status: 'Mitigated' },
    { risk_code: `RSK-${tahun}-T03`, divisi: 'Divisi SDM',    department_name: 'Human Resources', risk_description: 'High employee turnover in key technical roles', risk_level: 'Medium', status: 'Open' },
    { risk_code: `RSK-${tahun}-T04`, divisi: 'Divisi Operasional', department_name: 'Operations', risk_description: 'Process inefficiency leading to increased costs', risk_level: 'Medium', status: 'Open' },
    { risk_code: `RSK-${tahun}-T05`, divisi: 'Divisi Pengadaan', department_name: 'Supply Chain', risk_description: 'Vendor dependency risk causing supply disruption', risk_level: 'High', status: 'Open' },
  ];
}

interface TrustRiskItem {
  risk_code: string; divisi?: string; department_name: string;
  risk_description: string; risk_level: RiskLevel; status: RiskStatus;
}

function normalizeLevel(val: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    critical: 'Critical', high: 'High', medium: 'Medium',
    low: 'Low', tinggi: 'High', sedang: 'Medium', rendah: 'Low', kritis: 'Critical',
  };
  return map[val.toLowerCase()] ?? 'Medium';
}

function normalizeStatus(val: string): RiskStatus {
  const map: Record<string, RiskStatus> = {
    open: 'Open', mitigated: 'Mitigated', closed: 'Closed',
    'belum dimitigasi': 'Open', dimitigasi: 'Mitigated', selesai: 'Closed',
  };
  return map[val.toLowerCase()] ?? 'Open';
}
