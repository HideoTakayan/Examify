import path from "node:path";
import fs from "node:fs";

export const MINIMAX_SYSTEM_PROMPT = `Bạn là AI dự đoán điểm học phần cho sinh viên CNTT.

## KNOWLEDGE BASE — Lớp DEMO CLASS
37 sinh viên, 52 môn học (2016-2020).

### Hệ số tương quan Pearson (r)
r càng gần 1 → điểm 2 môn càng liên quan chặt.
  r=+0.634 | Tiếng Anh P1 → Tiếng Anh P2
  r=+0.568 | Tiếng Anh P3 → Tiếng Anh P4
  r=+0.507 | Công nghệ dữ liệu → Dữ liệu lớn
  r=+0.464 | Học máy → Dữ liệu lớn
  r=+0.381 | Công nghệ phần mềm → Kiểm thử phần mềm
  r=+0.340 | Mạng máy tính → Lập trình IoT
  r=+0.235 | Tiếng Anh P2 → Tiếng Anh P3
  r=+0.233 | Tiếng Anh P4 → Tiếng Anh P5
  r=+0.161 | Mạng máy tính → Lập trình mạng

### Điểm trung bình từng môn (class average)
  Kỳ -1:
    Lý luận và phương pháp Giáo dục thể chất 1 (1 TC) | ĐTB=7.5
    Võ (Cơ bản) (1 TC) | ĐTB=7.6
    Yoga (Cơ bản) (1 TC) | ĐTB=7.5
    Zumba(Cơ bản) (1 TC) | ĐTB=8.9
    Zumba(Nâng cao) (1 TC) | ĐTB=9.3
    Đại số tuyến tính, tối ưu (2 TC) | ĐTB=6.7
    Nhập môn công nghệ thông tin (3 TC) | ĐTB=5.9
    Thực tập CNTT1: Hệ thống máy tính (4 TC) | ĐTB=7.0
    Triết học Mác - Lênin (3 TC) | ĐTB=6.8
    Kinh tế chính trị Mác - Lênin (2 TC) | ĐTB=6.9
    Xác suất thống kê và phân tích dữ liệu (4 TC) | ĐTB=7.1
    Hệ thống thông tin địa lý (2 TC) | ĐTB=6.7
    Thực tập CNTT2: Thiết kế web (4 TC) | ĐTB=7.0
    Cấu trúc dữ liệu và giải thuật (3 TC) | ĐTB=6.3
    Lập trình hướng đối tượng (3 TC) | ĐTB=7.3
    Thực tập CNTT3: Thiết kế, lập trình Front-End (4 TC) | ĐTB=6.6
    Giáo dục quốc phòng P1 (3 TC) | ĐTB=7.4
    Giáo dục quốc phòng P2 (2 TC) | ĐTB=7.6
    Giáo dục quốc phòng P3 (2 TC) | ĐTB=6.8
    Giáo dục quốc phòng P4 (4 TC) | ĐTB=7.2
    Lý thuyết, thiết kế cơ sở dữ liệu (3 TC) | ĐTB=6.6
    Chủ nghĩa xã hội khoa học (2 TC) | ĐTB=8.1
    Phân tích, thiết kế hệ thống thông tin (3 TC) | ĐTB=6.9
    Tư tưởng Hồ Chí Minh (2 TC) | ĐTB=8.3
    Thực tập CNTT5: Triển khai ứng dụng AI, IoT (4 TC) | ĐTB=8.3
    Lịch sử Đảng Cộng sản Việt Nam (2 TC) | ĐTB=8.7
    Thực tập CNTT6: Cài đặt, cấu hình máy chủ, mạng (4 TC) | ĐTB=6.9
    An toàn, bảo mật thông tin (2 TC) | ĐTB=7.5
    Ứng dụng Công nghệ thông tin trong doanh nghiệp (3 TC) | ĐTB=7.5

  Kỳ 0:
    Thực tập tốt nghiệp (4 TC) | ĐTB=9.1

  Kỳ 1:
    Pháp luật đại cương (3 TC) | ĐTB=7.0
    Kỹ năng mềm cơ bản (2 TC) | ĐTB=7.9
    Lập trình cơ bản (3 TC) | ĐTB=6.7 (programming)
    Tiếng Anh P1 (4 TC) | ĐTB=6.5 (english)
    Toán giải tích (3 TC) | ĐTB=6.1 (math)

  Kỳ 2:
    Tiếng Anh P2 (4 TC) | ĐTB=6.7 (english)
    Toán rời rạc (3 TC) | ĐTB=6.9 (math)

  Kỳ 3:
    Mạng máy tính (2 TC) | ĐTB=6.4 (network)

  Kỳ 4:
    Kỹ năng mềm nâng cao (3 TC) | ĐTB=8.4
    Tiếng Anh P3 (4 TC) | ĐTB=6.2 (english)
    Lập trình IoT (2 TC) | ĐTB=8.9 (programming)
    Trí tuệ nhân tạo (2 TC) | ĐTB=7.9 (ai_ml)

  Kỳ 5:
    Tiếng Anh P4 (3 TC) | ĐTB=6.8 (english)
    Học máy (2 TC) | ĐTB=8.1 (ai_ml)
    Công nghệ dữ liệu (2 TC) | ĐTB=8.0 (ai_ml)

  Kỳ 6:
    Công nghệ phần mềm (3 TC) | ĐTB=8.6 (software_eng)
    Lập trình mobile (3 TC) | ĐTB=7.3 (software_eng)
    Dữ liệu lớn (2 TC) | ĐTB=7.8 (ai_ml)

  Kỳ 7:
    Tiếng Anh P5 (2 TC) | ĐTB=7.0 (english)

  Kỳ 8:
    Chuyển đổi số (2 TC) | ĐTB=7.9
    Lập trình mạng (3 TC) | ĐTB=7.9 (network)
    Kiểm thử phần mềm (2 TC) | ĐTB=8.5 (software_eng)

### Chuỗi liên thông môn học (prerequisites)
  Tiếng Anh P1 → Tiếng Anh P2
  Tiếng Anh P2 → Tiếng Anh P3
  Lập trình HĐT + Mạng máy tính → Lập trình IoT
  Xác suất thống kê + CTDL & Giải thuật → Trí tuệ nhân tạo
  Tiếng Anh P3 → Tiếng Anh P4
  Xác suất thống kê + Đại số tuyến tính + Lập trình HĐT → Học máy
  Lập trình HĐT + PTTKHTT → Công nghệ phần mềm
  Lập trình HĐT + TT CNTT3 Front-End → Lập trình mobile
  Công nghệ dữ liệu + Học máy → Dữ liệu lớn
  Tiếng Anh P4 → Tiếng Anh P5
  Mạng máy tính + Lập trình HĐT → Lập trình mạng
  Công nghệ phần mềm → Kiểm thử phần mềm

### Thang điểm hệ 10
  A+ >= 9.0 | A: 8.0-8.9 | B: 7.0-7.9 | C: 6.0-6.9 | D+: 5.0-5.9 | F < 5.0`;

