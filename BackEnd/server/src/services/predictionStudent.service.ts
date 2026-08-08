import {
  buildStudentPredictionInput,
  getStudentEligibility,
} from "~/services/predictionData.service";
import { predictScore } from "~/services/prediction.service";
import { buildWrongAnswerBundle } from "~/services/wrongAnswerBundle.service";
import { runWithPredictionAiSlot } from "~/utils/predictionAiQueue";
import { httpError } from "~/services/exam.service";

export async function generatePredictionForStudent(
  studentId: string,
  fullName: string | null,
  targetSubjectId: string
) {
  const trimmed = targetSubjectId?.trim();
  if (!trimmed) {
    throw httpError(400, "Vui lòng chọn môn cần đánh giá");
  }

  const built = await buildStudentPredictionInput(
    studentId,
    fullName,
    trimmed
  );
  if (!built) {
    throw httpError(400, "Chưa đủ dữ liệu bài thi đã hoàn thành để đánh giá học lực");
  }

  const wrongItems = await buildWrongAnswerBundle(built.contextSession);

  const result = await runWithPredictionAiSlot(() =>
    predictScore(built.request, { wrong_items: wrongItems })
  );

  return {
    ...result,
    target_subject: built.target_subject,
    target_subject_id: trimmed,
  };
}

export { getStudentEligibility };
