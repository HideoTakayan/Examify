import { useEffect, useMemo, useState } from 'react';
import {
  catalogToPickerGroups,
  type SubjectPickerCatalogGroupDto,
} from '@/components/Input/SubjectCategoryPicker/predictionSubjectGrouping';
import type { SubjectCategoryGroup } from '@/components/Input/SubjectCategoryPicker/subjectGrouping';
import type { SubjectDto, SubjectPickerCatalogOptions } from '@/services/subjectApi';
import { getSubjectPickerCatalog } from '@/services/subjectApi';

export function useSubjectPickerCatalog(options?: SubjectPickerCatalogOptions) {
  const programId = options?.programId;
  const programCode = options?.programCode;
  const adminClassId = options?.adminClassId;

  const [catalog, setCatalog] = useState<SubjectPickerCatalogGroupDto[]>([]);
  const [programMeta, setProgramMeta] = useState<{
    program_id: string;
    program_code: string;
    program_name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const hasAdminScope = Boolean(programId || programCode || adminClassId);
    void getSubjectPickerCatalog(
      hasAdminScope ? { programId, programCode, adminClassId } : undefined
    )
      .then((data) => {
        if (!cancelled) {
          setCatalog(data.groups);
          setProgramMeta({
            program_id: data.program_id,
            program_code: data.program_code,
            program_name: data.program_name,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
          setProgramMeta(null);
          setError('Không tải được danh mục môn theo nhóm.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [programId, programCode, adminClassId]);

  const groups = useMemo(() => catalogToPickerGroups(catalog), [catalog]);

  const subjects = useMemo(
    () => dedupeSubjectsById(groups.flatMap((g) => g.subjects)),
    [groups]
  );

  return { catalog, groups, subjects, programMeta, loading, error };
}

function dedupeSubjectsById(list: SubjectDto[]): SubjectDto[] {
  const seen = new Set<string>();
  const out: SubjectDto[] = [];
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

export type { SubjectCategoryGroup };
