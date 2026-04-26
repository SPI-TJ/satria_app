/**
 * Penilaian Auditor (Berjenjang)
 * Stage 1 : Pengendali Teknis menilai Ketua Tim + Anggota Tim di program-nya.
 * Stage 2 : Kepala SPI menilai (setelah stage 1 selesai).
 * Aspek   : kompetensi_teknis, komunikasi, hasil_kerja (1–5).
 * Trigger : annual_audit_plans.completed_at IS NOT NULL.
 */
import { Request, Response } from 'express';
export declare function getPendingEvaluations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function submitEvaluation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getEvaluationSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getAuditorEvaluationDetail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=evaluation.controller.d.ts.map