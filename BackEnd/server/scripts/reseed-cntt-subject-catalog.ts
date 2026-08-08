import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://admin:admin@localhost:5432/Examify",
});

interface GroupSeed {
  code: string;
  name: string;
  sort_order: number;
}

interface SubjectSeed {
  name: string;
  code: string;
  groupCode: string;
  category: string;
  credits: number;
}

const GROUPS: GroupSeed[] = [
  { code: 'A1',   name: 'Khối kiến thức giáo dục đại cương',       sort_order: 1 },
  { code: 'B1',   name: 'Khối kiến thức cơ sở ngành',               sort_order: 2 },
  { code: 'C1',   name: 'Khối kiến thức bổ trợ (bắt buộc)',         sort_order: 3 },
  { code: 'C2',   name: 'Khối kiến thức bổ trợ (tự chọn)',          sort_order: 4 },
  { code: 'D1',   name: 'Khối kiến thức chuyên ngành (bắt buộc)',   sort_order: 5 },
  { code: 'D2',   name: 'Khối kiến thức chuyên ngành (tự chọn)',    sort_order: 6 },
  { code: 'E1',   name: 'Thực tập',                                  sort_order: 7 },
  { code: 'E2',   name: 'Đồ án/Khóa luận tốt nghiệp',               sort_order: 8 },
  { code: 'F1',   name: 'Giáo dục quốc phòng - an ninh',            sort_order: 9 },
  { code: 'F2.1', name: 'Giáo dục thể chất (nhóm 1)',               sort_order: 10 },
  { code: 'F2.2', name: 'Giáo dục thể chất (nhóm 2)',               sort_order: 11 },
  { code: 'F2.3', name: 'Giáo dục thể chất (nhóm 3)',               sort_order: 12 },
  { code: 'F3',   name: 'Khối kiến thức điều kiện',                 sort_order: 13 },
];

