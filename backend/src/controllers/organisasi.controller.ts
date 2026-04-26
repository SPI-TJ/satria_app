import { Request, Response } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';

// ════════════════════════════════════════════════════════
//  DROPDOWN ENDPOINTS (Simple list, no pagination)
//  Digunakan oleh frontend untuk select/combobox
// ════════════════════════════════════════════════════════

export async function getDirektoratsDropdown(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT id, kode, nama FROM master.direktorat
       WHERE deleted_at IS NULL AND is_active = TRUE
       ORDER BY kode`,
    );
    logger.info('[ORG] Fetched direktorats dropdown');
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error(`[ORG] Get direktorats dropdown failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getDivisDropdown(req: Request, res: Response) {
  try {
    const { direktorat_id } = req.query;
    const params: unknown[] = [];
    const conds = ['d.deleted_at IS NULL', 'd.is_active = TRUE'];

    if (direktorat_id) {
      params.push(direktorat_id);
      conds.push(`d.direktorat_id = $${params.length}`);
    }

    const result = await query(
      `SELECT d.id, d.kode, d.nama, d.direktorat_id
       FROM master.divisi d
       WHERE ${conds.join(' AND ')}
       ORDER BY d.kode`,
      params,
    );
    logger.info('[ORG] Fetched divisis dropdown', { direktorat_id });
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error(`[ORG] Get divisis dropdown failed: ${(err as Error).message}`, { error: err, direktorat_id: req.query.direktorat_id });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getDepartemensDropdown(req: Request, res: Response) {
  try {
    const { divisi_id } = req.query;
    const params: unknown[] = [];
    const conds = ['d.deleted_at IS NULL', 'd.is_active = TRUE'];

    if (divisi_id) {
      params.push(divisi_id);
      conds.push(`d.divisi_id = $${params.length}`);
    }

    const result = await query(
      `SELECT d.id, d.kode, d.nama, d.divisi_id
       FROM master.departemen d
       WHERE ${conds.join(' AND ')}
       ORDER BY d.kode`,
      params,
    );
    logger.info('[ORG] Fetched departemens dropdown', { divisi_id });
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error(`[ORG] Get departemens dropdown failed: ${(err as Error).message}`, { error: err, divisi_id: req.query.divisi_id });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getSasaranKorporatDropdown(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT id, kode, nama FROM master.sasaran_korporat
       WHERE is_active = TRUE
       ORDER BY kode`,
    );
    logger.info('[ORG] Fetched sasaran korporat dropdown');
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error(`[ORG] Get sasaran korporat dropdown failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════════
//  MANAGEMENT ENDPOINTS (with pagination)
// ════════════════════════════════════════════════════════

export async function getDirektorats(req: Request, res: Response) {
  try {
    const { search, is_active, page = '1', limit = '50' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: unknown[] = [];
    const conditions = ['deleted_at IS NULL'];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(nama ILIKE $${params.length} OR kode ILIKE $${params.length})`);
    }
    if (is_active !== undefined && is_active !== '') {
      params.push(is_active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM master.direktorat WHERE ${where}`,
      params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    params.push(Number(limit), offset);
    const dataRes = await query(
      `SELECT id, kode, nama, deskripsi, is_active, created_at, updated_at
       FROM master.direktorat
       WHERE ${where}
       ORDER BY kode
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    logger.info(`[ORG] Fetched direktorat list`, { total, page, search });
    return res.json({
      success: true,
      data: dataRes.rows,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    logger.error(`[ORG] Get direktorats failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getDirektoratById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, kode, nama, deskripsi, is_active, created_at, updated_at
       FROM master.direktorat WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Direktorat tidak ditemukan' });
    }
    logger.info(`[ORG] Fetched direktorat by id`, { id });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Get direktorat by id failed: ${(err as Error).message}`, { error: err, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createDirektorat(req: Request, res: Response) {
  try {
    const { kode, nama, deskripsi } = req.body;
    if (!kode || !nama) {
      return res.status(400).json({ success: false, message: 'Kode dan nama wajib diisi' });
    }
    const dupCheck = await query(
      `SELECT id FROM master.direktorat WHERE kode = $1 AND deleted_at IS NULL`, [kode],
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Kode direktorat sudah ada' });
    }
    const result = await query<{ id: string }>(
      `INSERT INTO master.direktorat (kode, nama, deskripsi) VALUES ($1, $2, $3)
       RETURNING id, kode, nama, deskripsi, is_active, created_at`,
      [kode, nama, deskripsi ?? null],
    );
    logger.info(`[ORG] Direktorat created`, { kode, nama });
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Create direktorat failed: ${(err as Error).message}`, { error: err, kode: req.body.kode });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateDirektorat(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { kode, nama, deskripsi, is_active } = req.body;
    const result = await query<{ id: string }>(
      `UPDATE master.direktorat
       SET kode = COALESCE($2, kode), nama = COALESCE($3, nama),
           deskripsi = COALESCE($4, deskripsi), is_active = COALESCE($5, is_active)
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, kode, nama, deskripsi, is_active, updated_at`,
      [id, kode, nama, deskripsi, is_active],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Direktorat tidak ditemukan' });
    }
    logger.info(`[ORG] Direktorat updated`, { id });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Update direktorat failed: ${(err as Error).message}`, { error: err, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════════
//  DIVISI ENDPOINTS
// ════════════════════════════════════════════════════════

export async function getDivisis(req: Request, res: Response) {
  try {
    const { direktorat_id, search, is_active, page = '1', limit = '50' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: unknown[] = [];
    const conditions = ['d.deleted_at IS NULL'];

    if (direktorat_id) { params.push(direktorat_id); conditions.push(`d.direktorat_id = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.nama ILIKE $${params.length} OR d.kode ILIKE $${params.length})`);
    }
    if (is_active !== undefined && is_active !== '') {
      params.push(is_active === 'true');
      conditions.push(`d.is_active = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM master.divisi d WHERE ${where}`, params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    params.push(Number(limit), offset);
    const dataRes = await query(
      `SELECT d.id, d.direktorat_id, d.kode, d.nama, d.deskripsi, d.is_active,
              dr.nama as direktorat_nama, d.created_at, d.updated_at
       FROM master.divisi d
       LEFT JOIN master.direktorat dr ON d.direktorat_id = dr.id
       WHERE ${where} ORDER BY d.kode
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    logger.info(`[ORG] Fetched divisi list`, { total, page, search, direktorat_id });
    return res.json({
      success: true, data: dataRes.rows,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    logger.error(`[ORG] Get divisis failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getDivisiById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT d.id, d.direktorat_id, d.kode, d.nama, d.deskripsi, d.is_active,
              dr.nama as direktorat_nama, d.created_at, d.updated_at
       FROM master.divisi d
       LEFT JOIN master.direktorat dr ON d.direktorat_id = dr.id
       WHERE d.id = $1 AND d.deleted_at IS NULL`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Divisi tidak ditemukan' });
    }
    logger.info(`[ORG] Fetched divisi by id`, { id });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Get divisi by id failed: ${(err as Error).message}`, { error: err, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createDivisi(req: Request, res: Response) {
  try {
    const { direktorat_id, kode, nama, deskripsi } = req.body;
    if (!direktorat_id || !kode || !nama) {
      return res.status(400).json({ success: false, message: 'Direktorat ID, kode, dan nama wajib diisi' });
    }
    const dupCheck = await query(
      `SELECT id FROM master.divisi WHERE direktorat_id = $1 AND kode = $2 AND deleted_at IS NULL`,
      [direktorat_id, kode],
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Kode divisi sudah ada di direktorat ini' });
    }
    const result = await query<{ id: string }>(
      `INSERT INTO master.divisi (direktorat_id, kode, nama, deskripsi) VALUES ($1, $2, $3, $4)
       RETURNING id, direktorat_id, kode, nama, deskripsi, is_active, created_at`,
      [direktorat_id, kode, nama, deskripsi ?? null],
    );
    logger.info(`[ORG] Divisi created`, { direktorat_id, kode, nama });
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Create divisi failed: ${(err as Error).message}`, { error: err, direktorat_id: req.body.direktorat_id, kode: req.body.kode });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateDivisi(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { direktorat_id, kode, nama, deskripsi, is_active } = req.body;
    const result = await query<{ id: string }>(
      `UPDATE master.divisi
       SET direktorat_id = COALESCE($2, direktorat_id), kode = COALESCE($3, kode),
           nama = COALESCE($4, nama), deskripsi = COALESCE($5, deskripsi),
           is_active = COALESCE($6, is_active)
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, direktorat_id, kode, nama, deskripsi, is_active, updated_at`,
      [id, direktorat_id, kode, nama, deskripsi, is_active],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Divisi tidak ditemukan' });
    }
    logger.info(`[ORG] Divisi updated`, { id });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Update divisi failed: ${(err as Error).message}`, { error: err, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ════════════════════════════════════════════════════════
//  DEPARTEMEN ENDPOINTS
// ════════════════════════════════════════════════════════

export async function getDepartemens(req: Request, res: Response) {
  try {
    const { divisi_id, search, is_active, page = '1', limit = '50' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: unknown[] = [];
    const conditions = ['d.deleted_at IS NULL'];

    if (divisi_id) { params.push(divisi_id); conditions.push(`d.divisi_id = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.nama ILIKE $${params.length} OR d.kode ILIKE $${params.length})`);
    }
    if (is_active !== undefined && is_active !== '') {
      params.push(is_active === 'true');
      conditions.push(`d.is_active = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM master.departemen d WHERE ${where}`, params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    params.push(Number(limit), offset);
    const dataRes = await query(
      `SELECT d.id, d.divisi_id, d.kode, d.nama, d.deskripsi, d.is_active,
              div.nama as divisi_nama, dir.nama as direktorat_nama, d.created_at, d.updated_at
       FROM master.departemen d
       LEFT JOIN master.divisi div ON d.divisi_id = div.id
       LEFT JOIN master.direktorat dir ON div.direktorat_id = dir.id
       WHERE ${where} ORDER BY d.kode
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    logger.info(`[ORG] Fetched departemen list`, { total, page, search, divisi_id });
    return res.json({
      success: true, data: dataRes.rows,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    logger.error(`[ORG] Get departemens failed: ${(err as Error).message}`, { error: err });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getDepartemenById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT d.id, d.divisi_id, d.kode, d.nama, d.deskripsi, d.is_active,
              div.nama as divisi_nama, dir.nama as direktorat_nama, d.created_at, d.updated_at
       FROM master.departemen d
       LEFT JOIN master.divisi div ON d.divisi_id = div.id
       LEFT JOIN master.direktorat dir ON div.direktorat_id = dir.id
       WHERE d.id = $1 AND d.deleted_at IS NULL`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Departemen tidak ditemukan' });
    }
    logger.info(`[ORG] Fetched departemen by id`, { id });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Get departemen by id failed: ${(err as Error).message}`, { error: err, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createDepartemen(req: Request, res: Response) {
  try {
    const { divisi_id, kode, nama, deskripsi } = req.body;
    if (!divisi_id || !kode || !nama) {
      return res.status(400).json({ success: false, message: 'Divisi ID, kode, dan nama wajib diisi' });
    }
    const dupCheck = await query(
      `SELECT id FROM master.departemen WHERE divisi_id = $1 AND kode = $2 AND deleted_at IS NULL`,
      [divisi_id, kode],
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Kode departemen sudah ada di divisi ini' });
    }
    const result = await query<{ id: string }>(
      `INSERT INTO master.departemen (divisi_id, kode, nama, deskripsi) VALUES ($1, $2, $3, $4)
       RETURNING id, divisi_id, kode, nama, deskripsi, is_active, created_at`,
      [divisi_id, kode, nama, deskripsi ?? null],
    );
    logger.info(`[ORG] Departemen created`, { divisi_id, kode, nama });
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Create departemen failed: ${(err as Error).message}`, { error: err, divisi_id: req.body.divisi_id, kode: req.body.kode });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateDepartemen(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { divisi_id, kode, nama, deskripsi, is_active } = req.body;
    const result = await query<{ id: string }>(
      `UPDATE master.departemen
       SET divisi_id = COALESCE($2, divisi_id), kode = COALESCE($3, kode),
           nama = COALESCE($4, nama), deskripsi = COALESCE($5, deskripsi),
           is_active = COALESCE($6, is_active)
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, divisi_id, kode, nama, deskripsi, is_active, updated_at`,
      [id, divisi_id, kode, nama, deskripsi, is_active],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Departemen tidak ditemukan' });
    }
    logger.info(`[ORG] Departemen updated`, { id });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error(`[ORG] Update departemen failed: ${(err as Error).message}`, { error: err, id: req.params.id });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
