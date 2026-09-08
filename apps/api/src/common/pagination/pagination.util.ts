export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export function getPaginationOffset(page?: number, limit?: number, offset?: number) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safeOffset = Math.max(0, Number(offset) || 0);

  let safePage: number;
  if (typeof page === 'number' && !Number.isNaN(page) && page > 0) {
    safePage = page;
  } else if (offset !== undefined) {
    safePage = Math.floor(safeOffset / safeLimit) + 1;
  } else {
    safePage = 1;
  }

  const skip = (safePage - 1) * safeLimit;

  return { page: safePage, limit: safeLimit, skip };
}

export function createPaginatedResponse<T>(
  data: T[],
  totalRecords: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return {
    data,
    meta: {
      page,
      limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
