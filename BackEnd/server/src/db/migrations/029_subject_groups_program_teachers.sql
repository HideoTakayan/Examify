-- =============================================================================
-- 029: Nhóm môn (subject_groups) theo cấu trúc chương trình CNTTVJ
-- Phenikaa University — Ngành Công nghệ thông tin Việt Nhật
-- =============================================================================
CREATE TABLE IF NOT EXISTS subject_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (program_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subject_groups_program ON subject_groups(program_id);

CREATE TABLE IF NOT EXISTS program_teachers (
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (program_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_program_teachers_teacher ON program_teachers(teacher_id);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_group_id UUID REFERENCES subject_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_subject_group ON subjects(subject_group_id);

-- =============================================================================
-- Seed 13 nhóm môn theo chuẩn chương trình CNTTVJ
-- A1, B1, C1, C2, D1, D2, E1, E2, F1, F2.1, F2.2, F2.3, F3
-- =============================================================================
INSERT INTO subject_groups (program_id, code, name, sort_order)
SELECT p.id, v.code, v.name, v.ord
FROM programs p
CROSS JOIN (VALUES
    ('A1',  'Khối kiến thức giáo dục đại cương',       1),
    ('B1',  'Khối kiến thức cơ sở ngành',               2),
    ('C1',  'Khối kiến thức bổ trợ (bắt buộc)',         3),
    ('C2',  'Khối kiến thức bổ trợ (tự chọn)',          4),
    ('D1',  'Khối kiến thức chuyên ngành (bắt buộc)',   5),
    ('D2',  'Khối kiến thức chuyên ngành (tự chọn)',    6),
    ('E1',  'Thực tập',                                  7),
    ('E2',  'Đồ án/Khóa luận tốt nghiệp',               8),
    ('F1',  'Giáo dục quốc phòng - an ninh',            9),
    ('F2.1','Giáo dục thể chất (nhóm 1)',               10),
    ('F2.2','Giáo dục thể chất (nhóm 2)',               11),
    ('F2.3','Giáo dục thể chất (nhóm 3)',               12),
    ('F3',  'Khối kiến thức điều kiện',                 13)
) AS v(code, name, ord)
WHERE p.code = 'CNTTVJ'
ON CONFLICT (program_id, code) DO UPDATE
    SET name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order;

-- =============================================================================
-- Gán môn vào đúng nhóm theo mã học phần
-- =============================================================================

-- A1: Giáo dục đại cương
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'A1' AND s.program_id = p.id
  AND s.code IN ('FFS702005','FFS703010','FFS703007','FFS702004','CSE702116',
                 'FFS702003','CSE703024','FFS703002','FFS703013','FFS702001',
                 'FEL703001','FFS703008','FFS702006');

-- B1: Cơ sở ngành
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'B1' AND s.program_id = p.id
  AND s.code IN ('CSE703118','CSE703006','CSE703124','CSE703064','CSE703122',
                 'CSE703123','CSE703004','CSE702011','CSE702017','CSE702040',
                 'CSE703125','CSE702128','CSE703023','CSE703038','CSE703008',
                 'CSE703119','EEE703044','CSE703120','CSE702025','CSE703121',
                 'CSE703029','CSE702036','EEE703068');

-- C1: Bổ trợ bắt buộc
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'C1' AND s.program_id = p.id
  AND s.code IN ('CSE702129','FBE702001');

-- C2: Bổ trợ tự chọn
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'C2' AND s.program_id = p.id
  AND s.code IN ('FTS702001','FTS702004','FTS702003','FTS702002');

-- D1: Chuyên ngành bắt buộc
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'D1' AND s.program_id = p.id
  AND s.code IN ('CSE703048','CSE702027','CSE702051','CSE703010');

-- D2: Chuyên ngành tự chọn
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'D2' AND s.program_id = p.id
  AND s.code IN ('CSE702022','CSE703065','CSE702060','CSE702049','CSE703054',
                 'CSE703016','CSE703037','CSE703015','CSE703032','CSE702033',
                 'CSE703018','CSE703132','CSE703130','CSE702043','CSE703007',
                 'CSE702031','CSE703009','CSE702046','CSE702063','CSE702005');

-- E1: Thực tập
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'E1' AND s.program_id = p.id
  AND s.code IN ('CSE702053','CSE704067','CSE703014','CSE702131');

-- E2: Đồ án tốt nghiệp
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'E2' AND s.program_id = p.id
  AND s.code IN ('CSE710068');

-- F1: Quốc phòng - an ninh
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F1' AND s.program_id = p.id
  AND s.code IN ('FFS708066');

-- F2.1: Thể chất nhóm 1 (Chạy)
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F2.1' AND s.program_id = p.id
  AND s.code IN ('FFS701072');

-- F2.2: Thể chất nhóm 2 (Aerobic, Bóng chuyền)
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F2.2' AND s.program_id = p.id
  AND s.code IN ('FFS701073','FFS701068');

-- F2.3: Thể chất nhóm 3 (Bóng đá, Cầu lông, Bóng rổ)
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F2.3' AND s.program_id = p.id
  AND s.code IN ('FFS701069','FFS701070','FFS701067');

-- F3: Điều kiện (Tiếng Anh bổ trợ)
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F3' AND s.program_id = p.id
  AND s.code IN ('FEL704000');
