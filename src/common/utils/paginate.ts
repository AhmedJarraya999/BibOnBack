export function paginationParams(page = 1, limit = 20) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
