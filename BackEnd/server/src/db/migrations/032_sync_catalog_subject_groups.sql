-- =============================================================================
-- 032: Đồng bộ nhóm môn DB (subject_groups) cho CNTTVJ
-- Áp dụng 13 khối A1–F3 theo chương trình Phenikaa — CNTTVJ
-- =============================================================================

-- Upsert 13 nhóm khối
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

-- Gán môn vào đúng nhóm theo mã học phần
UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'A1' AND s.program_id = p.id
  AND s.code IN ('FFS702005','FFS703010','FFS703007','FFS702004','CSE702116',
                 'FFS702003','CSE703024','FFS703002','FFS703013','FFS702001',
                 'FEL703001','FFS703008','FFS702006');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'B1' AND s.program_id = p.id
  AND s.code IN ('CSE703118','CSE703006','CSE703124','CSE703064','CSE703122',
                 'CSE703123','CSE703004','CSE702011','CSE702017','CSE702040',
                 'CSE703125','CSE702128','CSE703023','CSE703038','CSE703008',
                 'CSE703119','EEE703044','CSE703120','CSE702025','CSE703121',
                 'CSE703029','CSE702036','EEE703068');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'C1' AND s.program_id = p.id
  AND s.code IN ('CSE702129','FBE702001');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'C2' AND s.program_id = p.id
  AND s.code IN ('FTS702001','FTS702004','FTS702003','FTS702002');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'D1' AND s.program_id = p.id
  AND s.code IN ('CSE703048','CSE702027','CSE702051','CSE703010');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'D2' AND s.program_id = p.id
  AND s.code IN ('CSE702022','CSE703065','CSE702060','CSE702049','CSE703054',
                 'CSE703016','CSE703037','CSE703015','CSE703032','CSE702033',
                 'CSE703018','CSE703132','CSE703130','CSE702043','CSE703007',
                 'CSE702031','CSE703009','CSE702046','CSE702063','CSE702005');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'E1' AND s.program_id = p.id
  AND s.code IN ('CSE702053','CSE704067','CSE703014','CSE702131');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'E2' AND s.program_id = p.id AND s.code = 'CSE710068';

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F1' AND s.program_id = p.id AND s.code = 'FFS708066';

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F2.1' AND s.program_id = p.id AND s.code = 'FFS701072';

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F2.2' AND s.program_id = p.id
  AND s.code IN ('FFS701073','FFS701068');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F2.3' AND s.program_id = p.id
  AND s.code IN ('FFS701069','FFS701070','FFS701067');

UPDATE subjects s SET subject_group_id = sg.id
FROM subject_groups sg JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTTVJ'
WHERE sg.code = 'F3' AND s.program_id = p.id AND s.code = 'FEL704000';
