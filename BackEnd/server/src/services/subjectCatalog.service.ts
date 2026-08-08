import pool from "~/config/db";
import { getSubjectGroupsByProgram } from "~/models/subjectGroup.model";
import { hasPredictionModel, resolveSubjectId } from "~/utils/subjectGroups.util";

export type GroupScope = "base" | "shared" | "catalog";

export type CatalogSubject = {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category: string | null;
  subject_group_id: string | null;
  model_subject_id: string | null;
  has_prediction_model?: boolean;
  prerequisite_ids: string[];
  prerequisite_names: string[];
  /** Gán trực tiếp vào ngành (không qua nhóm) */
  assigned_direct?: boolean;
};

export type CatalogGroup = {
  id: string;
  code: string;
  name: string;
  label: string;
  description: string | null;
  sort_order: number;
  subject_count: number;
  group_scope: GroupScope;
  /** Nhóm base: tự có trong mọi CTĐT */
  is_inherited_base: boolean;
  /** Ngành đã gán nhóm này */
  is_assigned: boolean;
  subjects: CatalogSubject[];
};

export type SubjectCatalogResponse = {
  program_id: string;
  groups: CatalogGroup[];
};

export type WarehouseGroup = CatalogGroup & { subject_count_total: number };
export type WarehouseCatalogResponse = {
  groups: WarehouseGroup[];
  total_subjects: number;
};

export async function getDefaultProgramId(): Promise<string | null> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM programs WHERE code = 'CNTT' LIMIT 1`
  );
  return r.rows[0]?.id ?? null;
}

async function resolveProgramId(programId?: string): Promise<string> {
  const trimmed = programId?.trim();
  if (trimmed) {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM programs WHERE id = $1 LIMIT 1`,
      [trimmed]
    );
    if (r.rows[0]?.id) return r.rows[0].id;
    throw Object.assign(new Error("Không tìm thấy chuyên ngành"), { status: 404 });
  }
  const defaultId = await getDefaultProgramId();
  if (!defaultId) {
    throw Object.assign(new Error("Chưa cấu hình chương trình mặc định (CNTT)"), { status: 400 });
  }
  return defaultId;
}

export type PickerCatalogQuery = {
  /** Chỉ admin dùng khi cần chọn ngành/lớp thủ công */
  programId?: string;
  programCode?: string;
  adminClassId?: string;
  userId?: string;
  userRole?: string;
};

export type PickerProgramContext = {
  programId: string;
  adminClassId?: string | null;
  adminClassName?: string | null;
  source: "teacher_class" | "student_class" | "admin_param";
};

/**
 * Picker-catalog: luôn theo tài khoản đăng nhập.
 * GV → lớp chủ nhiệm → chuyên ngành → nhóm môn.
 * SV → lớp hành chính → chuyên ngành → nhóm môn.
 * Admin → bắt buộc truyền program_id / program_code / admin_class_id (không mặc định CNTT).
 */
