export type PaginatedList<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  total_pages: number;
};

export type PaginationQuery = {
  limit: number;
  offset: number;
  page: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;

export function parsePaginationQuery(
  query: Record<string, unknown>,
  opts?: { defaultLimit?: number; maxLimit?: number }
): PaginationQuery {
  const defaultLimit = opts?.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = opts?.maxLimit ?? MAX_LIMIT;
  const rawLimit = Number(query.limit);
  const rawOffset = Number(query.offset);
  const rawPage = Number(query.page);

  let limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : defaultLimit;
  limit = Math.min(Math.max(1, limit), maxLimit);

  let offset = 0;
  if (Number.isFinite(rawOffset) && rawOffset >= 0) {
    offset = Math.floor(rawOffset);
  } else if (Number.isFinite(rawPage) && rawPage > 0) {
    offset = (Math.floor(rawPage) - 1) * limit;
  }

  const page = Math.floor(offset / limit) + 1;
  return { limit, offset, page };
}

export function buildPaginatedList<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedList<T> {
  const safeLimit = Math.max(1, limit);
  const page = Math.floor(offset / safeLimit) + 1;
  const total_pages = total > 0 ? Math.ceil(total / safeLimit) : 1;
  return {
    items,
    total,
    limit: safeLimit,
    offset,
    page,
    total_pages,
  };
}
