import { SUBJECT_CATEGORY_LABELS, type SubjectDto } from '@/services/subjectApi';

export const CATEGORY_ORDER = [
  'foundation',
  'ai_ml',
  'software_eng',
  'internship',
  'general_ed',
  'skills_support',
  'programming',
  'english',
  'math',
  'network',
  'general',
] as const;

export type SubjectCategoryGroup = {
  category: string;
  label: string;
  subjects: SubjectDto[];
};

export function groupSubjectsByCategory(subjects: SubjectDto[]): SubjectCategoryGroup[] {
  const map = new Map<string, SubjectDto[]>();

  for (const subject of subjects) {
    const key = subject.category || 'general';
    const list = map.get(key) ?? [];
    list.push(subject);
    map.set(key, list);
  }

  const groups: SubjectCategoryGroup[] = [];

  for (const category of CATEGORY_ORDER) {
    const items = map.get(category);
    if (!items?.length) continue;
    groups.push({
      category,
      label: SUBJECT_CATEGORY_LABELS[category] ?? category,
      subjects: [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    });
    map.delete(category);
  }

  for (const [category, items] of map.entries()) {
    groups.push({
      category,
      label: SUBJECT_CATEGORY_LABELS[category] ?? category,
      subjects: [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    });
  }

  return groups;
}

export function formatSubjectLabel(subject: SubjectDto): string {
  const code = subject.code?.trim();
  const semester =
    typeof subject.semester === 'number' && subject.semester > 0
      ? ` (Kỳ ${subject.semester})`
      : '';
  return code ? `${code} — ${subject.name}${semester}` : `${subject.name}${semester}`;
}
