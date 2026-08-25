import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { formatDateTime } from '../lib/format';
import { Paginated, WalletBalance, WalletStatementItem } from '../types';
import { Pagination } from './Pagination';
import { StatusStamp } from './StatusStamp';

//  Rótulo em pt-br para o tipo de transação do extrato do gateway
const TYPE_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  WITHDRAWAL: 'Saque',
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

const PAGE_SIZE = 10;

export function WalletPanel() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [statement, setStatement] = useState<WalletStatementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [balanceData, statementData] = await Promise.all([
        api.get<WalletBalance>('/wallet/balance'),
        api.get<Paginated<WalletStatementItem>>('/wallet/statement', {
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
      ]);
      setBalance(balanceData);
      setStatement(statementData.items);
      setTotal(statementData.total);
      setTotalPages(statementData.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar a carteira.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, typeFilter, page]);

  // sempre que troca algum filtro, volta pra primeira página
  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }
  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Carteira</div>
          <div className="page-sub">Saldo e extrato consolidado do gateway</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">Saldo disponível</div>
          <div className="stat-value">{balance ? balance.balanceFormatted : '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Extrato</div>
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)}>
              <option value="">Todos</option>
              <option value="APPROVED">Sucesso</option>
              <option value="DENIED">Falha</option>
              <option value="EXPIRED">Expirado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Tipo</label>
            <select value={typeFilter} onChange={(e) => handleTypeChange(e.target.value)}>
              <option value="">Todos</option>
              <option value="PIX">Pix</option>
              <option value="CARD">Cartão</option>
              <option value="WITHDRAWAL">Saque</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Carregando…</div>
        ) : statement.length === 0 ? (
          <div className="empty-state">Nenhuma transação encontrada para este filtro.</div>
        ) : (
          <>
            <table className="ledger">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Taxa</th>
                  <th>Valor disponível</th>
                  <th>Status</th>
                  <th>Referência</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {statement.map((tx) => (
                  <tr key={tx.id}>
                    <td data-label="Tipo">{typeLabel(tx.type)}</td>
                    <td data-label="Valor">{tx.amountFormatted}</td>
                    <td className="mono" data-label="Taxa">{tx.feePercent !== null ? `${tx.feePercent}%` : '—'}</td>
                    <td className="mono" data-label="Valor disponível">
                      {tx.source === 'local' ? 'R$ 0,00 (não movimentou saldo)' : tx.netAmountFormatted}
                    </td>
                    <td data-label="Status">
                      <StatusStamp status={tx.status} />
                      {tx.source === 'local' && (
                        <div className="hint" style={{ marginTop: 2 }}>
                          não enviado ao gateway
                        </div>
                      )}
                    </td>
                    <td className="mono" data-label="Referência">{tx.externalReference ?? '—'}</td>
                    <td className="mono" data-label="Data">{formatDateTime(tx.createdAt)}</td>
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
