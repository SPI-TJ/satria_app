-- CEO Letter: support multiple letters per audit year and target ownership per area.

ALTER TABLE pkpt.ceo_letter
    DROP CONSTRAINT IF EXISTS ceo_letter_tahun_key;

CREATE INDEX IF NOT EXISTS idx_ceo_letter_tahun_active
    ON pkpt.ceo_letter(tahun, created_at DESC)
    WHERE deleted_at IS NULL;

ALTER TABLE pkpt.ceo_letter_area
    ADD COLUMN IF NOT EXISTS target_tipe VARCHAR(20) NOT NULL DEFAULT 'Direksi'
        CHECK (target_tipe IN ('Direksi','Komisaris')),
    ADD COLUMN IF NOT EXISTS target_unit VARCHAR(50) NOT NULL DEFAULT 'Utama'
        CHECK (target_unit IN ('Utama','Keuangan','Bisnis','Operasional','Teknologi Informasi','Komisaris'));

COMMENT ON COLUMN pkpt.ceo_letter_area.target_tipe IS 'Tujuan arahan: Direksi atau Komisaris';
COMMENT ON COLUMN pkpt.ceo_letter_area.target_unit IS 'Bidang penerima arahan, contoh Direksi Utama atau Komisaris';
