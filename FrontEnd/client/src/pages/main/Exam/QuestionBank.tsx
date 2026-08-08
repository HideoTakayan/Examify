import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Title, Text, Loader, Paper, Group, Stack, Button, TextInput, Select,
  Badge, Table, ActionIcon, Modal, Textarea, NumberInput, SegmentedControl,
  Tooltip, Alert, FileInput, Checkbox,
} from '@mantine/core';
import {
  IconSearch, IconTrash, IconEdit, IconFilter, IconFileWord,
} from '@tabler/icons-react';
import apiClient from '@/services/apiClient';
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import examApi, { type ExamImportPreview, type ImportedQuestionDraft } from '@/services/examApi';
import { useSubjectPickerCatalog } from '@/hooks/useSubjectPickerCatalog';
import type { SubjectDto } from '@/services/subjectApi';
import questionBankApi from '@/services/questionBankApi';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset, clampPage } from '@/utils/pagination';
import ExamImportPreviewModal from '@/components/ExamVerifyModal/ExamImportPreviewModal';
import SubjectCategoryPicker from '@/components/Input/SubjectCategoryPicker/SubjectCategoryPicker';

type QBDifficulty = 'DE' | 'TRUNGBINH' | 'KHO';
type QuestionType = 'mcq' | 'essay';

interface QBItem {
  id: string;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  correct_answer: string | string[] | null;
  points: number;
  difficulty: QBDifficulty;
  chapter: number | null;
  subject_id: string | null;
  tags: string[];
  usage_count: number;
  created_at: string;
}

interface QBFilter {
  search?: string;
  question_type?: QuestionType;
  difficulty?: QBDifficulty;
  subject_id?: string;
  chapter?: number;
}

const DIFFICULTY_COLORS: Record<QBDifficulty, string> = {
  DE: 'green',
  TRUNGBINH: 'yellow',
  KHO: 'red',
};

const DIFFICULTY_LABELS: Record<QBDifficulty, string> = {
  DE: 'Dễ',
  TRUNGBINH: 'Trung bình',
  KHO: 'Khó',
};

const SUBJECT_LABEL_MAX_LEN = 30;

function truncateWithEllipsis(text: string, maxLen: number): { display: string; truncated: boolean } {
  if (text.length <= maxLen) return { display: text, truncated: false };
  return { display: `${text.slice(0, maxLen)}…`, truncated: true };
}

