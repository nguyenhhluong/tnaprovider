export function parsePagination(query, defaults = {}) {
  const {
    page = 1,
    pageSize = 25,
    maxPageSize = 100,
    sort = 'created_at',
    order = 'desc',
    allowedSortColumns = [],
  } = defaults;

  const p = Math.max(parseInt(query.page, 10) || page, 1);
  const ps = Math.min(Math.max(parseInt(query.pageSize, 10) || pageSize, 1), maxPageSize);
  const s = query.sort || sort;
  const sortColumn = allowedSortColumns.length > 0 && !allowedSortColumns.includes(s) ? sort : s;
  const o = query.order === 'asc' ? 'asc' : (query.order === 'desc' ? 'desc' : order);
  const offset = (p - 1) * ps;

  return { page: p, pageSize: ps, sort: sortColumn, order: o, offset };
}

export function paginatedResponse(data, total, pagination) {
  return {
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}

export function paginatedQuery(db, baseQuery, countQuery, params, pagination) {
  const countRow = db.prepare(countQuery).get(...params);
  const total = countRow ? (countRow.cnt ?? countRow.count ?? 0) : 0;

  const rows = db.prepare(`${baseQuery} LIMIT ? OFFSET ?`).all(...params, pagination.pageSize, pagination.offset);

  const totalPages = Math.ceil(total / pagination.pageSize);

  return {
    rows,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
    },
  };
}
