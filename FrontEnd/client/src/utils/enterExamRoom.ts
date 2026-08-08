import type { NavigateFunction } from 'react-router-dom';
import { requestExamFullscreen } from '@/utils/examFullscreen';

/** Vào phòng thi: bật fullscreen (bắt buộc) trong cùng thao tác click, rồi điều hướng. */
export async function enterExamRoom(navigate: NavigateFunction, examId: string): Promise<boolean> {
  const ok = await requestExamFullscreen();
  if (!ok) return false;
  navigate(`/exam/${examId}`);
  return true;
}
