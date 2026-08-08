import { useEffect, useState } from 'react';
import { Box, Group, NumberInput, Pagination, Select, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { calcTotalPages, clampPage, pageItemRange, PAGE_SIZE_OPTIONS } from '@/utils/pagination';

type Props = {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  /** Hiện dropdown đổi số dòng / trang */
  showPageSize?: boolean;
  alwaysShowSummary?: boolean;
  size?: 'xs' | 'sm' | 'md';
  /** Viền dưới khi đặt phía trên bảng */
  bordered?: boolean;
};

export default function ListPaginationBar({
  page,
  total,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  showPageSize = true,
  alwaysShowSummary = true,
  size = 'sm',
  bordered = true,
}: Props) {
  const { t } = useTranslation();
  const totalPages = calcTotalPages(total, limit);
  const range = pageItemRange(page, limit, total);
  const [jumpPage, setJumpPage] = useState(String(page));

  useEffect(() => {
    setJumpPage(String(page));
  }, [page]);

  if (total <= 0 && !alwaysShowSummary) return null;

  const applyJump = () => {
    const parsed = Number.parseInt(jumpPage, 10);
    const next = Number.isFinite(parsed) ? clampPage(parsed, total, limit) : page;
    onPageChange(next);
    setJumpPage(String(next));
  };

  const pageSizeData = pageSizeOptions.map((n) => ({
    value: String(n),
    label: t('pagination.page_size_option', {
      size: n,
      defaultValue: `${n}/page`,
    }),
  }));

  return (
    <Box
      py="xs"
      px="sm"
      style={bordered ? { borderBottom: '1px solid var(--mantine-color-gray-3)' } : undefined}
    >
      <Group justify="space-between" wrap="wrap" gap="sm" align="center">
        <Group gap="sm" wrap="wrap" align="center">
          {showPageSize && onLimitChange && (
            <Select
              size={size}
              w={108}
              aria-label={t('pagination.page_size_label')}
              data={pageSizeData}
              value={String(limit)}
              allowDeselect={false}
              onChange={(v) => {
                if (!v) return;
                const next = Number(v);
                onLimitChange(next);
                onPageChange(1);
              }}
            />
          )}
          <Text size={size} fw={500}>
            {t('pagination.total_count', { total })}
          </Text>
          {total > 0 && (
            <Text size="xs" c="dimmed">
              {t('pagination.showing_range', { from: range.from, to: range.to, total: range.total })}
            </Text>
          )}
          {total <= 0 && (
            <Text size="xs" c="dimmed">
              {t('pagination.empty')}
            </Text>
          )}
        </Group>

        <Group gap="xs" wrap="wrap" align="center">
          {totalPages > 0 && (
            <>
              <Text size={size} c="dimmed">
                {t('pagination.go_to')}
              </Text>
              <NumberInput
                size={size}
                w={64}
                min={1}
                max={totalPages}
                hideControls
                value={jumpPage}
                onChange={(v) => setJumpPage(v === '' ? '' : String(v))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyJump();
                }}
                onBlur={applyJump}
              />
              <Text size={size} c="dimmed">
                {t('pagination.page_label')}
              </Text>
            </>
          )}
          {totalPages > 1 && (
            <Pagination
              total={totalPages}
              value={page}
              onChange={onPageChange}
              size={size}
              siblings={1}
              boundaries={1}
            />
          )}
        </Group>
      </Group>
    </Box>
  );
}
