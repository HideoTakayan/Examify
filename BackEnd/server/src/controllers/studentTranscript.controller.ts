import { Request, Response } from 'express';
import pool from '../config/db';

const BLOCK_REQUIREMENTS: Record<string, { total: number, compulsory: number }> = {
  'A1': { total: 33, compulsory: 33 },
  'B1': { total: 63, compulsory: 63 },
  'C1': { total: 4, compulsory: 4 },
  'C2': { total: 8, compulsory: 2 },
  'D1': { total: 10, compulsory: 10 },
  'D2': { total: 51, compulsory: 7 },
  'E1': { total: 11, compulsory: 11 },
  'E2': { total: 10, compulsory: 10 },
  'F1': { total: 8, compulsory: 0 },
  'F2.1': { total: 1, compulsory: 0 },
  'F2.2': { total: 2, compulsory: 0 },
  'F2.3': { total: 3, compulsory: 0 },
  'F3': { total: 4, compulsory: 0 },
};

function convertScore(score10: number, groupCode: string) {
  let score4 = 0;
  let letter = 'F';
  
  const passed = score10 >= 4.0;
  const isConditional = groupCode && groupCode.startsWith('F'); // F1, F2, F3 are usually P/NP

  if (isConditional) {
    letter = passed ? 'P' : 'NP';
    return { score4: null, letter, passed, isConditional };
  }

  if (score10 >= 9.0) { score4 = 4.0; letter = 'A+'; }
  else if (score10 >= 8.5) { score4 = 3.7; letter = 'A'; }
  else if (score10 >= 8.0) { score4 = 3.5; letter = 'B+'; }
  else if (score10 >= 7.0) { score4 = 3.0; letter = 'B'; }
  else if (score10 >= 6.5) { score4 = 2.5; letter = 'C+'; }
  else if (score10 >= 5.5) { score4 = 2.0; letter = 'C'; }
  else if (score10 >= 5.0) { score4 = 1.5; letter = 'D+'; }
  else if (score10 >= 4.0) { score4 = 1.0; letter = 'D'; }

  return { score4, letter, passed, isConditional };
}