export async function resolveProgramForPickerQuery(
  query: PickerCatalogQuery
): Promise<PickerProgramContext> {
  const role = query.userRole;
  const userId = query.userId;

  if (role === "teacher" && userId) {
    const r = await pool.query<{
      program_id: string | null;
      id: string;
      display_name: string;
    }>(
      `SELECT id, program_id, display_name
       FROM admin_classes
       WHERE manager_teacher_id = $1
       LIMIT 1`,
      [userId]
    );
    const row = r.rows[0];
    if (!row?.program_id) {
      throw Object.assign(
        new Error(
          "Giáo viên chưa được gán lớp chủ nhiệm — không xác định được nhóm môn theo chuyên ngành"
        ),
        { status: 403 }
      );
    }
    return {
      programId: row.program_id,
      adminClassId: row.id,
      adminClassName: row.display_name,
      source: "teacher_class",
    };
  }

  if (role === "student" && userId) {
    const r = await pool.query<{
      program_id: string | null;
      admin_class_id: string | null;
      display_name: string | null;
    }>(
      `SELECT ac.program_id, ac.id AS admin_class_id, ac.display_name
       FROM accounts a
       LEFT JOIN admin_classes ac ON ac.id = a.admin_class_id
       WHERE a.id = $1
       LIMIT 1`,
      [userId]
    );
    const row = r.rows[0];
    if (!row?.program_id) {
      throw Object.assign(
        new Error("Sinh viên chưa được gán lớp — không xác định được nhóm môn theo chuyên ngành"),
        { status: 403 }
      );
    }
    return {
      programId: row.program_id,
      adminClassId: row.admin_class_id,
      adminClassName: row.display_name,
      source: "student_class",
    };
  }

  if (role === "admin") {
    const adminClassId = query.adminClassId?.trim();
    if (adminClassId) {
      const r = await pool.query<{ program_id: string | null; display_name: string }>(
        `SELECT program_id, display_name FROM admin_classes WHERE id = $1 LIMIT 1`,
        [adminClassId]
      );
      if (r.rows[0]?.program_id) {
        return {
          programId: r.rows[0].program_id,
          adminClassId,
          adminClassName: r.rows[0].display_name,
          source: "admin_param",
        };
      }
      throw Object.assign(new Error("Không tìm thấy chuyên ngành của lớp hành chính"), {
        status: 404,
      });
    }

    const programCode = query.programCode?.trim();
    if (programCode) {
      const r = await pool.query<{ id: string }>(
        `SELECT id FROM programs WHERE UPPER(code) = UPPER($1) AND is_active = true LIMIT 1`,
        [programCode]
      );
      if (r.rows[0]?.id) {
        return { programId: r.rows[0].id, source: "admin_param" };
      }
      throw Object.assign(new Error("Không tìm thấy chuyên ngành"), { status: 404 });
    }

    if (query.programId?.trim()) {
      const programId = await resolveProgramId(query.programId);
      return { programId, source: "admin_param" };
    }

    throw Object.assign(
      new Error(
        "Admin cần chọn chuyên ngành hoặc lớp (program_id, program_code hoặc admin_class_id)"
      ),
      { status: 400 }
    );
  }

  throw Object.assign(new Error("Không xác định được chuyên ngành cho tài khoản này"), {
    status: 403,
  });
}

function toCatalogSubject(
  row: {
    id: string;
    name: string;
    code: string;
    credits: number;
    semester: number;
    category: string;
    sub_category: string | null;
    subject_group_id: string | null;
    prerequisites: string[] | null;
    assigned_direct?: boolean;
  },
  allById: Map<string, { name: string }>
): CatalogSubject {
  const modelSubjectId = resolveSubjectId(row.name);
  const prereqIds = Array.isArray(row.prerequisites)
    ? row.prerequisites.filter((x): x is string => typeof x === "string")
    : [];
  const prereqNames = prereqIds
    .map((pid) => allById.get(pid)?.name)
    .filter((n): n is string => Boolean(n));
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? "",
    credits: Number(row.credits) || 0,
    semester: Number(row.semester) || 0,
    category: row.category ?? "general",
    sub_category: row.sub_category,
    subject_group_id: row.subject_group_id,
    model_subject_id: modelSubjectId,
    has_prediction_model: modelSubjectId ? hasPredictionModel(modelSubjectId) : false,
    prerequisite_ids: prereqIds,
    prerequisite_names: prereqNames,
    assigned_direct: row.assigned_direct,
  };
}

/** Môn thuộc chương trình ngành (kế thừa base + gán nhóm + gán lẻ) */
function programSubjectFilterSql(programIdParam: string): string {
  return `
    s.is_active = true
    AND (
      sg.group_scope = 'base'
      OR psg.program_id = ${programIdParam}
      OR ps.program_id = ${programIdParam}
    )
  `;
}