/** Danh mục môn học theo chương trình Phenikaa Uni – Ngành CNTTVJ */
const SUBJECTS: SubjectSeed[] = [
  // A1: Khối kiến thức giáo dục đại cương
  { code: "FFS702005", name: "Lịch sử Đảng cộng sản Việt Nam", credits: 2, groupCode: "A1", category: "general" },
  { code: "FFS703010", name: "Lý thuyết xác suất thống kê", credits: 3, groupCode: "A1", category: "general" },
  { code: "FFS703007", name: "Đại số tuyến tính", credits: 3, groupCode: "A1", category: "general" },
  { code: "FFS702004", name: "Chủ nghĩa xã hội khoa học", credits: 2, groupCode: "A1", category: "general" },
  { code: "CSE702116", name: "Khoa học dữ liệu và trí tuệ nhân tạo", credits: 2, groupCode: "A1", category: "general" },
  { code: "FFS702003", name: "Kinh tế chính trị Mác - Lênin", credits: 2, groupCode: "A1", category: "general" },
  { code: "CSE703024", name: "Toán rời rạc", credits: 3, groupCode: "A1", category: "general" },
  { code: "FFS703002", name: "Triết học Mác - Lê nin", credits: 3, groupCode: "A1", category: "general" },
  { code: "FFS703013", name: "Vật lý 1", credits: 3, groupCode: "A1", category: "general" },
  { code: "FFS702001", name: "Pháp luật đại cương", credits: 2, groupCode: "A1", category: "general" },
  { code: "FEL703001", name: "Tiếng Anh 1", credits: 3, groupCode: "A1", category: "general" },
  { code: "FFS703008", name: "Giải tích", credits: 3, groupCode: "A1", category: "general" },
  { code: "FFS702006", name: "Tư tưởng Hồ Chí Minh", credits: 2, groupCode: "A1", category: "general" },

  // B1: Khối kiến thức cơ sở ngành
  { code: "CSE703118", name: "Tiếng Nhật IT 1", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703006", name: "Cấu trúc dữ liệu và thuật toán", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703124", name: "Tiếng Nhật IT 7", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703064", name: "Xây dựng ứng dụng web", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703122", name: "Tiếng Nhật IT 5", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703123", name: "Tiếng Nhật IT 6", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703004", name: "An toàn và bảo mật thông tin", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE702011", name: "Điện toán đám mây", credits: 2, groupCode: "B1", category: "foundation" },
  { code: "CSE702017", name: "Hệ điều hành", credits: 2, groupCode: "B1", category: "foundation" },
  { code: "CSE702040", name: "Nhập môn Công nghệ thông tin", credits: 2, groupCode: "B1", category: "foundation" },
  { code: "CSE703125", name: "Tiếng Nhật IT 8", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE702128", name: "Tiếng Nhật chuyên ngành IT1", credits: 2, groupCode: "B1", category: "foundation" },
  { code: "CSE703023", name: "Kiến trúc máy tính", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703038", name: "Ngôn ngữ lập trình C", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703008", name: "Cơ sở dữ liệu", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703119", name: "Tiếng Nhật IT 2", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "EEE703044", name: "Kỹ thuật số", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703120", name: "Tiếng Nhật IT 3", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE702025", name: "Kỹ thuật phần mềm", credits: 2, groupCode: "B1", category: "foundation" },
  { code: "CSE703121", name: "Tiếng Nhật IT 4", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE703029", name: "Lập trình hướng đối tượng", credits: 3, groupCode: "B1", category: "foundation" },
  { code: "CSE702036", name: "Mạng máy tính", credits: 2, groupCode: "B1", category: "foundation" },
  { code: "EEE703068", name: "Thị giác máy tính", credits: 3, groupCode: "B1", category: "foundation" },

  // C1: Khối kiến thức bổ trợ
  { code: "CSE702129", name: "Tiếng Nhật chuyên ngành IT2", credits: 2, groupCode: "C1", category: "skills" },
  { code: "FBE702001", name: "Quản trị học", credits: 2, groupCode: "C1", category: "skills" },

  // C2: Bổ trợ tự chọn
  { code: "FTS702001", name: "Kỹ năng khởi nghiệp và lãnh đạo", credits: 2, groupCode: "C2", category: "skills" },
  { code: "FTS702004", name: "Kỹ năng tư duy sáng tạo và phản biện", credits: 2, groupCode: "C2", category: "skills" },
  { code: "FTS702003", name: "Kỹ năng đàm phán, thương lượng", credits: 2, groupCode: "C2", category: "skills" },
  { code: "FTS702002", name: "Kỹ năng quản lý dự án", credits: 2, groupCode: "C2", category: "skills" },

  // D1: Khối kiến thức chuyên ngành
  { code: "CSE703048", name: "Phân tích và thiết kế phần mềm", credits: 3, groupCode: "D1", category: "major" },
  { code: "CSE702027", name: "Lập trình cho thiết bị di động", credits: 2, groupCode: "D1", category: "major" },
  { code: "CSE702051", name: "Thiết kế web nâng cao", credits: 2, groupCode: "D1", category: "major" },
  { code: "CSE703010", name: "Đánh giá và kiểm định chất lượng phần mềm*", credits: 3, groupCode: "D1", category: "major" },

  // D2: Chuyên ngành tự chọn
  { code: "CSE702022", name: "Khai phá dữ liệu", credits: 2, groupCode: "D2", category: "major" },
  { code: "CSE703065", name: "Xử lý ngôn ngữ tự nhiên", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE702060", name: "Trực quan hoá dữ liệu", credits: 2, groupCode: "D2", category: "major" },
  { code: "CSE702049", name: "Quản trị dự án công nghệ thông tin", credits: 2, groupCode: "D2", category: "major" },
  { code: "CSE703054", name: "Tích hợp và phân tích dữ liệu lớn", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE703016", name: "Giao diện người máy", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE703037", name: "Mạng nơron và học sâu", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE703015", name: "Đồ hoạ máy tính và thực tế ảo", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE703032", name: "Lập trình song song", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE702033", name: "Lập trình trò chơi", credits: 2, groupCode: "D2", category: "major" },
  { code: "CSE703018", name: "Hệ nhúng", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE703132", name: "Lập trình C nâng cao", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE703130", name: "Công nghệ Java", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE702043", name: "Phân tích dữ liệu", credits: 2, groupCode: "D2", category: "major" },
  { code: "CSE703007", name: "Chương trình dịch", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE702031", name: "Lập trình phân tích dữ liệu với python", credits: 2, groupCode: "D2", category: "major" },
  { code: "CSE703009", name: "Công nghệ .Net", credits: 3, groupCode: "D2", category: "major" },
  { code: "CSE702046", name: "Phân tích nghiệp vụ kinh doanh", credits: 2, groupCode: "D2", category: "major" },
  { code: "CSE702063", name: "Ứng dụng phân tán*", credits: 2, groupCode: "D2", category: "major" },
  { code: "CSE702005", name: "Bảo mật ứng dụng và hệ thống", credits: 2, groupCode: "D2", category: "major" },

  // E1: Thực tập
  { code: "CSE702053", name: "Thực tập công nghiệp", credits: 2, groupCode: "E1", category: "major" },
  { code: "CSE704067", name: "Thực tập tốt nghiệp", credits: 4, groupCode: "E1", category: "major" },
  { code: "CSE703014", name: "Đồ án liên ngành", credits: 3, groupCode: "E1", category: "major" },
  { code: "CSE702131", name: "Đồ án cơ sở Công nghệ Thông tin", credits: 2, groupCode: "E1", category: "major" },

  // E2: Đồ án/Khóa luận tốt nghiệp
  { code: "CSE710068", name: "Đồ án tốt nghiệp", credits: 10, groupCode: "E2", category: "major" },

  // F1: Giáo dục quốc phòng - an ninh
  { code: "FFS708066", name: "Giáo dục quốc phòng - an ninh", credits: 8, groupCode: "F1", category: "general" },

  // F2.1: Giáo dục thể chất (Tích lũy 1TC)
  { code: "FFS701072", name: "Chạy 1", credits: 1, groupCode: "F2.1", category: "general" },

  // F2.2
  { code: "FFS701073", name: "Aerobic", credits: 1, groupCode: "F2.2", category: "general" },
  { code: "FFS701068", name: "Bóng chuyền", credits: 1, groupCode: "F2.2", category: "general" },

  // F2.3
  { code: "FFS701069", name: "Bóng đá", credits: 1, groupCode: "F2.3", category: "general" },
  { code: "FFS701070", name: "Cầu lông", credits: 1, groupCode: "F2.3", category: "general" },
  { code: "FFS701067", name: "Bóng rổ", credits: 1, groupCode: "F2.3", category: "general" },

  // F3: Khối kiến thức điều kiện
  { code: "FEL704000", name: "Tiếng Anh bổ trợ", credits: 4, groupCode: "F3", category: "general" },
];

async function clearCnttvjSubjects(programId: string) {
  // Check if safe to delete
  const usage = await pool.query(
    `SELECT count(*) as c FROM exams 
     WHERE subject_id IN (SELECT id FROM subjects WHERE program_id = $1)`,
    [programId]
  );
  if (parseInt(usage.rows[0].c, 10) > 0) {
    console.log(`[WARN] Tồn tại ${usage.rows[0].c} bài thi thuộc CNTTVJ. Không thể DROP toàn bộ môn học.`);
    return;
  }

  // Delete subjects safely
  await pool.query(`DELETE FROM subjects WHERE program_id = $1`, [programId]);
  await pool.query(`DELETE FROM subject_groups WHERE program_id = $1`, [programId]);
}

async function run() {
  console.log("=== RESEED CNTTVJ SUBJECT CATALOG ===\n");

  const prog = await pool.query<{ id: string }>(
    `SELECT id FROM programs WHERE code = 'CNTTVJ' LIMIT 1`
  );
  const programId = prog.rows[0]?.id;
  if (!programId) {
    console.error("Không tìm thấy chương trình CNTTVJ. Chạy migration programs trước.");
    process.exit(1);
  }

  // Khuyến cáo xóa tay nếu chưa vướng exams
  // await clearCnttvjSubjects(programId);

  console.log("1. Cập nhật Subject Groups (Khối môn A1-F3)...");
  const groupIdMap = new Map<string, string>();
  for (const g of GROUPS) {
    const res = await pool.query(
      `INSERT INTO subject_groups (program_id, code, name, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (program_id, code) DO UPDATE 
       SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [programId, g.code, g.name, g.sort_order]
    );
    groupIdMap.set(g.code, res.rows[0].id);
  }
  console.log(`   -> Đã seed ${GROUPS.length} nhóm môn.`);

  console.log("\n2. Cập nhật Subjects (79 môn học)...");
  let upsertCount = 0;
  for (const s of SUBJECTS) {
    const groupId = groupIdMap.get(s.groupCode);
    if (!groupId) {
      console.warn(`WARN: Nhóm ${s.groupCode} không tồn tại cho môn ${s.name}`);
      continue;
    }

    const existing = await pool.query(
      `SELECT id FROM subjects WHERE program_id = $1 AND name = $2`,
      [programId, s.name]
    );

    if ((existing.rowCount || 0) > 0) {
      await pool.query(
        `UPDATE subjects 
         SET code = $1, credits = $2, category = $3, sub_category = $4, subject_group_id = $5
         WHERE id = $6`,
        [s.code, s.credits, s.category, s.groupCode, groupId, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO subjects (program_id, code, name, credits, category, sub_category, subject_group_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [programId, s.code, s.name, s.credits, s.category, s.groupCode, groupId]
      );
    }
    upsertCount++;
  }
  console.log(`   -> Đã seed/cập nhật ${upsertCount} môn học.\n`);

  console.log("Hoàn tất!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Lỗi:", e);
  process.exit(1);
});
