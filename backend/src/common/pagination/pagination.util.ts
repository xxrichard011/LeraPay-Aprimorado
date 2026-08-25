// Formato padrão de resposta paginada, usado por todas as listas da API
// (orders, links, extrato da carteira).
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* Pagina um array que já está inteiro em memória (usado no extrato da carteira,
   já que ali os dados vêm de duas fontes diferentes - gateway + local - e
   precisam ser mesclados e ordenados antes de poder paginar). */
export function paginateArray<T>(all: T[], page = 1, pageSize = 10): PaginatedResult<T> {
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const items = all.slice(start, start + pageSize);
  return { items, total, page: safePage, pageSize, totalPages };
}

// Monta a resposta paginada a partir de um [items, total] que já veio
// paginado do banco (via findAndCount do TypeORM, por exemplo).
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
