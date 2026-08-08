import pool from "~/config/db";
import { getRetakeGrantsByExam } from "~/models/examRetakeGrant.model";
import type { SessionWithStudent } from "~/models/examsession.model";
import { MAX_INTEGRITY_STRIKES, STRIKE_EVENT_TYPES } from "~/utils/examIntegrityPolicy";

export type SessionDisplayTag =
  | "submitted"
  | "disconnected"
  | "violations_exceeded"
  | "retake_pending"
  | "retake_session"
  | "voided";

export type SubmitSource = "student" | "force_submit" | "violation_auto" | "timer";

export interface EnrichedExamSession extends SessionWithStudent {
  strike_count: number;
  submit_source: SubmitSource | null;
  disconnect_flag: boolean;
  session_tags: SessionDisplayTag[];
  previous_score: number | null;
  previous_max_points: number | null;
}

async function batchStrikeCounts(sessionIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (sessionIds.length === 0) return map;

  const result = await pool.query<{ session_id: string; cnt: number }>(
    `SELECT session_id, COUNT(*)::int AS cnt
     FROM exam_integrity_events
     WHERE session_id = ANY($1::uuid[])
       AND event_type = ANY($2::text[])
     GROUP BY session_id`,
    [sessionIds, [...STRIKE_EVENT_TYPES]]
  );
  for (const row of result.rows) {
    map.set(row.session_id, row.cnt);
  }
  return map;
}

function computeSessionTags(
  session: SessionWithStudent & {
    strike_count: number;
    submit_source: SubmitSource | null;
    disconnect_flag: boolean;
  },
  approvedGrantStudentIds: Set<string>,
  consumedGrantSessionIds: Set<string>
): SessionDisplayTag[] {
  const tags: SessionDisplayTag[] = [];

  if (session.voided_at) {
    tags.push("voided");
    return tags;
  }

  if (consumedGrantSessionIds.has(session.id)) {
    tags.push("retake_session");
  } else if (approvedGrantStudentIds.has(session.student_id)) {
    tags.push("retake_pending");
  }

  if (session.disconnect_flag) {
    tags.push("disconnected");
  }

  if (session.strike_count >= MAX_INTEGRITY_STRIKES) {
    tags.push("violations_exceeded");
  }

  if (session.status === "submitted") {
    tags.push("submitted");
  }

  return tags;
}

export async function enrichSessionsForTeacherView(
  items: SessionWithStudent[],
  examId: string
): Promise<EnrichedExamSession[]> {
  if (items.length === 0) return [];

  const [grants, strikeMap] = await Promise.all([
    getRetakeGrantsByExam(examId),
    batchStrikeCounts(items.map((s) => s.id)),
  ]);

  const approvedGrantStudentIds = new Set(
    grants.filter((g) => g.status === "approved").map((g) => g.student_id)
  );
  const consumedGrantSessionIds = new Set(
    grants
      .filter((g) => g.status === "consumed" && g.consumed_session_id)
      .map((g) => g.consumed_session_id as string)
  );

  const sessionIds = items.map((s) => s.id);
  const prevScores = await pool.query<{
    superseded_by: string;
    score: number | null;
    max_points: number | null;
  }>(
    `SELECT superseded_by, score, max_points
     FROM exam_sessions
     WHERE superseded_by = ANY($1::uuid[])`,
    [sessionIds]
  );
  const prevByNewSession = new Map(
    prevScores.rows.map((r) => [
      r.superseded_by,
      { score: r.score, max_points: r.max_points },
    ])
  );

  return items.map((session) => {
    const strike_count = strikeMap.get(session.id) ?? 0;
    const submit_source = (session as SessionWithStudent & { submit_source?: SubmitSource | null })
      .submit_source ?? null;
    const disconnect_flag = Boolean(
      (session as SessionWithStudent & { disconnect_flag?: boolean }).disconnect_flag
    );
    const prev = prevByNewSession.get(session.id);

    const session_tags = computeSessionTags(
      { ...session, strike_count, submit_source, disconnect_flag },
      approvedGrantStudentIds,
      consumedGrantSessionIds
    );

    return {
      ...session,
      strike_count,
      submit_source,
      disconnect_flag,
      session_tags,
      previous_score: prev?.score ?? null,
      previous_max_points: prev?.max_points ?? null,
    };
  });
}