export interface KnowledgeBase {
  correlations: Array<{ from: string; to: string; r: number }>;
  subjectAverages: Array<{ subject: string; credits: number; semester: number; category: string; avg: number }>;
  subjectChains: Array<{ from: string[]; to: string }>;
}

function scoreToGrade(score: number): string {
  if (score >= 9) return "A+";
  if (score >= 8) return "A";
  if (score >= 7) return "B";
  if (score >= 6) return "C";
  if (score >= 5) return "D+";
  return "F";
}

export function computeSubjectAverages(students: Array<{ scores: Record<string, number> }>): KnowledgeBase["subjectAverages"] {
  const subjectTotals: Record<string, number> = {};
  const subjectCounts: Record<string, number> = {};

  for (const student of students) {
    for (const [sid, score] of Object.entries(student.scores)) {
      if (score <= 0) continue;
      subjectTotals[sid] = (subjectTotals[sid] ?? 0) + score;
      subjectCounts[sid] = (subjectCounts[sid] ?? 0) + 1;
    }
  }

  return Object.entries(subjectTotals).map(([sid, total]) => ({
    subject: sid,
    credits: 0,
    semester: 0,
    category: "unknown",
    avg: Math.round((total / subjectCounts[sid]) * 10) / 10,
  }));
}

export function loadKnowledgeBase(): KnowledgeBase {
  const rawPath = path.resolve(__dirname, "../../../../cntt1602_grades.json");
  const raw = fs.readFileSync(rawPath, "utf-8");
  const data = JSON.parse(raw);

  return {
    correlations: [
      { from: "Tiếng Anh P1", to: "Tiếng Anh P2", r: 0.634 },
      { from: "Tiếng Anh P3", to: "Tiếng Anh P4", r: 0.568 },
      { from: "Công nghệ dữ liệu", to: "Dữ liệu lớn", r: 0.507 },
      { from: "Học máy", to: "Dữ liệu lớn", r: 0.464 },
      { from: "Công nghệ phần mềm", to: "Kiểm thử phần mềm", r: 0.381 },
      { from: "Mạng máy tính", to: "Lập trình IoT", r: 0.340 },
      { from: "Tiếng Anh P2", to: "Tiếng Anh P3", r: 0.235 },
      { from: "Tiếng Anh P4", to: "Tiếng Anh P5", r: 0.233 },
      { from: "Mạng máy tính", to: "Lập trình mạng", r: 0.161 },
    ],
    subjectAverages: computeSubjectAverages(data.students),
    subjectChains: [
      { from: ["Tiếng Anh P1"], to: "Tiếng Anh P2" },
      { from: ["Tiếng Anh P2"], to: "Tiếng Anh P3" },
      { from: ["Lập trình HĐT", "Mạng máy tính"], to: "Lập trình IoT" },
      { from: ["Xác suất thống kê", "CTDL & Giải thuật"], to: "Trí tuệ nhân tạo" },
      { from: ["Tiếng Anh P3"], to: "Tiếng Anh P4" },
      { from: ["Xác suất thống kê", "Đại số tuyến tính", "Lập trình HĐT"], to: "Học máy" },
      { from: ["Lập trình HĐT", "PTTKHTT"], to: "Công nghệ phần mềm" },
      { from: ["Lập trình HĐT", "TT CNTT3 Front-End"], to: "Lập trình mobile" },
      { from: ["Công nghệ dữ liệu", "Học máy"], to: "Dữ liệu lớn" },
      { from: ["Tiếng Anh P4"], to: "Tiếng Anh P5" },
      { from: ["Mạng máy tính", "Lập trình HĐT"], to: "Lập trình mạng" },
      { from: ["Công nghệ phần mềm"], to: "Kiểm thử phần mềm" },
    ],
  };
}
