interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// Barra de paginação genérica: "1–10 de 42" + botões Anterior/Próxima.
// Some sozinha quando só tem uma página (nada pra navegar).
export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span className="hint">
        {from}–{to} de {total}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="btn"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="Primeira página"
        >
          «
        </button>
        <button
          type="button"
          className="btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <span className="hint">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          className="btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
        <button
          type="button"
          className="btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Última página"
        >
          »
        </button>
      </div>
    </div>
  );
}
