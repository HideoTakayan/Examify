export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type PaginationMeta = {
  total: number;
  limit: number;
  offset: number;
  page: number;
  total_pages: number;
};

export type PaginatedList<T> = PaginationMeta & {
  items: T[];
};

/** Chuẩn hóa `data` từ API list — hỗ trợ cả mảng thuần (legacy) và `{ items, total, … }` */
export function unwrapPaginatedData<T>(data: unknown): PaginatedList<T> {
  if (Array.isArray(data)) {
    const items = data as T[];
    return {
      items,
      ...buildPaginationMeta(items.length, items.length || 1, 0),
    };
  }
  const body = data as Partial<PaginatedList<T>> & { items?: T[] };
  const items = body.items ?? [];
  const total = body.total ?? items.length;
  const limit = body.limit ?? (items.length || DEFAULT_PAGE_SIZE);
  const offset = body.offset ?? 0;
  return {
    items,
    total,
    limit,
    offset,
    page: body.page ?? Math.floor(offset / Math.max(1, limit)) + 1,
    total_pages: body.total_pages ?? calcTotalPages(total, limit),
  };
}

export function pageToOffset(page: number, limit = DEFAULT_PAGE_SIZE): number {
  return Math.max(0, (Math.max(1, page) - 1) * limit);
}

export function calcTotalPages(total: number, limit = DEFAULT_PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.ceil(total / limit);
}

export function buildPaginationMeta(
  total: number,
  limit: number,
  offset: number
): PaginationMeta {
  const safeLimit = Math.max(1, limit);
  const page = Math.floor(offset / safeLimit) + 1;
  return {
    total,
    limit: safeLimit,
    offset,
    page,
    total_pages: calcTotalPages(total, safeLimit),
  };
}

/** Hiển thị "21–40 / 156" — from/to là 1-based inclusive */
export function pageItemRange(
  page: number,
  limit: number,
  total: number
): { from: number; to: number; total: number } {
  if (total <= 0) return { from: 0, to: 0, total: 0 };
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, total);
  return { from, to, total };
}

export function clampPage(page: number, total: number, limit = DEFAULT_PAGE_SIZE): number {
  return Math.min(Math.max(1, page), calcTotalPages(total, limit));
}

/** Phân trang client-side (slice mảng đã load) */
export function slicePage<T>(items: T[], page: number, limit = DEFAULT_PAGE_SIZE): T[] {
  const start = pageToOffset(page, limit);
  return items.slice(start, start + limit);
}