const QuestionBankPage = () => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [items, setItems] = useState<QBItem[]>([]);
  const { subjects, loading: catalogLoading } = useSubjectPickerCatalog();
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<QBFilter>({});
  const [search, setSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QBItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ExamImportPreview | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSubjectId, setImportSubjectId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const pageItemIds = useMemo(() => items.map((i) => i.id), [items]);

  const subjectById = useMemo(() => {
    const map = new Map<string, SubjectDto>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const formatSubjectLabel = (subjectId: string | null) => {
    if (!subjectId) return '—';
    const s = subjectById.get(subjectId);
    if (!s) return '—';
    return s.code ? `${s.code} — ${s.name}` : s.name;
  };

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handlePageChange = useCallback((next: number) => {
    clearSelection();
    setPage(next);
  }, [clearSelection]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    if (pageItemIds.length === 0) return;
    if (selectedIds.size === pageItemIds.length) {
      clearSelection();
      return;
    }
    setSelectedIds(new Set(pageItemIds));
  };

  const allOnPageSelected =
    pageItemIds.length > 0 && selectedIds.size === pageItemIds.length;
  const someOnPageSelected =
    selectedIds.size > 0 && selectedIds.size < pageItemIds.length;

  const fetchItems = useCallback(async (f: QBFilter, p: number, limit: number) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await questionBankApi.list({
        limit,
        offset: pageToOffset(p, limit),
        search: f.search,
        question_type: f.question_type,
        difficulty: f.difficulty,
        subject_id: f.subject_id,
        chapter: f.chapter,
      });
      setItems(data.items as QBItem[]);
      setTotal(data.total);
      if (data.items.length === 0 && data.total > 0 && p > 1) {
        setPage(clampPage(p - 1, data.total, limit));
      }
    } catch {
      setError(t('question_bank.error_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    void fetchItems(filter, page, pageSize);
  }, [filter, page, pageSize, fetchItems]);

  useEffect(() => {
    if (subjects.length > 0) {
      setImportSubjectId((prev) => prev ?? subjects[0]?.id ?? null);
    }
  }, [subjects]);

  const handleSearch = () => {
    clearSelection();
    setPage(1);
    setFilter(prev => ({ ...prev, search: search || undefined }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('question_bank.confirm_delete'))) return;
    try {
      await questionBankApi.remove(id);
      setNotice(t('question_bank.notice_deleted'));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      void fetchItems(filter, page, pageSize);
    } catch {
      setError(t('question_bank.error_delete_failed'));
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(t('question_bank.confirm_bulk_delete', { count: ids.length }))) return;
    setBulkDeleting(true);
    setError('');
    try {
      const { deleted, failed } = await questionBankApi.bulkRemove(ids);
      clearSelection();
      if (failed > 0) {
        setError(t('question_bank.error_bulk_delete_partial', { deleted, failed }));
      } else {
        setNotice(t('question_bank.notice_bulk_deleted', { count: deleted }));
      }
      void fetchItems(filter, page, pageSize);
    } catch {
      setError(t('question_bank.error_delete_failed'));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCreate = async (data: Partial<QBItem>) => {
    try {
      await apiClient.post('/question-bank', data, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCreateModalOpen(false);
      setNotice(t('question_bank.notice_created'));
      void fetchItems(filter, page, pageSize);
    } catch {
      setError(t('question_bank.error_create_failed'));
    }
  };

  const handleUpdate = async (id: string, data: Partial<QBItem>) => {
    try {
      await apiClient.patch(`/question-bank/${id}`, data, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setEditModalOpen(false);
      setNotice(t('question_bank.notice_updated'));
      void fetchItems(filter, page, pageSize);
    } catch {
      setError(t('question_bank.error_update_failed'));
    }
  };

  const handlePreviewImport = async () => {
    if (!importFile) {
      setError(t('question_bank.error_select_file'));
      return;
    }
    try {
      setError('');
      const preview = await examApi.previewWordImport(importFile);
      setImportPreview(preview);
      setImportModalOpen(true);
    } catch {
      setError(t('question_bank.error_read_file'));
    }
  };

  const handleBulkImportConfirm = async (questions: ImportedQuestionDraft[]) => {
    if (!importSubjectId) {
      setError(t('question_bank.error_select_subject'));
      return;
    }

    setImporting(true);
    setError('');
    try {
      for (const q of questions) {
        await apiClient.post('/question-bank', {
          content: q.content,
          question_type: q.question_type,
          points: q.points,
          options: q.options ?? null,
          correct_answer: q.correct_answer ?? null,
          difficulty: q.difficulty ?? 'TRUNGBINH',
          chapter: q.chapter ?? null,
          tags: [],
          subject_id: importSubjectId,
          answer_hint: q.answer_hint ?? null,
          explanation: q.review_reason ?? null,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      setImportModalOpen(false);
      setImportPreview(null);
      setImportFile(null);
      setNotice(t('question_bank.notice_bulk_imported', { count: questions.length }));
      void fetchItems(filter, page, pageSize);
    } catch {
      setError(t('question_bank.error_bulk_import_failed'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t('question_bank.title')}</Title>
          <Group>
            <ButtonFilled
              label={t('question_bank.create_question')}
              disabled={false}
              onClick={() => setCreateModalOpen(true)}
            />
          </Group>
        </Group>

        {(error || notice) && (
          <Alert color={error ? 'red' : 'green'} variant="light">
            {error || notice}
          </Alert>
        )}

        <Paper withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text fw={600}>{t('question_bank.bulk_import_title')}</Text>
            <Group grow align="flex-start">
              <SubjectCategoryPicker
                label={t('question_bank.subject')}
                size="sm"
                subjects={subjects}
                placeholder={
                  loading || catalogLoading
                    ? t('exam_authoring.loading')
                    : t('question_bank.select_subject')
                }
                disabled={loading || catalogLoading || subjects.length === 0}
                catalogLoading={catalogLoading}
                value={importSubjectId}
                onChange={setImportSubjectId}
                required
              />
              <FileInput
                label={t('question_bank.docx_file')}
                placeholder={t('question_bank.select_word_file')}
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                value={importFile}
                onChange={setImportFile}
                leftSection={<IconFileWord size={14} />}
              />
            </Group>
            <Group justify="flex-end">
              <Button
                variant="light"
                leftSection={<IconFileWord size={14} />}
                onClick={() => void handlePreviewImport()}
                disabled={!importFile || !importSubjectId || importing}
                loading={importing}
              >
                {t('question_bank.preview_import')}
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Filters */}
        <Paper withBorder radius="md" p="md">
          <Group gap="sm" wrap="wrap" align="flex-end">
            <SubjectCategoryPicker
              label={t('question_bank.subject')}
              size="sm"
              subjects={subjects}
              placeholder={t('question_bank.select_subject')}
              disabled={loading || catalogLoading || subjects.length === 0}
              catalogLoading={catalogLoading}
              value={filter.subject_id ?? null}
              onChange={(id) => {
                clearSelection();
                setFilter((prev) => ({ ...prev, subject_id: id ?? undefined }));
                setPage(1);
              }}
            />
            <TextInput
              placeholder={t('question_bank.search_placeholder')}
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Select
              placeholder={t('question_bank.type_placeholder')}
              data={[
                { value: 'mcq', label: t('question_bank.type_mcq') },
                { value: 'essay', label: t('question_bank.type_essay') },
              ]}
              clearable
              value={filter.question_type}
              onChange={v => { clearSelection(); setFilter(prev => ({ ...prev, question_type: v as QuestionType || undefined })); setPage(1); }}
              w={140}
            />
            <Select
              placeholder={t('question_bank.difficulty_placeholder')}
              data={[
                { value: 'DE', label: t('question_bank.difficulty_easy') },
                { value: 'TRUNGBINH', label: t('question_bank.difficulty_medium') },
                { value: 'KHO', label: t('question_bank.difficulty_hard') },
              ]}
              clearable
              value={filter.difficulty}
              onChange={v => { clearSelection(); setFilter(prev => ({ ...prev, difficulty: v as QBDifficulty || undefined })); setPage(1); }}
              w={140}
            />
            <Button onClick={handleSearch} leftSection={<IconFilter size={14} />}>
              {t('question_bank.filter')}
            </Button>
          </Group>
        </Paper>

        {loading ? (
          <Loader />
        ) : (
          <Paper withBorder radius="md">
            <ListPaginationBar
              page={page}
              total={total}
              limit={pageSize}
              onPageChange={handlePageChange}
              onLimitChange={(next) => {
                clearSelection();
                setPageSize(next);
                setPage(1);
              }}
            />
            {selectedIds.size > 0 && (
              <Group
                px="md"
                py="xs"
                mb="md"
                gap="sm"
                wrap="wrap"
                style={{
                  borderBottom: '1px solid var(--mantine-color-gray-3)',
                  background: 'var(--mantine-color-blue-0)',
                }}
              >
                <Text size="sm" fw={600}>
                  {t('question_bank.selected_count', { count: selectedIds.size })}
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  loading={bulkDeleting}
                  onClick={() => void handleBulkDelete()}
                >
                  {t('question_bank.bulk_delete')}
                </Button>
                <Button size="xs" variant="subtle" onClick={clearSelection}>
                  {t('common.cancel')}
                </Button>
              </Group>
            )}
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}>
                    <Checkbox
                      size="xs"
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label={t('pagination.select_all_page')}
                    />
                  </Table.Th>
                  <Table.Th>#</Table.Th>
                  <Table.Th>{t('question_bank.col_content')}</Table.Th>
                  <Table.Th>{t('question_bank.col_type')}</Table.Th>
                  <Table.Th>{t('question_bank.col_difficulty')}</Table.Th>
                  <Table.Th>{t('question_bank.col_subject')}</Table.Th>
                  <Table.Th>{t('question_bank.col_points')}</Table.Th>
                  <Table.Th>{t('question_bank.col_usage')}</Table.Th>
                  <Table.Th>{t('question_bank.col_actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item, idx) => (
                  <Table.Tr
                    key={item.id}
                    bg={selectedIds.has(item.id) ? 'var(--mantine-color-blue-0)' : undefined}
                  >
                    <Table.Td>
                      <Checkbox
                        size="xs"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        aria-label={t('question_bank.col_content')}
                      />
                    </Table.Td>
                    <Table.Td>{(page - 1) * pageSize + idx + 1}</Table.Td>
                    <Table.Td style={{ maxWidth: 400 }}>
                      <Text size="sm" lineClamp={2}>{item.content}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={item.question_type === 'mcq' ? 'blue' : 'violet'} size="sm">
                        {item.question_type === 'mcq' ? t('question_bank.type_mcq') : t('question_bank.type_essay')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={DIFFICULTY_COLORS[item.difficulty]} size="sm">
                        {DIFFICULTY_LABELS[item.difficulty]}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 220 }}>
                      {(() => {
                        const full = formatSubjectLabel(item.subject_id);
                        const { display, truncated } = truncateWithEllipsis(full, SUBJECT_LABEL_MAX_LEN);
                        const label = (
                          <Text size="sm" component="span" style={{ cursor: truncated ? 'help' : undefined }}>
                            {display}
                          </Text>
                        );
                        return truncated ? (
                          <Tooltip label={full} multiline w={320} withArrow>
                            {label}
                          </Tooltip>
                        ) : (
                          label
                        );
                      })()}
                    </Table.Td>
                    <Table.Td><Text size="sm">{item.points}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{item.usage_count}</Text></Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label={t('question_bank.action_edit')}>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => { setEditingItem(item); setEditModalOpen(true); }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('question_bank.action_delete')}>
                          <ActionIcon variant="subtle" color="red" onClick={() => void handleDelete(item.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {items.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={9}>
                      <Text c="dimmed" ta="center">{t('question_bank.empty')}</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

      </Stack>

      {/* Create Modal */}
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title={t('question_bank.create_modal_title')} size="lg">
        <QBForm
          subjects={subjects}
          catalogLoading={catalogLoading}
          onSubmit={data => void handleCreate(data)}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title={t('question_bank.edit_modal_title')} size="lg">
        {editingItem && (
          <QBForm
            initial={editingItem}
            subjects={subjects}
            catalogLoading={catalogLoading}
            onSubmit={data => void handleUpdate(editingItem.id, data)}
            onCancel={() => setEditModalOpen(false)}
          />
        )}
      </Modal>

      {importModalOpen && importPreview && (
        <ExamImportPreviewModal
          preview={importPreview}
          onConfirm={(questions) => void handleBulkImportConfirm(questions)}
          onClose={() => setImportModalOpen(false)}
        />
      )}

    </Box>
  );
};

type QBFormProps = {
  initial?: QBItem;
  subjects: SubjectDto[];
  catalogLoading?: boolean;
  onSubmit: (data: Partial<QBItem>) => void;
  onCancel: () => void;
};

function QBForm({ initial, subjects, catalogLoading, onSubmit, onCancel }: QBFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initial?.content ?? '');
  const [questionType, setQuestionType] = useState<QuestionType>(initial?.question_type ?? 'mcq');
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [difficulty, setDifficulty] = useState<QBDifficulty>(initial?.difficulty ?? 'TRUNGBINH');
  const [options, setOptions] = useState<Record<string, string>>(
    initial?.options ?? { A: '', B: '', C: '', D: '' }
  );
  const [correctAnswer, setCorrectAnswer] = useState<string>(() => {
    const raw = initial?.correct_answer;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return typeof raw[0] === 'string' ? raw[0] : '';
    return '';
  });
  const [chapter, setChapter] = useState<number | ''>(initial?.chapter ?? '');
  const [subjectId, setSubjectId] = useState<string | null>(initial?.subject_id ?? subjects[0]?.id ?? null);

  useEffect(() => {
    if (questionType !== 'mcq') {
      setCorrectAnswer('');
    }
  }, [questionType]);

  const handleSubmit = () => {
    const parsedOptions = questionType === 'mcq'
      ? Object.fromEntries(Object.entries(options).filter(([, v]) => v.trim()))
      : null;
    const parsedCorrect = questionType === 'mcq' ? correctAnswer : null;
    onSubmit({
      content,
      question_type: questionType,
      points,
      difficulty,
      subject_id: subjectId ?? undefined,
      options: parsedOptions,
      correct_answer: parsedCorrect,
      tags: [],
      chapter: chapter === '' ? undefined : Number(chapter),
    });
  };

  return (
    <Stack gap="sm">
      <Textarea
        label={t('question_bank.form_content_label')}
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        required
      />
      <SubjectCategoryPicker
        label={t('question_bank.form_subject')}
        size="sm"
        placeholder={t('question_bank.select_subject')}
        disabled={catalogLoading || subjects.length === 0}
        catalogLoading={catalogLoading}
        value={subjectId}
        onChange={setSubjectId}
        required
      />
      <Group grow>
        <Stack gap={4}>
          <Text size="sm" fw={500}>{t('question_bank.form_question_type')}</Text>
          <SegmentedControl
            value={questionType}
            onChange={v => setQuestionType(v as QuestionType)}
            data={[{ value: 'mcq', label: t('question_bank.type_mcq') }, { value: 'essay', label: t('question_bank.type_essay') }]}
          />
        </Stack>
        <NumberInput label={t('question_bank.form_points')} value={points} onChange={v => setPoints(Number(v))} min={0.5} step={0.5} />
        <Select
          label={t('question_bank.form_difficulty')}
          value={difficulty}
          onChange={v => setDifficulty((v ?? 'TRUNGBINH') as QBDifficulty)}
          data={[
            { value: 'DE', label: t('question_bank.difficulty_easy') },
            { value: 'TRUNGBINH', label: t('question_bank.difficulty_medium') },
            { value: 'KHO', label: t('question_bank.difficulty_hard') },
          ]}
        />
      </Group>
      {questionType === 'mcq' && (
        <>
          <Text size="sm" fw={600}>{t('question_bank.form_options')}</Text>
          {Object.keys(options).map(key => (
            <Group key={key} gap="xs">
              <Badge w={24} ta="center">{key}</Badge>
              <TextInput
                flex={1}
                value={options[key]}
                onChange={e => setOptions(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={t('question_bank.form_option_placeholder', { key })}
              />
            </Group>
          ))}
          <Select
            label={t('question_bank.form_correct_answer')}
            value={correctAnswer}
            onChange={v => setCorrectAnswer(v ?? '')}
            data={Object.keys(options).filter(k => options[k].trim())}
          />
        </>
      )}
      <NumberInput label={t('question_bank.form_chapter')} value={chapter} onChange={v => setChapter(v === '' ? '' : Number(v))} min={1} />
      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={handleSubmit} color="teal">{t('common.save')}</Button>
      </Group>
    </Stack>
  );
}

export default QuestionBankPage;