/** CTĐT một ngành — nhóm + môn đã gán / kế thừa base */
export async function getSubjectCatalog(
  programId?: string,
  options?: { hideEmptyGroups?: boolean }
): Promise<SubjectCatalogResponse> {
  const resolvedProgramId = await resolveProgramId(programId);

  const assignedRes = await pool.query<{ subject_group_id: string }>(
    `SELECT subject_group_id FROM program_subject_groups WHERE program_id = $1`,
    [resolvedProgramId]
  );
  const assignedGroupIds = new Set(assignedRes.rows.map((r) => r.subject_group_id));

  const dbGroups = await getSubjectGroupsByProgram(resolvedProgramId);

  const subjectSql = `
    SELECT s.id, s.name, s.code, s.credits, s.semester, s.category, s.sub_category,
           s.prerequisites, s.subject_group_id,
           (ps.program_id IS NOT NULL) AS assigned_direct
    FROM subjects s
    LEFT JOIN subject_groups sg ON sg.id = s.subject_group_id
    LEFT JOIN program_subject_groups psg
      ON psg.subject_group_id = sg.id AND psg.program_id = $1
    LEFT JOIN program_subjects ps ON ps.subject_id = s.id AND ps.program_id = $1
    WHERE ${programSubjectFilterSql("$1")}
    ORDER BY s.semester ASC, s.name ASC
  `;
  const r = await pool.query(subjectSql, [resolvedProgramId]);

  const allById = new Map(r.rows.map((row) => [row.id, { name: row.name }]));
  const buckets = new Map<string, CatalogSubject[]>();
  for (const g of dbGroups) buckets.set(g.id, []);

  const ungrouped: CatalogSubject[] = [];

  for (const row of r.rows) {
    const item = toCatalogSubject(row, allById);

    if (row.subject_group_id) {
      if (buckets.has(row.subject_group_id)) {
        const list = buckets.get(row.subject_group_id)!;
        if (!list.some((s) => s.id === item.id)) list.push(item);
      }
      continue;
    }

    const byCode = row.sub_category
      ? dbGroups.find((g) => g.code === row.sub_category)
      : null;
    if (byCode && buckets.has(byCode.id)) {
      const list = buckets.get(byCode.id)!;
      if (!list.some((s) => s.id === item.id)) list.push(item);
      continue;
    }

    ungrouped.push(item);
  }

  const groups: CatalogGroup[] = dbGroups.map((g) => {
    const scope = (g as { group_scope?: GroupScope }).group_scope ?? "catalog";
    const isBase = scope === "base";
    const isAssigned = isBase || assignedGroupIds.has(g.id);
    const subjects = (buckets.get(g.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "vi")
    );
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      label: g.name,
      description: g.description,
      sort_order: g.sort_order,
      subject_count: subjects.length,
      group_scope: scope,
      is_inherited_base: isBase,
      is_assigned: isAssigned,
      subjects,
    };
  });

  if (ungrouped.length > 0) {
    groups.push({
      id: "other",
      code: "other",
      name: "Chưa gán nhóm / môn lẻ",
      label: "Chưa gán nhóm / môn lẻ",
      description: null,
      sort_order: 9999,
      subject_count: ungrouped.length,
      group_scope: "catalog",
      is_inherited_base: false,
      is_assigned: true,
      subjects: ungrouped.sort((a, b) => a.name.localeCompare(b.name, "vi")),
    });
  }

  const filtered = options?.hideEmptyGroups
    ? groups.filter((g) => g.subjects.length > 0)
    : groups;

  return { program_id: resolvedProgramId, groups: filtered };
}

