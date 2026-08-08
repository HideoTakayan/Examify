import { useEffect, useMemo, useState } from 'react';

import {

  ActionIcon,

  Box,

  InputBase,

  InputWrapper,

  Popover,

  ScrollArea,

  Text,

  TextInput,

  UnstyledButton,

} from '@mantine/core';

import { useDisclosure } from '@mantine/hooks';

import { IconChevronRight, IconSearch, IconX } from '@tabler/icons-react';

import type { SubjectDto } from '@/services/subjectApi';

import { getSubjectPickerCatalog } from '@/services/subjectApi';

import { catalogToPickerGroups } from './predictionSubjectGrouping';

import { formatSubjectLabel, type SubjectCategoryGroup } from './subjectGrouping';

import styles from './SubjectCategoryPicker.module.scss';



export type { SubjectCategoryGroup };



export type SubjectPickerSearchMode = 'block' | 'global';



export interface SubjectCategoryPickerProps {

  label?: string;

  placeholder?: string;

  /** Danh sách môn (tuỳ chọn nếu đã truyền externalGroups hoặc để picker tự gọi API) */

  subjects?: SubjectDto[];

  /** Nhóm từ GET /subjects/picker-catalog — ưu tiên hơn tự fetch */

  externalGroups?: SubjectCategoryGroup[];

  /** CTĐT — lọc nhóm môn theo ngành / lớp hành chính */
  programId?: string;
  programCode?: string;
  adminClassId?: string;

  searchMode?: SubjectPickerSearchMode;

  value?: string | null;

  onChange?: (subjectId: string | null) => void;

  error?: string;

  helperText?: string;

  disabled?: boolean;

  required?: boolean;

  size?: 'xs' | 'sm' | 'md';

  catalogLoading?: boolean;

}



function dedupeSubjects(list: SubjectDto[]): SubjectDto[] {

  const seen = new Set<string>();

  const out: SubjectDto[] = [];

  for (const s of list) {

    if (seen.has(s.id)) continue;

    seen.add(s.id);

    out.push(s);

  }

  return out;

}



