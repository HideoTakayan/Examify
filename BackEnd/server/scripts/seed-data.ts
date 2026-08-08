import bcrypt from "bcrypt";
import pool from "../src/config/db";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_strong_secret";

interface SeedUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: "student" | "teacher" | "admin";
  password: string;
}

interface SeedClass {
  id: string;
  subject_id: string;
  teacher_id: string;
  semester: string;
  year: number;
}

interface SeedExam {
  id: string;
  title: string;
  class_id: string;
  duration_min: number;
  closes_at: string;
  created_by: string;
}

interface SeedQuestion {
  id: string;
  exam_id: string;
  question_type: "mcq" | "essay";
  content: string;
  options?: string[];
  correct_answer?: string | string[];
  points: number;
  display_order: number;
}

function uid(): string {
  return crypto.randomUUID();
}

function makeToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}

async function main() {
  console.log("=== SEED DATA START ===\n");

  // 1. Create accounts
  console.log("1. Creating accounts...");
  const hash = await bcrypt.hash("Test@123", BCRYPT_ROUNDS);

  const students: SeedUser[] = [
    { id: uid(), email: "sv01@system.local", username: "sv01", full_name: "Nguyễn Văn An", role: "student", password: hash },
    { id: uid(), email: "sv02@system.local", username: "sv02", full_name: "Trần Thị Bình", role: "student", password: hash },
    { id: uid(), email: "sv03@system.local", username: "sv03", full_name: "Lê Hoàng Cường", role: "student", password: hash },
    { id: uid(), email: "sv04@system.local", username: "sv04", full_name: "Phạm Thu Diệp", role: "student", password: hash },
    { id: uid(), email: "sv05@system.local", username: "sv05", full_name: "Hoàng Văn Em", role: "student", password: hash },
    { id: uid(), email: "sv06@system.local", username: "sv06", full_name: "Ngô Thị Phượng", role: "student", password: hash },
    { id: uid(), email: "sv07@system.local", username: "sv07", full_name: "Đặng Minh Giang", role: "student", password: hash },
    { id: uid(), email: "sv08@system.local", username: "sv08", full_name: "Vũ Hoàng Hà", role: "student", password: hash },
    { id: uid(), email: "sv09@system.local", username: "sv09", full_name: "Bùi Thị Linh", role: "student", password: hash },
    { id: uid(), email: "sv10@system.local", username: "sv10", full_name: "Đỗ Văn Minh", role: "student", password: hash },
    { id: uid(), email: "sv11@system.local", username: "sv11", full_name: "Lý Thị Ngọc", role: "student", password: hash },
    { id: uid(), email: "sv12@system.local", username: "sv12", full_name: "Phan Văn Quang", role: "student", password: hash },
  ];

  const teachers: SeedUser[] = [
    { id: uid(), email: "gv01@system.local", username: "gv01", full_name: "TS. Hoàng Đức Anh", role: "teacher", password: hash },
    { id: uid(), email: "gv02@system.local", username: "gv02", full_name: "ThS. Trần Thu Hà", role: "teacher", password: hash },
    { id: uid(), email: "gv03@system.local", username: "gv03", full_name: "PGS.TS. Lê Minh Tuấn", role: "teacher", password: hash },
  ];

  const adminUser: SeedUser = {
    id: uid(),
    email: "admin01@system.local",
    username: "admin01",
    full_name: "Quản trị viên 01",
    role: "admin",
    password: hash,
  };

  const allUsers = [adminUser, ...teachers, ...students];

  for (const u of allUsers) {
    await pool.query(
      `INSERT INTO accounts (id, email, username, hashed_password, role, full_name, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT (email) DO UPDATE SET hashed_password=$4, full_name=$6, username=$3`,
      [u.id, u.email, u.username, u.password, u.role, u.full_name]
    );
  }
  console.log(`   Created ${allUsers.length} accounts (admin + 3 teachers + 12 students)`);

  // Re-query real IDs for students (ON CONFLICT updates don't use our UUIDs)
  const studentResult = await pool.query("SELECT id, email FROM accounts WHERE role = 'student' ORDER BY created_at");
  const realStudentIds: Record<number, string> = {};
  studentResult.rows.forEach((r, i) => { realStudentIds[i] = r.id; });

  // Re-query admin real ID too
  const adminResult = await pool.query("SELECT id FROM accounts WHERE role = 'admin' LIMIT 1");
  const realAdminId = adminResult.rows[0]?.id || adminUser.id;

  // 2. Create subjects
  console.log("\n2. Creating subjects...");
  const subjectNames = [
    "Toán rời rạc", "Giải tích 1", "Giải tích 2", "Xác suất thống kê",
    "Lập trình Python", "Cấu trúc dữ liệu", "Thuật toán", "Mạng máy tính",
    "Cơ sở dữ liệu", "Hệ điều hành", "Trí tuệ nhân tạo", "Học máy",
  ];
  for (const name of subjectNames) {
    await pool.query(
      `INSERT INTO subjects (id, name) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET name=$2`,
      [uid(), name]
    );
  }
  console.log(`   Created ${subjectNames.length} subjects`);

  // 2b. Get or create classes
  console.log("\n2b. Creating classes...");
  const classMap: Record<string, string> = {};

  const subjectResult = await pool.query("SELECT id, name FROM subjects");
  const subjectIds: Record<string, string> = {};
  for (const row of subjectResult.rows) subjectIds[row.name] = row.id;

  // Get existing teacher accounts and use their REAL IDs (not seed-generated UUIDs)
  const teacherResult = await pool.query("SELECT id, email, full_name FROM accounts WHERE role = 'teacher' ORDER BY created_at");
  const teacherIds = teacherResult.rows;
  console.log(`   Found ${teacherIds.length} existing teacher accounts in DB`);

  // Also store real teacher IDs for use in exam creation
  const realTeacherIds: string[] = teacherIds.map(t => t.id);

  const classData = [
    { subject: "Toán rời rạc", teacherEmail: teacherIds[0]?.email, semester: "Spring", year: 2026 },
    { subject: "Xác suất thống kê", teacherEmail: teacherIds[1]?.email, semester: "Spring", year: 2026 },
    { subject: "Lập trình Python", teacherEmail: teacherIds[2]?.email, semester: "Spring", year: 2026 },
    { subject: "Mạng máy tính", teacherEmail: teacherIds[0]?.email, semester: "Spring", year: 2026 },
  ];

  for (const c of classData) {
    if (!subjectIds[c.subject] || !c.teacherEmail) continue;
    const teacherRow = teacherResult.rows.find(r => r.email === c.teacherEmail);
    if (!teacherRow) continue;
    const classId = uid();
    classMap[c.subject] = classId;
    await pool.query(
      `INSERT INTO classes (id, subject_id, teacher_id, semester, year)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [classId, subjectIds[c.subject], teacherRow.id, c.semester, c.year]
    );
  }
  console.log(`   ${Object.keys(classMap).length} classes ready`);

  // 3. Create exams
  console.log("\n3. Creating exams...");
  const exams: SeedExam[] = [
    {
      id: uid(),
      title: "Giải tích 1 - Đề thi giữa kỳ",
      class_id: classMap["Toán rời rạc"] || "",
      duration_min: 60,
      closes_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_by: realTeacherIds[0] || "",
    },
    {
      id: uid(),
      title: "Cấu trúc dữ liệu - Thi cuối kỳ",
      class_id: classMap["Toán rời rạc"] || "",
      duration_min: 90,
      closes_at: new Date(Date.now() + 3 * 86400000).toISOString(),
      created_by: realTeacherIds[0] || "",
    },
    {
      id: uid(),
      title: "Xác suất thống kê - Đề thi số 2",
      class_id: classMap["Xác suất thống kê"] || "",
      duration_min: 75,
      closes_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      created_by: realTeacherIds[1] || "",
    },
    {
      id: uid(),
      title: "Lập trình Python - Bài thực hành 3",
      class_id: classMap["Lập trình Python"] || "",
      duration_min: 120,
      closes_at: new Date(Date.now() + 5 * 86400000).toISOString(),
      created_by: realTeacherIds[2] || "",
    },
    {
      id: uid(),
      title: "Mạng máy tính - Thi cuối kỳ",
      class_id: classMap["Mạng máy tính"] || "",
      duration_min: 90,
      closes_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      created_by: realTeacherIds[0] || "",
    },
    {
      id: uid(),
      title: "Toán rời rạc - Kiểm tra 45 phút",
      class_id: classMap["Toán rời rạc"] || "",
      duration_min: 45,
      closes_at: new Date(Date.now() + 10 * 86400000).toISOString(),
      created_by: realTeacherIds[1] || "",
    },
  ];

  for (const e of exams) {
    await pool.query(
      `INSERT INTO exams (id, title, class_id, duration_min, closes_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET title=$2, duration_min=$4`,
      [e.id, e.title, e.class_id, e.duration_min, e.closes_at, e.created_by]
    );
  }
  console.log(`   Created ${exams.length} exams`);

  // 4. Create questions
  console.log("\n4. Creating questions...");
  const questions: SeedQuestion[] = [
    // Exam 0: Giải tích 1
    { id: uid(), exam_id: exams[0].id, question_type: "mcq", content: "Giới hạn lim(x→0) sin(x)/x = ?", options: ["0", "1", "2", "∞"], correct_answer: "1", points: 10, display_order: 1 },
    { id: uid(), exam_id: exams[0].id, question_type: "mcq", content: "Đạo hàm của f(x)=x³+2x là?", options: ["3x²+2", "3x²", "2x³+2", "x²+2"], correct_answer: "0", points: 10, display_order: 2 },
    { id: uid(), exam_id: exams[0].id, question_type: "essay", content: "Chứng minh lim(x→0) (e^x - 1)/x = 1 bằng định nghĩa.", points: 20, display_order: 3 },
    // Exam 1: Cấu trúc dữ liệu
    { id: uid(), exam_id: exams[1].id, question_type: "mcq", content: "Độ phức tạp của binary search là?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], correct_answer: "1", points: 10, display_order: 1 },
    { id: uid(), exam_id: exams[1].id, question_type: "mcq", content: "Stack hoạt động theo nguyên tắc nào?", options: ["FIFO", "LIFO", "Random", "Priority"], correct_answer: "1", points: 10, display_order: 2 },
    { id: uid(), exam_id: exams[1].id, question_type: "mcq", content: "Cây AVL là cây gì?", options: ["Cây nhị phân tìm kiếm cân bằng", "Cây đỏ đen", "Cây B", "Cây Catalan"], correct_answer: "0", points: 10, display_order: 3 },
    { id: uid(), exam_id: exams[1].id, question_type: "essay", content: "Trình bày thuật toán QuickSort và phân tích độ phức tạp trung bình.", points: 20, display_order: 4 },
    // Exam 2: Xác suất thống kê
    { id: uid(), exam_id: exams[2].id, question_type: "mcq", content: "Xác suất để 2 sự kiện độc lập cùng xảy ra là?", options: ["P(A)+P(B)", "P(A)×P(B)", "P(A)/P(B)", "max(P(A),P(B))"], correct_answer: "1", points: 10, display_order: 1 },
    { id: uid(), exam_id: exams[2].id, question_type: "mcq", content: "Kỳ vọng E(X+Y) = ?", options: ["E(X)+E(Y)", "E(X)×E(Y)", "E(X)-E(Y)", "E(X)/E(Y)"], correct_answer: "0", points: 10, display_order: 2 },
    { id: uid(), exam_id: exams[2].id, question_type: "essay", content: "Một lớp có 30 sinhên, 20 nữ. Chọn ngẫu nhiên 5 em. Tính xác suất chọn được 3 nữ.", points: 20, display_order: 3 },
    // Exam 3: Lập trình Python
    { id: uid(), exam_id: exams[3].id, question_type: "mcq", content: "Kết quả của print(type([])) là?", options: ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"], correct_answer: "0", points: 10, display_order: 1 },
    { id: uid(), exam_id: exams[3].id, question_type: "mcq", content: "Python dùng indentation thay cho dấu?", options: ["{}", "()", "[]", "Không cần gì"], correct_answer: "3", points: 10, display_order: 2 },
    { id: uid(), exam_id: exams[3].id, question_type: "essay", content: "Viết function đệ quy tính Fibonacci. Phân tích độ phức tạp và đề xuất cải tiến.", points: 30, display_order: 3 },
    // Exam 4: Mạng máy tính
    { id: uid(), exam_id: exams[4].id, question_type: "mcq", content: "Layer nào của OSI model xử lý địa chỉ IP?", options: ["Physical", "Data Link", "Network", "Transport"], correct_answer: "2", points: 10, display_order: 1 },
    { id: uid(), exam_id: exams[4].id, question_type: "mcq", content: "Port mặc định của HTTP là?", options: ["21", "80", "443", "3306"], correct_answer: "1", points: 10, display_order: 2 },
    { id: uid(), exam_id: exams[4].id, question_type: "essay", content: "Giải thích quá trình bắt tay 3 bước (3-way handshake) của TCP.", points: 20, display_order: 3 },
    // Exam 5: Toán rời rạc
    { id: uid(), exam_id: exams[5].id, question_type: "mcq", content: "Logic mệnh đề: (P ∧ Q) ∨ ¬R tương đương với?", options: ["(P ∨ Q) ∧ ¬R", "P ∧ (Q ∨ ¬R)", "(P ∧ Q) ∨ ¬R", "P ∨ (Q ∧ ¬R)"], correct_answer: "2", points: 10, display_order: 1 },
    { id: uid(), exam_id: exams[5].id, question_type: "mcq", content: "Số phần tử của tập hợp lũy thừa của tập n phần tử là?", options: ["n", "2n", "n²", "2ⁿ"], correct_answer: "3", points: 10, display_order: 2 },
    { id: uid(), exam_id: exams[5].id, question_type: "essay", content: "Chứng minh bằng phản chứng: Nếu n² là số chẵn thì n là số chẵn.", points: 20, display_order: 3 },
  ];

  for (const q of questions) {
    await pool.query(
      `INSERT INTO questions (id, exam_id, question_type, content, options, correct_answer, points, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET content=$4, options=$5, correct_answer=$6, points=$7`,
      [
        q.id, q.exam_id, q.question_type, q.content,
        q.options ? JSON.stringify(q.options) : null,
        q.correct_answer ? JSON.stringify(q.correct_answer) : null,
        q.points, q.display_order,
      ]
    );
  }
  console.log(`   Created ${questions.length} questions`);

  // 5. Create exam sessions
  console.log("\n5. Creating exam sessions...");
  let sessionCount = 0;

  // Helper to build graded_details JSON
  function buildGradedDetails(qs: SeedQuestion[], studentId: string, baseScore: number) {
    return qs.map((q, i) => {
      if (q.question_type === "mcq") {
        const correct = String(q.correct_answer);
        const studentAnswer = (i % 2 === 0) ? correct : (q.options ? String(q.options[(i + 1) % q.options.length]) : correct);
        return {
          question_id: q.id,
          question_type: q.question_type,
          submitted: studentAnswer,
          is_correct: studentAnswer === correct,
          points_earned: studentAnswer === correct ? q.points : 0,
          max_points: q.points,
          pending_grading: false,
        };
      } else {
        const essayScore = Math.min(q.points, Math.max(0, baseScore - i * 3));
        return {
          question_id: q.id,
          question_type: q.question_type,
          submitted: `Bài làm mẫu của sinh viên ${studentId}. Trình bày đúng ý chính.`,
          is_correct: false,
          points_earned: essayScore,
          max_points: q.points,
          pending_grading: essayScore === 0,
        };
      }
    });
  }

  // Student 0 → exam 0: submitted (score ~70%)
  {
    const qs = questions.filter(q => q.exam_id === exams[0].id);
    const details = buildGradedDetails(qs, String(realStudentIds[0]), 7);
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'complete')`,
      [uid(), exams[0].id, realStudentIds[0],
       new Date(Date.now() - 5 * 86400000).toISOString(),
       new Date(Date.now() - 5 * 86400000 + 55 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Student 1 → exam 0: submitted (pending essay grading)
  {
    const qs = questions.filter(q => q.exam_id === exams[0].id);
    const details = qs.map((q, i) => ({
      question_id: q.id, question_type: q.question_type,
      submitted: q.question_type === "mcq" ? String(q.correct_answer) : "Bài làm còn thiếu sót",
      is_correct: q.question_type === "mcq",
      points_earned: q.question_type === "mcq" ? q.points : 8,
      max_points: q.points,
      pending_grading: q.question_type === "essay",
    }));
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'pending_manual')`,
      [uid(), exams[0].id, realStudentIds[1],
       new Date(Date.now() - 4 * 86400000).toISOString(),
       new Date(Date.now() - 4 * 86400000 + 58 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Student 2 → exam 1: submitted (high score)
  {
    const qs = questions.filter(q => q.exam_id === exams[1].id);
    const details = buildGradedDetails(qs, String(realStudentIds[2]), 9);
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'complete')`,
      [uid(), exams[1].id, realStudentIds[2],
       new Date(Date.now() - 8 * 86400000).toISOString(),
       new Date(Date.now() - 8 * 86400000 + 85 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Student 3 → exam 1: submitted (low score)
  {
    const qs = questions.filter(q => q.exam_id === exams[1].id);
    const details = buildGradedDetails(qs, String(realStudentIds[3]), 4);
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'complete')`,
      [uid(), exams[1].id, realStudentIds[3],
       new Date(Date.now() - 7 * 86400000).toISOString(),
       new Date(Date.now() - 7 * 86400000 + 70 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Student 4 → exam 2: submitted (pass ~60%)
  {
    const qs = questions.filter(q => q.exam_id === exams[2].id);
    const details = buildGradedDetails(qs, String(realStudentIds[4]), 6);
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'complete')`,
      [uid(), exams[2].id, realStudentIds[4],
       new Date(Date.now() - 6 * 86400000).toISOString(),
       new Date(Date.now() - 6 * 86400000 + 65 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Student 5 → exam 2: pending_manual
  {
    const qs = questions.filter(q => q.exam_id === exams[2].id);
    const details = qs.map((q, i) => ({
      question_id: q.id, question_type: q.question_type,
      submitted: q.question_type === "mcq" ? String(q.correct_answer) : "Cần bổ sung chứng minh",
      is_correct: q.question_type === "mcq",
      points_earned: q.question_type === "mcq" ? q.points : 0,
      max_points: q.points,
      pending_grading: q.question_type === "essay",
    }));
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'pending_manual')`,
      [uid(), exams[2].id, realStudentIds[5],
       new Date(Date.now() - 5 * 86400000).toISOString(),
       new Date(Date.now() - 5 * 86400000 + 72 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Student 6 → exam 3: submitted
  {
    const qs = questions.filter(q => q.exam_id === exams[3].id);
    const details = buildGradedDetails(qs, String(realStudentIds[6]), 7);
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'complete')`,
      [uid(), exams[3].id, realStudentIds[6],
       new Date(Date.now() - 3 * 86400000).toISOString(),
       new Date(Date.now() - 3 * 86400000 + 110 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Student 7 → exam 4: submitted (good score)
  {
    const qs = questions.filter(q => q.exam_id === exams[4].id);
    const details = buildGradedDetails(qs, String(realStudentIds[7]), 8);
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'complete')`,
      [uid(), exams[4].id, realStudentIds[7],
       new Date(Date.now() - 10 * 86400000).toISOString(),
       new Date(Date.now() - 10 * 86400000 + 80 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Student 8 → exam 4: expired (didn't submit in time)
  {
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'expired',$4,null,null,null,'[]','complete')`,
      [uid(), exams[4].id, realStudentIds[8],
       new Date(Date.now() - 14 * 86400000).toISOString()]
    );
    sessionCount++;
  }

  // More sessions for exam 1 (variety)
  for (let i = 9; i < 12; i++) {
    const qs = questions.filter(q => q.exam_id === exams[1].id);
    const details = buildGradedDetails(qs, String(realStudentIds[i]), 5 + (i % 4));
    const score = details.reduce((s, d) => s + (d.points_earned || 0), 0);
    const maxPoints = details.reduce((s, d) => s + d.max_points, 0);
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,'complete')`,
      [uid(), exams[1].id, realStudentIds[i],
       new Date(Date.now() - (6 + i) * 86400000).toISOString(),
       new Date(Date.now() - (6 + i) * 86400000 + 75 * 60000).toISOString(),
       score, maxPoints, JSON.stringify(details)]
    );
    sessionCount++;
  }

  // Active sessions (in progress)
  for (let i = 0; i < 3; i++) {
    await pool.query(
      `INSERT INTO exam_sessions (id, exam_id, student_id, status, started_at, submitted_at, score, max_points, graded_details, grading_status)
       VALUES ($1,$2,$3,'active',$4,null,null,null,'[]','pending_manual')`,
      [uid(), exams[3].id, realStudentIds[i], new Date(Date.now() - 20 * 60000).toISOString()]
    );
    sessionCount++;
  }

  console.log(`   Created ${sessionCount} exam sessions`);

  // 6. Integrity events
  console.log("\n6. Creating integrity events...");
  const eventTypes = ["fullscreen_exit", "visibility_hidden", "window_blur", "copy_attempt", "paste_attempt"];
  const sessionsResult = await pool.query(
    `SELECT es.id, es.student_id, es.exam_id, es.started_at FROM exam_sessions es WHERE es.status = 'submitted' LIMIT 5`
  );
  let eventCount = 0;
  for (const row of sessionsResult.rows) {
    const numEvents = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < numEvents; j++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const ts = new Date(new Date(row.started_at).getTime() + (j + 1) * 10 * 60000).toISOString();
      await pool.query(
        `INSERT INTO exam_integrity_events (id, exam_id, session_id, student_id, event_type, event_at, details)
         VALUES ($1,$2,$3,$4,$5,$6,null)`,
        [uid(), row.exam_id, row.id, row.student_id, eventType, ts]
      );
      eventCount++;
    }
  }
  console.log(`   Created ${eventCount} integrity events`);

  // 7. Audit logs
  console.log("\n7. Creating audit logs...");
  const adminToken = makeToken(realAdminId, "admin");
  const adminHash = createHash("sha256").update(adminToken).digest("hex");
  const studentToken = makeToken(realStudentIds[0], "student");
  const studentHash = createHash("sha256").update(studentToken).digest("hex");

  const auditActions = [
    { actorId: realAdminId, actorRole: "admin", action: "login", details: { ip_address: "192.168.1.100" } },
    { actorId: realStudentIds[0], actorRole: "student", action: "login", details: { ip_address: "192.168.1.101" } },
    { actorId: realStudentIds[1], actorRole: "student", action: "login", details: { ip_address: "192.168.1.102" } },
    { actorId: realAdminId, actorRole: "admin", action: "create_account", details: { role: "student", email: "sv04@system.local" } },
    { actorId: realAdminId, actorRole: "admin", action: "grade_session", details: { score: 35 } },
    { actorId: realTeacherIds[0], actorRole: "teacher", action: "grade_session", details: { score: 28 } },
    { actorId: realAdminId, actorRole: "admin", action: "force_submit_exam", details: { forced_count: 3 } },
    { actorId: realStudentIds[2], actorRole: "student", action: "submit_exam", details: { score: 82 } },
    { actorId: realTeacherIds[1], actorRole: "teacher", action: "create_exam", details: { title: exams[2].title } },
    { actorId: realAdminId, actorRole: "admin", action: "password_reset_approve", details: { user_id: realStudentIds[4] } },
  ];

  for (const audit of auditActions) {
    await pool.query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, details, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        uid(), audit.actorId, audit.actorRole, audit.action,
        JSON.stringify(audit.details), audit.details.ip_address
      ]
    );
  }
  console.log(`   Created ${auditActions.length} audit logs`);

  // 8. User sessions (so the tokens work)
  console.log("\n8. Creating user sessions...");
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const deviceId = "seed-device-" + uid().slice(0, 8);
  await pool.query(
    `INSERT INTO user_sessions (id, user_id, device_id, device_info, token_hash, is_active, expires_at)
     VALUES ($1,$2,$3,null,$4,true,$5)`,
    [uid(), realAdminId, deviceId, adminHash, expiresAt]
  );
  const deviceId2 = "seed-device-" + uid().slice(0, 8);
  await pool.query(
    `INSERT INTO user_sessions (id, user_id, device_id, device_info, token_hash, is_active, expires_at)
     VALUES ($1,$2,$3,null,$4,true,$5)`,
    [uid(), realStudentIds[0], deviceId2, studentHash, expiresAt]
  );
  console.log("   Created sessions for admin and student tokens");

  console.log("\n=== SEED DATA DONE ===");
  console.log(`   ${allUsers.length} accounts`);
  console.log(`   ${exams.length} exams`);
  console.log(`   ${questions.length} questions`);
  console.log(`   ${sessionCount} exam sessions`);
  console.log(`   ${eventCount} integrity events`);
  console.log(`   ${auditActions.length} audit logs`);
  console.log("\nLogin credentials (all same password: Test@123):");
  console.log(`   Admin:   admin01@system.local`);
  console.log(`   Teacher: gv01@system.local`);
  console.log(`   Student: sv01@system.local`);
  await pool.end();
}

main().catch((e) => {
  console.error("SEED ERROR:", e);
  pool.end();
  process.exit(1);
});