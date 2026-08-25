import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { centsToBRL, formatDateTime } from '../lib/format';
import { formatDocument, formatPhone, isValidDocumentLength, isValidEmail, onlyDigits } from '../lib/masks';
import { MoneyField } from './fields';
import { GatewayStatus, Withdrawal, WalletBalance } from '../types';
import { StatusStamp } from './StatusStamp';

type PixKeyType = 'DOCUMENT' | 'EMAIL' | 'PHONE';

export function WithdrawalsPanel() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isPjAccount, setIsPjAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [amountCents, setAmountCents] = useState(0);
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('DOCUMENT');
  const [pixKey, setPixKey] = useState('');
  const [requesterDocument, setRequesterDocument] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [withdrawalsData, balanceData, gatewayStatus] = await Promise.all([
        api.get<Withdrawal[]>('/withdrawals'),
        api.get<WalletBalance>('/wallet/balance'),
        api.get<GatewayStatus>('/gateway/status'),
      ]);
      setWithdrawals(withdrawalsData);
      setBalance(balanceData);
      setIsPjAccount(gatewayStatus.personType === 'PJ');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar saques.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetPixKey(type: PixKeyType) {
    setPixKeyType(type);
    setPixKey('');
  }

  // Valida o formato da chave Pix de acordo com o tipo escolhido
  function validatePixKey(): string | null {
    if (pixKeyType === 'DOCUMENT' && !isValidDocumentLength(pixKey)) {
      return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
    }
    if (pixKeyType === 'EMAIL' && !isValidEmail(pixKey)) {
      return 'Informe um e-mail válido.';
    }
    if (pixKeyType === 'PHONE' && onlyDigits(pixKey).length < 10) {
      return 'Informe um telefone válido, com DDD.';
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setError(null);

    if (amountCents <= 0) {
      setFormError('Informe um valor de saque maior que zero.');
      return;
    }
    // nao deixa pedir mais do que tem disponivel na carteira
    if (balance && amountCents > balance.balanceCents) {
      setFormError(
        `O valor do saque (${centsToBRL(amountCents)}) é maior que o saldo disponível (${balance.balanceFormatted}).`,
      );
      return;
    }
    const pixKeyError = validatePixKey();
    if (pixKeyError) {
      setFormError(pixKeyError);
      return;
    }
    if (isPjAccount && onlyDigits(requesterDocument).length !== 11) {
      setFormError('Sua conta é Pessoa Jurídica: informe o CPF (11 dígitos) do responsável pelo saque.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/withdrawals', {
        amountCents,
        pixKey,
        requesterDocument: isPjAccount ? onlyDigits(requesterDocument) : undefined,
      });
      setAmountCents(0);
      setPixKey('');
      setRequesterDocument('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao solicitar saque.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Saques</div>
          <div className="page-sub">Solicite transferências do saldo da carteira</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Novo saque</div>
          <div className="hint" style={{ marginBottom: 14 }}>
            Saldo disponível: <strong>{balance ? balance.balanceFormatted : '—'}</strong>
          </div>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleSubmit}>
            <MoneyField label="Valor" valueCents={amountCents} onChange={setAmountCents} required />
            {isPjAccount && (
              <div className="field">
                <label>CPF do responsável pelo saque</label>
                <input
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={formatDocument(requesterDocument)}
                  onChange={(e) => setRequesterDocument(onlyDigits(e.target.value).slice(0, 11))}
                  maxLength={14}
                  required
                />
              </div>
            )}
            <div className="field">
              <label>Tipo de chave Pix</label>
              <select
                value={pixKeyType}
                onChange={(e) => resetPixKey(e.target.value as PixKeyType)}
              >
                <option value="DOCUMENT">CPF ou CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Número de telefone</option>
              </select>
            </div>
            <div className="field">
              <label>Chave Pix</label>
              {pixKeyType === 'DOCUMENT' && (
                <input
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={formatDocument(pixKey)}
                  onChange={(e) => setPixKey(onlyDigits(e.target.value).slice(0, 14))}
                  maxLength={18}
                  required
                />
              )}
              {pixKeyType === 'EMAIL' && (
                <input
                  type="email"
                  placeholder="usuario@email.com"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  required
                />
              )}
              {pixKeyType === 'PHONE' && (
                <input
                  inputMode="numeric"
                  placeholder="(11) 99999-8888"
                  value={formatPhone(pixKey)}
                  onChange={(e) => setPixKey(onlyDigits(e.target.value).slice(0, 11))}
                  maxLength={15}
                  required
                />
              )}
            </div>
            <button className="btn btn-primary btn-block" disabled={submitting} type="submit">
              {submitting ? 'Solicitando…' : 'Solicitar saque'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Histórico</div>
          {loading ? (
            <div className="empty-state">Carregando…</div>
          ) : withdrawals.length === 0 ? (
            <div className="empty-state">Nenhum saque solicitado ainda.</div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className={`ledger-tick ${w.status.toLowerCase()}`} data-label="Valor">
                      {centsToBRL(w.amountCents)}
                    </td>
                    <td data-label="Status">
                      <StatusStamp status={w.status} />
                    </td>
                    <td className="mono" data-label="Data">{formatDateTime(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
