-- Tài liệu cấu trúc catalog CNTT (chạy dữ liệu thực tế: npm run reseed-cntt-catalog)
-- 12 nhóm: pe, defense, english, ai_iot, philosophy, software, bigdata, network, internship, security, soft_skills, math
-- 53 môn — xem scripts/reseed-cntt-subject-catalog.ts

INSERT INTO _migrations (name) VALUES ('033_reseed_cntt_subject_catalog')
ON CONFLICT (name) DO NOTHING;
