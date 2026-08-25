import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { centsToBRL, formatDateTime } from '../lib/format';
import { Order, OrderStatus, Paginated } from '../types';
import { Pagination } from './Pagination';
import { StatusStamp } from './StatusStamp';

const FILTERS: { label: string; value: OrderStatus | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Sucesso', value: 'APPROVED' },
  { label: 'Falha', value: 'DENIED' },
  { label: 'Expirado', value: 'EXPIRED' },
  { label: 'Cancelado', value: 'CANCELLED' },
];

const PAGE_SIZE = 10;

export function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Paginated<Order>>('/checkout/orders', {
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setOrders(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status, page]);

  // sempre que troca o filtro, volta pra primeira página
  function handleFilterChange(next: OrderStatus | '') {
    setStatus(next);
    setPage(1);
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Transações</div>
          <div className="page-sub">Pedidos locais, conciliados com o gateway via webhook</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`tab ${status === f.value ? 'active' : ''}`}
            onClick={() => handleFilterChange(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Carregando…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">Nenhum pedido para este filtro.</div>
        ) : (
          <>
            <table className="ledger">
              <thead>
                <tr>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Status</th>
                  <th>Referência externa</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className={`ledger-tick ${order.status.toLowerCase()}`} data-label="Valor">
                      {centsToBRL(order.amountCents)}
                    </td>
                    <td data-label="Método">{order.method === 'PIX' ? 'Pix' : 'Cartão'}</td>
                    <td data-label="Status">
                      <StatusStamp status={order.status} />
                    </td>
                    <td className="mono" data-label="Referência externa">{order.externalReference}</td>
                    <td className="mono" data-label="Criado em">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
