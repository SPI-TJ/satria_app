import { Pool } from 'pg';

export interface Direktorat {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  is_active: boolean;
}

export interface Divisi {
  id: string;
  direktorat_id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  is_active: boolean;
}

export interface Departemen {
  id: string;
  divisi_id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  is_active: boolean;
}

export interface SasaranKorporat {
  id: string;
  kode: string;
  nama: string;
  is_active: boolean;
}

export class OrganisasiService {
  constructor(private pool: Pool) {}

  /**
   * Get all direktorat
   */
  async getDirektorat(): Promise<Direktorat[]> {
    const query = `
      SELECT id, kode, nama, deskripsi, is_active
      FROM master.direktorat
      WHERE is_active = true AND deleted_at IS NULL
      ORDER BY kode
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Get divisi by direktorat
   */
  async getDivisi(direktorat_id?: string): Promise<Divisi[]> {
    let query = `
      SELECT id, direktorat_id, kode, nama, deskripsi, is_active
      FROM master.divisi
      WHERE is_active = true AND deleted_at IS NULL
    `;

    const params: any[] = [];

    if (direktorat_id) {
      query += ` AND direktorat_id = $1`;
      params.push(direktorat_id);
    }

    query += ` ORDER BY kode`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get departemen by divisi
   */
  async getDepartemen(divisi_id?: string): Promise<Departemen[]> {
    let query = `
      SELECT id, divisi_id, kode, nama, deskripsi, is_active
      FROM master.departemen
      WHERE is_active = true AND deleted_at IS NULL
    `;

    const params: any[] = [];

    if (divisi_id) {
      query += ` AND divisi_id = $1`;
      params.push(divisi_id);
    }

    query += ` ORDER BY kode`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get sasaran korporat
   */
  async getSasaranKorporat(): Promise<SasaranKorporat[]> {
    const query = `
      SELECT id, kode, nama, is_active
      FROM master.sasaran_korporat
      WHERE is_active = true
      ORDER BY kode
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Get organisasi hierarchy (direktorat + divisi + departemen)
   * untuk keperluan autocomplete atau dropdown tree
   */
  async getOrgHierarchy() {
    const query = `
      WITH direktorat_data AS (
        SELECT id, kode, nama, 'direktorat' as level, NULL as parent_id
        FROM master.direktorat
        WHERE is_active = true AND deleted_at IS NULL
      ),
      divisi_data AS (
        SELECT d.id, d.kode, d.nama, 'divisi' as level, d.direktorat_id as parent_id
        FROM master.divisi d
        WHERE d.is_active = true AND d.deleted_at IS NULL
      ),
      departemen_data AS (
        SELECT dp.id, dp.kode, dp.nama, 'departemen' as level, dp.divisi_id as parent_id
        FROM master.departemen dp
        WHERE dp.is_active = true AND dp.deleted_at IS NULL
      )
      SELECT * FROM direktorat_data
      UNION ALL
      SELECT * FROM divisi_data
      UNION ALL
      SELECT * FROM departemen_data
      ORDER BY level, kode
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}
