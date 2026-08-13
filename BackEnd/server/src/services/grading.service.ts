import pool from "~/config/db";

export const getOfferingsByTeacher = async (teacherId: string) => {
  const result = await pool.query(`
    SELECT o.id, o.section_name, s.name as subject_name, s.code as subject_code,
           sem.name as semester_name, sem.year as year,
           COUNT(e.student_id) as student_count
    FROM term_subject_offerings o
    JOIN subjects s ON s.id = o.subject_id
    JOIN semesters sem ON sem.id = o.semester_id
    JOIN term_teacher_registrations t ON t.term_offering_id = o.id
    LEFT JOIN term_student_enrollments e ON e.term_offering_id = o.id
    WHERE t.teacher_id = $1
    GROUP BY o.id, s.name, s.code, sem.name, sem.year
    ORDER BY sem.name DESC, s.name ASC
  `, [teacherId]);
  return result.rows;
};

export const assertTeacherOwnsOffering = async (offeringId: string, teacherId: string, role: string) => {
  if (role === 'admin') return true;
  
  const result = await pool.query(`
    SELECT 1 FROM term_teacher_registrations
    WHERE term_offering_id = $1 AND teacher_id = $2
  `, [offeringId, teacherId]);
  
  if (result.rows.length === 0) {
    throw { status: 403, message: "Bạn không có quyền quản lý lớp học phần này" };
  }
  return true;
};

export const getStudentsByOffering = async (offeringId: string) => {
  // We join accounts to get student details.
  // We also check if there is an MCQ exam for this offering's subject/semester and get the max score.
  const result = await pool.query(`
    SELECT e.student_id, e.final_score, a.username as student_code, a.full_name, a.email,
           (
             SELECT MAX(
               CASE WHEN es.max_points > 0 
                    THEN (es.score / es.max_points * 10) 
                    ELSE 0 
               END
             )
             FROM exam_sessions es
             JOIN exams ex ON ex.id = es.exam_id
             JOIN term_subject_offerings tso ON tso.id = $1
             JOIN semesters sem ON sem.id = tso.semester_id
             WHERE es.student_id = e.student_id
               AND ex.subject_id = tso.subject_id
               AND ex.class_id = tso.id
               AND es.created_at >= sem.start_date
               AND es.created_at <= sem.end_date
               AND es.status = 'submitted'
           ) as online_max_score
    FROM term_student_enrollments e
    JOIN accounts a ON a.id = e.student_id
    WHERE e.term_offering_id = $1
    ORDER BY a.full_name ASC
  `, [offeringId]);
  
  return result.rows;
};

export const saveGrades = async (offeringId: string, grades: { student_id: string, final_score: number | null }[]) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const g of grades) {
      await client.query(`
        UPDATE term_student_enrollments
        SET final_score = $1
        WHERE term_offering_id = $2 AND student_id = $3
      `, [g.final_score, offeringId, g.student_id]);
    }
    
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const syncExamGrades = async (offeringId: string) => {
  // Automatically pull the online_max_score and set it as final_score for all students in this offering
  const students = await getStudentsByOffering(offeringId);
  let syncedCount = 0;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const s of students) {
      if (s.online_max_score !== null && s.online_max_score !== undefined) {
        await client.query(`
          UPDATE term_student_enrollments
          SET final_score = $1
          WHERE term_offering_id = $2 AND student_id = $3
        `, [s.online_max_score, offeringId, s.student_id]);
        syncedCount++;
      }
    }
    
    await client.query('COMMIT');
    return syncedCount;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