export default function SubjectCategoryPicker({

  label,

  placeholder = 'Chọn môn học',

  subjects = [],

  externalGroups,

  programId,

  programCode,

  adminClassId,

  searchMode = 'block',

  value = null,

  onChange,

  error,

  helperText,

  disabled = false,

  required = false,

  size = 'sm',

  catalogLoading: catalogLoadingProp,

}: SubjectCategoryPickerProps) {

  const [opened, { close, toggle }] = useDisclosure(false);

  const [fetchedGroups, setFetchedGroups] = useState<SubjectCategoryGroup[] | null>(null);

  const [fetchLoading, setFetchLoading] = useState(false);



  useEffect(() => {
    if (externalGroups) return;
    let cancelled = false;
    setFetchLoading(true);
    void getSubjectPickerCatalog(
      programId || programCode || adminClassId
        ? { programId, programCode, adminClassId }
        : undefined
    )

      .then((catalog) => {

        if (!cancelled) setFetchedGroups(catalogToPickerGroups(catalog.groups));

      })

      .catch(() => {

        if (!cancelled) setFetchedGroups([]);

      })

      .finally(() => {

        if (!cancelled) setFetchLoading(false);

      });

    return () => {

      cancelled = true;

    };

  }, [externalGroups, programId, programCode, adminClassId]);



  const groups = useMemo(

    () => externalGroups ?? fetchedGroups ?? [],

    [externalGroups, fetchedGroups]

  );



  const catalogSubjects = useMemo(

    () => dedupeSubjects(groups.flatMap((g) => g.subjects)),

    [groups]

  );



  const allSubjects = useMemo(() => {

    if (catalogSubjects.length > 0) return catalogSubjects;

    return subjects;

  }, [catalogSubjects, subjects]);



  const catalogLoading = catalogLoadingProp ?? (fetchLoading && !externalGroups);



  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [search, setSearch] = useState('');



  const selected = useMemo(

    () => allSubjects.find((s) => s.id === value) ?? null,

    [allSubjects, value]

  );



  const globalSearchResults = useMemo(() => {

    const q = search.trim().toLowerCase();

    if (searchMode !== 'global' || !q) return null;

    const hits: Array<{ group: SubjectCategoryGroup; subject: SubjectDto }> = [];

    for (const group of groups) {

      for (const subject of group.subjects) {

        if (

          subject.name.toLowerCase().includes(q) ||

          (subject.code ?? '').toLowerCase().includes(q)

        ) {

          hits.push({ group, subject });

        }

      }

    }

    return hits;

  }, [groups, search, searchMode]);



  const activeGroup = useMemo(() => {

    if (!groups.length) return null;

    if (globalSearchResults?.length) {

      return globalSearchResults[0].group;

    }

    const key = activeCategory ?? groups[0].category;

    return groups.find((g) => g.category === key) ?? groups[0];

  }, [groups, activeCategory, globalSearchResults]);



  const filteredSubjects = useMemo(() => {

    if (globalSearchResults) {

      return globalSearchResults.map((h) => h.subject);

    }

    if (!activeGroup) return [];

    const q = search.trim().toLowerCase();

    if (!q) return activeGroup.subjects;

    return activeGroup.subjects.filter(

      (s) =>

        s.name.toLowerCase().includes(q) ||

        (s.code ?? '').toLowerCase().includes(q)

    );

  }, [activeGroup, search, globalSearchResults]);



  useEffect(() => {

    if (!groups.length) {

      setActiveCategory(null);

      return;

    }

    setActiveCategory((prev) => {

      if (prev && groups.some((g) => g.category === prev)) return prev;

      return selected?.category ?? groups[0].category;

    });

  }, [groups, value, selected?.category]);



  useEffect(() => {

    if (opened && selected) {

      setActiveCategory(selected.category);

    }

  }, [opened, selected?.id, selected?.category]);



  useEffect(() => {

    if (globalSearchResults?.length) {

      setActiveCategory(globalSearchResults[0].group.category);

    }

  }, [globalSearchResults]);



  const displayValue = selected ? formatSubjectLabel(selected) : '';

  const pickerDisabled = disabled || catalogLoading;



  const handlePick = (subjectId: string) => {

    onChange?.(subjectId);

    setSearch('');

    close();

  };



  const handleClear = (e: React.MouseEvent) => {

    e.stopPropagation();

    onChange?.(null);

    setSearch('');

  };



  const searchPlaceholder =

    searchMode === 'global'

      ? 'Tìm môn trong tất cả khối...'

      : 'Tìm môn trong khối đang chọn...';



  return (

    <InputWrapper

      label={label}

      error={error}

      description={helperText}

      required={required}

      withAsterisk={required}

      className={styles.root}

    >

      <Popover

        opened={opened}

        onChange={(o) => !o && close()}

        position="bottom-start"

        width={480}

        shadow="md"

        disabled={pickerDisabled}

        withinPortal

      >

        <Popover.Target>

          <InputBase

            component="button"

            type="button"

            size={size}

            className={styles.input}

            data-disabled={pickerDisabled || undefined}

            data-error={error || undefined}

            pointer

            disabled={pickerDisabled}

            onClick={() => !pickerDisabled && toggle()}

            rightSection={
              value && !pickerDisabled ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={handleClear}
                  aria-label="Xóa lựa chọn"
                >
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }

          >

            {displayValue || (

              <Text span c="dimmed" size={size}>

                {catalogLoading ? 'Đang tải nhóm môn...' : placeholder}

              </Text>

            )}

          </InputBase>

        </Popover.Target>



        <Popover.Dropdown className={styles.dropdown} p={0}>

          <Box className={styles.search}>

            <TextInput

              size="xs"

              placeholder={searchPlaceholder}

              leftSection={<IconSearch size={14} />}

              value={search}

              onChange={(e) => setSearch(e.currentTarget.value)}

            />

          </Box>

          <Box className={styles.panels}>

            <ScrollArea className={styles.categories} type="auto" offsetScrollbars>

              {groups.map((group) => (

                <UnstyledButton

                  key={group.category}

                  className={styles.categoryRow}

                  data-active={activeGroup?.category === group.category}

                  onClick={() => {

                    setActiveCategory(group.category);

                    setSearch('');

                  }}

                >

                  <Text size="sm" lineClamp={2} style={{ flex: 1 }}>

                    {group.label}

                  </Text>

                  <IconChevronRight size={14} style={{ flexShrink: 0, opacity: 0.5 }} />

                </UnstyledButton>

              ))}

            </ScrollArea>



            <ScrollArea className={styles.subjects} type="auto" offsetScrollbars>

              {filteredSubjects.length === 0 ? (

                <Text className={styles.emptyPanel}>

                  {catalogLoading ? 'Đang tải...' : 'Không có môn phù hợp'}

                </Text>

              ) : (

                filteredSubjects.map((subject) => (

                  <UnstyledButton

                    key={subject.id}

                    className={styles.subjectRow}

                    data-selected={value === subject.id}

                    onClick={() => handlePick(subject.id)}

                  >

                    <Box>

                      <Text size="sm" fw={value === subject.id ? 600 : 400}>

                        {subject.name}
                        {typeof subject.semester === 'number' && subject.semester > 0
                          ? ` (Kỳ ${subject.semester})`
                          : ''}

                      </Text>

                      {subject.code ? (

                        <Text size="xs" c="dimmed">

                          {subject.code}

                          {subject.credits ? ` · ${subject.credits} TC` : ''}

                        </Text>

                      ) : null}

                    </Box>

                  </UnstyledButton>

                ))

              )}

            </ScrollArea>

          </Box>

        </Popover.Dropdown>

      </Popover>

    </InputWrapper>

  );

}


