-- ============================================================
--  Migration: Modul 1 — Risk × House of Strategy linkage
--  Date     : 2026-04-25
--
--  Menambahkan kolom hos_kategori_id & sasaran_strategis_id ke
--  pkpt.risk_data agar setiap risiko bisa di-link ke perspektif
--  Balanced Scorecard (HoS Kategori) + Sasaran Strategis tahun
--  yang sesuai. Kolom opsional (NULLABLE) supaya data lama tidak
--  break.
--
--  Aman dijalankan berulang.
-- ============================================================

ALTER TABLE pkpt.risk_data
    ADD COLUMN IF NOT EXISTS hos_kategori_id      UUID
        REFERENCES master.house_of_strategy_kategori(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sasaran_strategis_id UUID
        REFERENCES master.sasaran_strategis(id) ON DELETE SET NULL;

COMMENT ON COLUMN pkpt.risk_data.hos_kategori_id      IS 'FK ke perspektif HoS (Finance / Customer / IBP / LG) tahun terkait';
COMMENT ON COLUMN pkpt.risk_data.sasaran_strategis_id IS 'FK ke sasaran strategis (anak HoS Kategori)';

CREATE INDEX IF NOT EXISTS idx_risk_hos_kategori
    ON pkpt.risk_data(hos_kategori_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_sasaran_strategis
    ON pkpt.risk_data(sasaran_strategis_id) WHERE deleted_at IS NULL;