/** Kho trường — toàn bộ nhóm + môn (admin quản lý master) */
export async function getSubjectWarehouseCatalog(): Promise<WarehouseCatalogResponse> {
  const groupsRes = await pool.query<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    sort_order: number;
    group_scope: GroupScope;
  }>(
    `SELECT id, code, name, description, sort_order, group_scope
     FROM subject_groups
     WHERE is_active = true
     ORDER BY sort_order ASC, name ASC`
  );

  const subjectsRes = await pool.query<{
    id: string;
    name: string;
    code: string;
    credits: number;
    semester: number;
    category: string;
    sub_category: string | null;
    prerequisites: string[] | null;
    subject_group_id: string | null;
  }>(
    `SELECT id, name, code, credits, semester, category, sub_category, prerequisites, subject_group_id
     FROM subjects
     WHERE is_active = true
     ORDER BY semester ASC, name ASC`
  );

  const allById = new Map(subjectsRes.rows.map((row) => [row.id, { name: row.name }]));
  const buckets = new Map<string, CatalogSubject[]>();
  for (const g of groupsRes.rows) buckets.set(g.id, []);

  const ungrouped: CatalogSubject[] = [];
  for (const row of subjectsRes.rows) {
    const item = toCatalogSubject(row, allById);
    if (row.subject_group_id && buckets.has(row.subject_group_id)) {
      buckets.get(row.subject_group_id)!.push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const groups: WarehouseGroup[] = groupsRes.rows.map((g) => {
    const subjects = (buckets.get(g.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "vi")
    );
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      label: g.name,
      description: g.description,
      sort_order: g.sort_order,
      subject_count: subjects.length,
      subject_count_total: subjects.length,
      group_scope: g.group_scope,
      is_inherited_base: g.group_scope === "base",
      is_assigned: false,
      subjects,
    };
  });

  if (ungrouped.length > 0) {
    groups.push({
      id: "other",
      code: "other",
      name: "Chưa gán nhóm",
      label: "Chưa gán nhóm",
      description: null,
      sort_order: 9999,
      subject_count: ungrouped.length,
      subject_count_total: ungrouped.length,
      group_scope: "catalog",
      is_inherited_base: false,
      is_assigned: false,
      subjects: ungrouped,
    });
  }

  return {
    groups,
    total_subjects: subjectsRes.rows.length,
  };
}

/** UUID môn thuộc CTĐT ngành (mặc định CNTT) — cùng nguồn GET /subjects/picker-catalog */
export async function getProgramSubjectIds(programId?: string): Promise<string[]> {
  const catalog = await getSubjectCatalog(programId, { hideEmptyGroups: true });
  const ids = new Set<string>();
  for (const group of catalog.groups) {
    for (const subject of group.subjects) {
      ids.add(subject.id);
    }
  }
  return [...ids];
}

export type SubjectPickerCatalogResponse = {
  program_id: string;
  program_code: string;
  program_name: string;
  admin_class_id?: string | null;
  admin_class_name?: string | null;
  source: "teacher_class" | "student_class" | "admin_param";
  groups: Array<{
    id: string;
    code: string;
    name: string;
    label: string;
    sort_order: number;
    subject_count: number;
    subjects: Array<{
      id: string;
      name: string;
      code: string;
      credits: number;
      semester: number;
      model_subject_id: string | null;
      has_prediction_model: boolean;
      prerequisite_ids: string[];
      prerequisite_names: string[];
    }>;
  }>;
};

function mapPickerGroups(catalog: SubjectCatalogResponse): SubjectPickerCatalogResponse["groups"] {
  return catalog.groups
    .filter((g) => g.id !== "other" && g.is_assigned !== false)
    .filter((g) => g.subjects.length > 0)
    .map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      label: g.label,
      sort_order: g.sort_order,
      subject_count: g.subject_count,
      subjects: g.subjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        credits: s.credits,
        semester: s.semester,
        model_subject_id: s.model_subject_id,
        has_prediction_model: s.has_prediction_model ?? false,
        prerequisite_ids: s.prerequisite_ids ?? [],
        prerequisite_names: s.prerequisite_names ?? [],
      })),
    }));
}

/** Nhóm môn theo chuyên ngành của tài khoản đăng nhập (GV/SV) hoặc tham số admin */
export async function getSubjectPickerCatalog(
  query?: PickerCatalogQuery | string
): Promise<SubjectPickerCatalogResponse> {
  const resolvedQuery: PickerCatalogQuery =
    typeof query === "string" ? { programId: query, userRole: "admin" } : (query ?? {});

  const ctx = await resolveProgramForPickerQuery(resolvedQuery);
  const catalog = await getSubjectCatalog(ctx.programId, { hideEmptyGroups: true });

  const progR = await pool.query<{ code: string; name: string }>(
    `SELECT code, name FROM programs WHERE id = $1 LIMIT 1`,
    [ctx.programId]
  );
  const prog = progR.rows[0];

  return {
    program_id: ctx.programId,
    program_code: prog?.code ?? "",
    program_name: prog?.name ?? "",
    admin_class_id: ctx.adminClassId ?? null,
    admin_class_name: ctx.adminClassName ?? null,
    source: ctx.source,
    groups: mapPickerGroups(catalog),
  };
}
