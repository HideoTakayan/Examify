import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconDatabase, IconSearch } from '@tabler/icons-react';
import questionBankApi, { type QuestionBankItem } from '@/services/questionBankApi';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';


const DIFFICULTY_COLORS = { DE: 'green', TRUNGBINH: 'yellow', KHO: 'red' } as const;

export type BankPickTarget = {
  question_bank_id: string;
  content: string;
  question_type: 'mcq' | 'essay';
  points: number;
  options: Record<string, string> | null;
  correct_answer: string | string[] | null;
  difficulty?: QuestionBankItem['difficulty'];
  chapter?: number | null;
  answer_hint?: string | null;
};

type Props = {
  subjectId: string | null;
  subjectLabel?: string;
  versionCode: string;
  alreadyLinkedBankIds: Set<string>;
  onAddQuestions: (items: BankPickTarget[]) => void;
};

export default function ExamQuestionBankPicker({
  subjectId,
  subjectLabel,
  versionCode,
  alreadyLinkedBankIds,
  onAddQuestions,
}: Props) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchBank = useCallback(async () => {
    if (!subjectId) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const data = await questionBankApi.list({
        subject_id: subjectId,
        search: search || undefined,
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [subjectId, search, page, pageSize]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [subjectId, search]);

  useEffect(() => {
    void fetchBank();
  }, [fetchBank]);

  const selectableItems = useMemo(
    () => items.filter((item) => !alreadyLinkedBankIds.has(item.id)),
    [items, alreadyLinkedBankIds]
  );

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    if (selected.size === selectableItems.length && selectableItems.length > 0) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableItems.map((i) => i.id)));
  };

  const handlePageChange = (nextPage: number) => {
    setSelected(new Set());
    setPage(nextPage);
  };

  const handleSearchApply = () => {
    setSearch(searchInput.trim());
  };

  const handleAdd = () => {
    const picked = items.filter((i) => selected.has(i.id));
    if (!picked.length) return;
    onAddQuestions(
      picked.map((item) => ({
        question_bank_id: item.id,
        content: item.content,
        question_type: item.question_type,
        points: item.points,
        options: item.options,
        correct_answer: item.correct_answer,
        difficulty: item.difficulty,
        chapter: item.chapter,
        answer_hint: item.answer_hint,
      }))
    );
    setSelected(new Set());
  };

  if (!subjectId) return null;

  return (
    <Box
      style={{
        borderRadius: 8,
        border: '1px solid var(--mantine-color-gray-3)',
        overflow: 'hidden',
      }}
    >
      <Box
        style={{
          background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
          padding: '10px 16px',
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <IconDatabase size={14} color="white" />
            <Text size="sm" fw={600} c="white">
              {t('exam_authoring.question_bank_title')}
            </Text>
            {subjectLabel && (
              <Badge size="xs" variant="white" color="orange">
                {subjectLabel}
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Badge size="xs" variant="white" color="orange">
              {total} {t('exam_authoring.questions')}
            </Badge>
            {collapsed ? <IconChevronDown size={14} color="white" /> : <IconChevronUp size={14} color="white" />}
          </Group>
        </Group>
      </Box>

      <Collapse in={!collapsed}>
        <Stack gap="xs" p="sm">
          <Text size="xs" c="dimmed">
            {t('exam_authoring.question_bank_hint', { code: versionCode })}
          </Text>

          {loading ? (
            <Loader size="sm" />
          ) : total === 0 ? (
            <Stack gap="xs" align="flex-start">
              <Text size="sm" c="dimmed">
                {t('exam_authoring.question_bank_empty')}
              </Text>
              <Button component={Link} to="/question-bank" size="xs" variant="light" color="orange">
                {t('exam_authoring.question_bank_go_manage')}
              </Button>
            </Stack>
          ) : (
            <>
              <Group gap="xs">
                <TextInput
                  flex={1}
                  size="xs"
                  placeholder={t('exam_authoring.question_bank_search')}
                  leftSection={<IconSearch size={14} />}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchApply();
                  }}
                />
                <Button size="xs" variant="light" onClick={handleSearchApply}>
                  {t('question_bank.filter')}
                </Button>
              </Group>

              <ListPaginationBar
                page={page}
                total={total}
                limit={pageSize}
                onPageChange={handlePageChange}
                onLimitChange={(next) => {
                  setPageSize(next);
                  setPage(1);
                }}
                size="xs"
                bordered
              />

              {selectableItems.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {items.length === 0
                    ? t('pagination.empty')
                    : t('exam_authoring.question_bank_all_added')}
                </Text>
              ) : (
                <>
                  <Group justify="space-between">
                    <Checkbox
                      size="xs"
                      label={t('pagination.select_all_page')}
                      checked={
                        selectableItems.length > 0 &&
                        selected.size === selectableItems.length
                      }
                      indeterminate={
                        selected.size > 0 && selected.size < selectableItems.length
                      }
                      onChange={toggleAllOnPage}
                    />
                    <Text size="xs" c="dimmed">
                      {t('exam_authoring.question_bank_selected', { count: selected.size })}
                    </Text>
                  </Group>
                  <ScrollArea h={220} offsetScrollbars>
                    <Stack gap={6}>
                      {selectableItems.map((item) => (
                        <Box
                          key={item.id}
                          p={8}
                          style={{
                            border: '1px solid var(--mantine-color-gray-3)',
                            borderRadius: 6,
                          }}
                        >
                          <Group align="flex-start" wrap="nowrap" gap="xs">
                            <Checkbox
                              size="xs"
                              mt={2}
                              checked={selected.has(item.id)}
                              onChange={() => toggleOne(item.id)}
                            />
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Text size="xs" lineClamp={2}>
                                {item.content}
                              </Text>
                              <Group gap={6} mt={4}>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={item.question_type === 'mcq' ? 'blue' : 'violet'}
                                >
                                  {item.question_type === 'mcq'
                                    ? t('exam_authoring.mcq')
                                    : t('exam_authoring.essay')}
                                </Badge>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={DIFFICULTY_COLORS[item.difficulty]}
                                >
                                  {item.points} {t('exam_authoring.points')}
                                </Badge>
                              </Group>
                            </Box>
                          </Group>
                        </Box>
                      ))}
                    </Stack>
                  </ScrollArea>
                  <Button
                    size="xs"
                    color="orange"
                    disabled={selected.size === 0}
                    onClick={handleAdd}
                  >
                    {t('exam_authoring.question_bank_add_btn', {
                      count: selected.size,
                      code: versionCode,
                    })}
                  </Button>
                </>
              )}
            </>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