export const getStudentTranscript = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user?.userId;
    if (!studentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 1. Lấy tất cả điểm sinh viên đã có (Bảng điểm theo kỳ)
    const takenQuery = `
      SELECT 
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        s.credits,
        sg.code as group_code,
        sg.name as group_name,
        MAX(es.score) as score10,
        c.semester,
        c.year
      FROM exam_sessions es
      JOIN exams e ON e.id = es.exam_id
      JOIN classes c ON c.id = e.class_id
      JOIN subjects s ON s.id = c.subject_id
      LEFT JOIN subject_groups sg ON sg.id = s.subject_group_id
      WHERE es.student_id = $1 AND es.status = 'submitted'
      GROUP BY s.id, s.name, s.code, s.credits, sg.code, sg.name, c.semester, c.year
      ORDER BY c.year ASC, c.semester ASC, s.name ASC
    `;
    const takenResult = await pool.query(takenQuery, [studentId]);
    const takenRecords = takenResult.rows;

    const semesters: Record<string, any> = {};
    const blocks: Record<string, any> = {};

    // Khởi tạo các blocks chuẩn
    Object.keys(BLOCK_REQUIREMENTS).forEach(code => {
      blocks[code] = {
        code,
        name: '',
        totalCredits: BLOCK_REQUIREMENTS[code].total,
        compulsoryCredits: BLOCK_REQUIREMENTS[code].compulsory,
        accumulatedCredits: 0,
        subjects: []
      };
    });

    // Tạo Map (Tra cứu nhanh môn đã học)
    const takenMap = new Map();

    // Phân bổ Bảng điểm theo kỳ (chỉ lấy môn ĐÃ HỌC)
    takenRecords.forEach(row => {
      takenMap.set(row.subject_code, row);

      const { score4, letter, passed, isConditional } = convertScore(Number(row.score10), row.group_code);
      
      const subjectDetail = {
        subject_id: row.subject_id,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        credits: Number(row.credits),
        score10: Number(row.score10),
        score4,
        letter,
        status: passed ? 'Đạt' : 'Không đạt',
        group_code: row.group_code,
        isConditional
      };

      const semKey = `${row.semester}-${row.year}`;
      if (!semesters[semKey]) {
        semesters[semKey] = {
          semester: row.semester,
          year: row.year,
          title: `Năm học ${row.year}_${row.year + 1} - Học kỳ ${row.semester.replace('HK', '')}`,
          subjects: [],
          summary: {
            totalCredits: 0,
            accumulatedCredits: 0,
            gpa10: 0,
            gpa4: 0,
            cumulativeGpa10: 0,
            cumulativeGpa4: 0
          }
        };
      }
      semesters[semKey].subjects.push(subjectDetail);
    });

    // Calculate GPAs for Semesters
    let cumulativePoints10 = 0;
    let cumulativePoints4 = 0;
    let cumulativeCredits = 0; // Tín chỉ đã qua để tính GPA tích lũy
    let cumulativeCreditsTotal = 0; // Tín chỉ tổng cộng đã học (nếu cần)
    let cumulativePassedCreditsAll = 0; // Tất cả tín chỉ đã qua (kể cả điều kiện)

    const semesterValues = Object.values(semesters).sort((a, b) => {
      if (a.year === b.year) return a.semester.localeCompare(b.semester);
      return a.year - b.year;
    });

    for (const sem of semesterValues) {
      let semPoints10 = 0;
      let semPoints4 = 0;
      let semCreditsForGpa = 0;
      let semTotalCredits = 0;
      let semAccumulatedCredits = 0;

      for (const sub of sem.subjects) {
        semTotalCredits += sub.credits;
        
        if (sub.status === 'Đạt' || sub.status === 'Hoàn thành') {
           semAccumulatedCredits += sub.credits;
           cumulativePassedCreditsAll += sub.credits;
        }

        if (!sub.isConditional) {
          // Tính cho học kỳ (Tất cả môn học, kể cả trượt)
          semCreditsForGpa += sub.credits;
          semPoints10 += sub.score10 * sub.credits;
          if (sub.score4 !== null) semPoints4 += sub.score4 * sub.credits;

          // Tính cho Tích lũy (Chỉ tính môn Đã qua)
          if (sub.status === 'Đạt' || sub.status === 'Hoàn thành') {
            cumulativeCredits += sub.credits;
            cumulativePoints10 += sub.score10 * sub.credits;
            if (sub.score4 !== null) cumulativePoints4 += sub.score4 * sub.credits;
          }
        }
      }

      sem.summary.totalCredits = semTotalCredits;
      sem.summary.accumulatedCredits = cumulativePassedCreditsAll; // Tích lũy là cộng dồn các môn đã qua từ đầu
      
      sem.summary.gpa10 = semCreditsForGpa ? (semPoints10 / semCreditsForGpa).toFixed(2) : 0;
      sem.summary.gpa4 = semCreditsForGpa ? (semPoints4 / semCreditsForGpa).toFixed(2) : 0;
      
      sem.summary.cumulativeGpa10 = cumulativeCredits ? (cumulativePoints10 / cumulativeCredits).toFixed(2) : 0;
      sem.summary.cumulativeGpa4 = cumulativeCredits ? (cumulativePoints4 / cumulativeCredits).toFixed(2) : 0;
    }

    // 2. Lấy TOÀN BỘ môn học trong chương trình để fill vào Khối kiến thức
    const curriculumQuery = `
      SELECT 
        s.id as subject_id,
        s.code as subject_code,
        s.name as subject_name,
        s.credits,
        sg.code as group_code,
        sg.name as group_name
      FROM subjects s
      JOIN subject_groups sg ON s.subject_group_id = sg.id
    `;
    const currResult = await pool.query(curriculumQuery);
    
    // Gộp thêm bất kỳ môn nào có trong takenMap mà chưa có trong chương trình (ví dụ: DT00001)
    const allSubjectsMap = new Map();
    currResult.rows.forEach(r => allSubjectsMap.set(r.subject_code, r));
    takenRecords.forEach(r => {
      if (!allSubjectsMap.has(r.subject_code) && r.group_code) {
        allSubjectsMap.set(r.subject_code, {
           subject_id: r.subject_id,
           subject_code: r.subject_code,
           subject_name: r.subject_name,
           credits: r.credits,
           group_code: r.group_code,
           group_name: r.group_name
        });
      }
    });

    const allSubjects = Array.from(allSubjectsMap.values());

    allSubjects.forEach(row => {
      const groupCode = row.group_code;
      if (!groupCode) return;

      if (!blocks[groupCode]) {
         blocks[groupCode] = {
           code: groupCode,
           name: row.group_name || groupCode,
           totalCredits: BLOCK_REQUIREMENTS[groupCode]?.total || 0,
           compulsoryCredits: BLOCK_REQUIREMENTS[groupCode]?.compulsory || 0,
           accumulatedCredits: 0,
           subjects: []
         };
      }
      blocks[groupCode].name = row.group_name; // Update name
      
      const taken = takenMap.get(row.subject_code);
      let subjectDetail;

      if (taken) {
        const { score4, letter, passed, isConditional } = convertScore(Number(taken.score10), groupCode);
        subjectDetail = {
          subject_id: row.subject_id,
          subject_code: row.subject_code,
          subject_name: row.subject_name,
          credits: Number(row.credits),
          score10: Number(taken.score10),
          score4,
          letter,
          status: passed ? 'Đạt' : 'Không đạt',
          group_code: groupCode,
          isConditional
        };
        if (passed) {
          blocks[groupCode].accumulatedCredits += Number(row.credits);
        }
      } else {
        const isConditional = groupCode.startsWith('F');
        subjectDetail = {
          subject_id: row.subject_id,
          subject_code: row.subject_code,
          subject_name: row.subject_name,
          credits: Number(row.credits),
          score10: null, // Chưa học
          score4: null,
          letter: '',
          status: 'Chưa học',
          group_code: groupCode,
          isConditional
        };
      }
      
      blocks[groupCode].subjects.push(subjectDetail);
    });

    res.json({
      semesters: semesterValues.reverse(), // Reverse to show latest semester first
      blocks: Object.values(blocks).sort((a: any, b: any) => {
         const order = ['A1','B1','C1','C2','D1','D2','E1','E2','F1','F2.1','F2.2','F2.3','F3'];
         return order.indexOf(a.code) - order.indexOf(b.code);
      })
    });
  } catch (error) {
    console.error('Error fetching student transcript', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
