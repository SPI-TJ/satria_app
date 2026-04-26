"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Modul 1 — Perencanaan Pengawasan Tahunan (PKPT)
 * Routes: risks, annual-plans, auditors, workload, dashboard stats
 */
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
// Admin IT tidak boleh akses modul audit — hanya user management + activity log.
function blockItAdmin(req, res, next) {
    if (req.user?.role === 'it_admin') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Admin IT tidak memiliki akses ke modul audit.',
        });
    }
    next();
}
const risk_controller_1 = require("../controllers/module1/risk.controller");
const annual_plans_controller_1 = require("../controllers/module1/annual-plans.controller");
const auditors_controller_1 = require("../controllers/module1/auditors.controller");
const workload_controller_1 = require("../controllers/module1/workload.controller");
const evaluation_controller_1 = require("../controllers/module1/evaluation.controller");
const router = (0, express_1.Router)();
// Semua route modul 1 butuh authenticate + bukan it_admin.
router.use(auth_middleware_1.authenticate, blockItAdmin);
// ── Dashboard Stats ───────────────────────────────────────────
router.get('/dashboard/stats', auth_middleware_1.authenticate, annual_plans_controller_1.getDashboardStats);
// ── Risk Data — static routes HARUS di atas /:id ─────────────
router.get('/risks/top', auth_middleware_1.authenticate, risk_controller_1.getTopRisks);
router.get('/risks/level-ref', auth_middleware_1.authenticate, risk_controller_1.getRiskLevelRef);
router.get('/risks/sasaran-korporat', auth_middleware_1.authenticate, risk_controller_1.getSasaranKorporat);
router.get('/risks/stats', auth_middleware_1.authenticate, risk_controller_1.getRiskStats);
router.get('/risks/template', auth_middleware_1.authenticate, risk_controller_1.downloadRiskTemplate);
// CRUD risks
router.get('/risks', auth_middleware_1.authenticate, risk_controller_1.getRisks);
router.post('/risks', auth_middleware_1.authenticate, risk_controller_1.createRisk);
router.get('/risks/:id', auth_middleware_1.authenticate, risk_controller_1.getRiskById);
router.patch('/risks/:id', auth_middleware_1.authenticate, risk_controller_1.updateRisk);
router.delete('/risks/:id', auth_middleware_1.authenticate, risk_controller_1.deleteRisk);
// ── Auditors (untuk pilih anggota tim) ───────────────────────
router.get('/auditors', auth_middleware_1.authenticate, auditors_controller_1.getAuditors);
// ── Workload (Beban Kerja Auditor) ────────────────────────────
router.get('/workload', auth_middleware_1.authenticate, workload_controller_1.getWorkload);
router.post('/workload/simulate', auth_middleware_1.authenticate, workload_controller_1.simulateWorkload);
// ── Annual Audit Plans ────────────────────────────────────────
router.get('/annual-plans', auth_middleware_1.authenticate, annual_plans_controller_1.getAnnualPlans);
router.post('/annual-plans', auth_middleware_1.authenticate, annual_plans_controller_1.createAnnualPlan);
router.get('/annual-plans/:id', auth_middleware_1.authenticate, annual_plans_controller_1.getAnnualPlanById);
router.patch('/annual-plans/:id', auth_middleware_1.authenticate, annual_plans_controller_1.updateAnnualPlan);
router.delete('/annual-plans/:id', auth_middleware_1.authenticate, annual_plans_controller_1.deleteAnnualPlan);
router.patch('/annual-plans/:id/finalize', auth_middleware_1.authenticate, annual_plans_controller_1.finalizeAnnualPlan);
router.patch('/annual-plans/:id/mark-completed', auth_middleware_1.authenticate, annual_plans_controller_1.markPlanCompleted);
router.patch('/annual-plans/:id/mark-on-progress', auth_middleware_1.authenticate, annual_plans_controller_1.markPlanOnProgress);
router.post('/annual-plans/scan-deadlines', auth_middleware_1.authenticate, annual_plans_controller_1.runDeadlineScan);
// ── Penilaian Auditor ────────────────────────────────────────
router.get('/evaluations/pending', auth_middleware_1.authenticate, evaluation_controller_1.getPendingEvaluations);
router.get('/evaluations/summary', auth_middleware_1.authenticate, evaluation_controller_1.getEvaluationSummary);
router.get('/evaluations/auditor/:userId', auth_middleware_1.authenticate, evaluation_controller_1.getAuditorEvaluationDetail);
router.post('/evaluations', auth_middleware_1.authenticate, evaluation_controller_1.submitEvaluation);
exports.default = router;
//# sourceMappingURL=module1.routes.js.map