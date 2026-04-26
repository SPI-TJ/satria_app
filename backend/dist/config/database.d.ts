import { Pool } from 'pg';
export declare const pool: Pool;
export declare function query<T = unknown>(text: string, params?: unknown[]): Promise<import('pg').QueryResult<T & Record<string, unknown>>>;
//# sourceMappingURL=database.d.ts.map