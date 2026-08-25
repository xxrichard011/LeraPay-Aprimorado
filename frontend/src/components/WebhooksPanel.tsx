import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';

type WebhookStatus = { registered: boolean; url: string; events: string[]; secret?: string; note?: string };

export function WebhooksPanel() {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  async function checkStatus() {
    setChecking(true);
    setError(null);
    try {
      const data = await api.get<WebhookStatus>('/webhooks/register');
      setStatus(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao consultar o gateway.');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function handleRegister() {
    setError(null);
    setRegistering(true);
    try {
      const data = await api.post<WebhookStatus>('/webhooks/register');
      setStatus(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar o webhook.');
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Notificações (webhooks)</div>
          <div className="page-sub">
            Receba a confirmação definitiva de pagamentos e saques em tempo real
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-title">Endpoint cadastrado no gateway</div>
        <p className="hint" style={{ marginBottom: 14 }}>
          Registra a URL pública desta aplicação no gateway Lera Box para os eventos de Pix,
          cartão e saque. É preciso que <span className="mono">PUBLIC_BASE_URL</span> no backend
          esteja acessível pela internet (ou use um túnel como ngrok em desenvolvimento).
        </p>

        {checking ? (
          <div className="empty-state">Consultando o gateway…</div>
        ) : status?.registered ? (
          <div>
            <div className="stat-label">URL cadastrada</div>
            <div className="mono" style={{ marginBottom: 10 }}>
              {status.url}
            </div>
            <div className="stat-label">Eventos</div>
            <div style={{ marginBottom: 14 }}>{status.events.join(', ')}</div>
            <button className="btn" onClick={handleRegister} disabled={registering}>
              {registering ? 'Recadastrando…' : 'Recadastrar'}
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleRegister} disabled={registering}>
            {registering ? 'Cadastrando…' : 'Cadastrar webhook'}
          </button>
        )}

        {status?.secret && (
          <div style={{ marginTop: 18 }}>
            <div className="stat-label">Secret retornado pelo gateway</div>
            <div className="emv-code">{status.secret}</div>
            <p className="hint">
              Copie este valor para <span className="mono">LERA_BOX_WEBHOOK_SECRET</span> no .env
              do backend e reinicie a aplicação, para que a assinatura dos webhooks recebidos seja
              validada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}