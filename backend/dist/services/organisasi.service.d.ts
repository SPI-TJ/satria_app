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
export declare class OrganisasiService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get all direktorat
     */
    getDirektorat(): Promise<Direktorat[]>;
    /**
     * Get divisi by direktorat
     */
    getDivisi(direktorat_id?: string): Promise<Divisi[]>;
    /**
     * Get departemen by divisi
     */
    getDepartemen(divisi_id?: string): Promise<Departemen[]>;
    /**
     * Get sasaran korporat
     */
    getSasaranKorporat(): Promise<SasaranKorporat[]>;
    /**
     * Get organisasi hierarchy (direktorat + divisi + departemen)
     * untuk keperluan autocomplete atau dropdown tree
     */
    getOrgHierarchy(): Promise<any[]>;
}
//# sourceMappingURL=organisasi.service.d.ts.map