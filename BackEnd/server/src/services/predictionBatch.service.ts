import { upsertPredictionCache } from "~/models/studentPredictionCache.model";
import { getAllUsers } from "~/models/user.model";
import {
  buildStudentPredictionInput,
  loadStudentCompletedExams,
} from "~/services/predictionData.service";
import { getSubjectByName } from "~/models/subject.model";
import { getPredictionTargets } from "~/utils/subjectGroups.util";
import { predictScore } from "~/services/prediction.service";
import { buildWrongAnswerBundle } from "~/services/wrongAnswerBundle.service";
import { runWithPredictionAiSlot } from "~/utils/predictionAiQueue";

export type RecomputeSummary = {
  total_students: number;
  computed: number;
  skipped_no_data: number;
  failed: number;
  errors: string[];
};

/** Admin (tuỳ chọn): tính lần lượt từng SV — vẫn qua hàng đợi 5 slot / timeout 120s. */
export async function recomputePredictionsForAllStudents(): Promise<RecomputeSummary> {
  const users = await getAllUsers();
  const students = users.filter((u) => u.role === "student");
  const summary: RecomputeSummary = {
    total_students: students.length,
    computed: 0,
    skipped_no_data: 0,
    failed: 0,
    errors: [],
  };

  for (const u of students) {
    try {
      const rows = await loadStudentCompletedExams(u.id);
      if (rows.length === 0) {
        summary.skipped_no_data += 1;
        continue;
      }
      const latest = rows[rows.length - 1];
      const { targets } = getPredictionTargets(
        latest.subject,
        rows.map((r) => r.subject)
      );
      const targetName = targets[0];
      if (!targetName) {
        summary.skipped_no_data += 1;
        continue;
      }
      const targetRow = await getSubjectByName(targetName);
      if (!targetRow) {
        summary.skipped_no_data += 1;
        continue;
      }
      const built = await buildStudentPredictionInput(
        u.id,
        u.full_name,
        targetRow.id
      );
      if (!built) {
        summary.skipped_no_data += 1;
        continue;
      }
      const wrongItems = await buildWrongAnswerBundle(built.contextSession);
      const result = await runWithPredictionAiSlot(() =>
        predictScore(built.request, { wrong_items: wrongItems })
      );
      await upsertPredictionCache(u.id, {
        ...result,
        target_subject: targetRow.name,
        target_subject_id: targetRow.id,
      });
      summary.computed += 1;
    } catch (e: unknown) {
      summary.failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      if (summary.errors.length < 25) {
        summary.errors.push(`${u.email}: ${msg}`);
      }
    }
  }

  return summary;
}
