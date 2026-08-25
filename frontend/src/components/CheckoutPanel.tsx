import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, getAccessToken, API_BASE_URL } from '../api/client';
import { CardNumberField, DigitsField, DocumentField, MoneyField } from './fields';
import { centsToBRL, formatDateTime, toQrCodeImageSrc } from '../lib/format';
import { generateEmvQrCodeDataUrl } from '../lib/qrcode';
import { isValidDocumentLength, onlyLetters } from '../lib/masks';
import { detectCardBrand } from '../lib/cardBrand';
import { CheckoutLink, GatewayFee, Order, Paginated, PaymentMethod } from '../types';
import { Pagination } from './Pagination';
import { StatusStamp } from './StatusStamp';

export function CheckoutPanel() {
  const [links, setLinks] = useState<CheckoutLink[]>([]);
  const [linksTotal, setLinksTotal] = useState(0);
  const [linksTotalPages, setLinksTotalPages] = useState(1);
  const [linksPage, setLinksPage] = useState(1);
  const LINKS_PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [amountCents, setAmountCents] = useState(0);
  const [payerDocument, setPayerDocument] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  async function loadLinks() {
    setLoading(true);
    try {
      const data = await api.get<Paginated<CheckoutLink>>('/checkout/links', {
        page: linksPage,
        pageSize: LINKS_PAGE_SIZE,
      });
      setLinks(data.items);
      setLinksTotal(data.total);
      setLinksTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar links.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLinks();
  }, [linksPage]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidDocumentLength(payerDocument)) {
      setError('CPF/CNPJ do pagador deve ter 11 (CPF) ou 14 (CNPJ) dígitos.');
      return;
    }
    setCreating(true);
    try {
      const result = await api.post<{ link: CheckoutLink; order: Order | null }>(
        '/checkout/links',
        { method, amountCents, payerDocument, description: description || undefined },
      );
      setAmountCents(0);
      setPayerDocument('');
      setDescription('');
      setSelectedLinkId(result.link.id);
      setActiveOrder(result.order);
      if (linksPage === 1) {
        await loadLinks();
      } else {
        setLinksPage(1);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar link de checkout.');
    } finally {
      setCreating(false);
    }
  }

  async function pollSelected(id: string) {
    try {
      const data = await api.get<{ link: CheckoutLink; order: Order | null }>(
        `/checkout/links/${id}`,
      );
      setActiveOrder(data.order);
      /* Atualiza só a linha correspondente na lista sem recarregar tudo,
        pra refletir o status novo (tipo PAID/DENIED que veio do webhook) */
      setLinks((prev) => prev.map((l) => (l.id === data.link.id ? data.link : l)));
    } catch {
    }
  }

  async function openLink(link: CheckoutLink) {
    setSelectedLinkId(link.id);
    setError(null);
    try {
      const data = await api.get<{ link: CheckoutLink; order: Order | null }>(
        `/checkout/links/${link.id}`,
      );
      setActiveOrder(data.order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao consultar link.');
    }
  }

  // Enquanto o pedido selecionado ta PENDING (esperando confirmação assíncrona do gateway via webhook), 
  // fica reconsultando o link a cada 3s pra pegar o resultado (APPROVED/DENIED) sem precisa clicar de novo
  useEffect(() => {
    if (!selectedLinkId) return;
    if (!activeOrder || activeOrder.status !== 'PENDING') return;
    const interval = setInterval(() => pollSelected(selectedLinkId), 3000);
    return () => clearInterval(interval);
  }, [selectedLinkId, activeOrder?.status]);

  const selectedLink = links.find((l) => l.id === selectedLinkId) ?? null;

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Checkout</div>
          <div className="page-sub">Crie links de pagamento em Pix ou cartão</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-title">Novo link de pagamento</div>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Método</label>
                <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  <option value="PIX">Pix</option>
                  <option value="CARD">Cartão</option>
                </select>
              </div>
              <MoneyField label="Valor" valueCents={amountCents} onChange={setAmountCents} required />
              <DocumentField
                label="CPF/CNPJ do pagador"
                value={payerDocument}
                onChange={setPayerDocument}
                required
              />
              <div className="field">
                <label>Descrição (opcional)</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" disabled={creating} type="submit">
                {creating ? 'Criando…' : 'Criar link'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-title">Links criados</div>
            {loading ? (
              <div className="empty-state">Carregando…</div>
            ) : links.length === 0 ? (
              <div className="empty-state">Nenhum link criado ainda.</div>
            ) : (
              <>
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Valor</th>
                      <th>Método</th>
                      <th>Status</th>
                      <th>Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => (
                      <tr
                        key={link.id}
                        onClick={() => openLink(link)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className={`ledger-tick ${link.status.toLowerCase()}`} data-label="Valor">
                          {centsToBRL(link.amountCents)}
                        </td>
                        <td data-label="Método">{link.method === 'PIX' ? 'Pix' : 'Cartão'}</td>
                        <td data-label="Status">
                          <StatusStamp status={link.status} />
                        </td>
                        <td className="mono" data-label="Criado em">{formatDateTime(link.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  page={linksPage}
                  totalPages={linksTotalPages}
                  total={linksTotal}
                  pageSize={LINKS_PAGE_SIZE}
                  onPageChange={setLinksPage}
                />
              </>
            )}
          </div>
        </div>

        <div>
          {selectedLink ? (
            <CheckoutLinkDetail
              link={selectedLink}
              order={activeOrder}
              onPaid={() => {
                loadLinks();
                openLink(selectedLink);
              }}
            />
          ) : (
            <div className="card">
              <div className="card-title">Detalhes</div>
              <div className="empty-state">Selecione um link à esquerda para ver o QR/EMV ou pagar com cartão.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckoutLinkDetail({
  link,
  order,
  onPaid,
}: {
  link: CheckoutLink;
  order: Order | null;
  onPaid: () => void;
}) {
  // Troca o conteudo do painel de detalhe dependendo do método do link (Pix ou cartão)
  return (
    <>
      {link.method === 'PIX' ? (
        <PixDetail link={link} order={order} />
      ) : (
        <CardPaymentForm link={link} order={order} onPaid={onPaid} />
      )}
      <SendEmailBox linkId={link.id} />
      {order?.status === 'APPROVED' && <ReceiptBox orderId={order.id} />}
    </>
  );
}

function PixDetail({ link, order }: { link: CheckoutLink; order: Order | null }) {
  return (
    <div className="card">
      <div className="card-title">
        Pagamento via Pix <StatusStamp status={link.status} />
      </div>
      {order?.status === 'PENDING' && (
        <p className="hint" style={{ marginTop: -6, marginBottom: 12 }}>
          Aguardando confirmação do pagamento… atualiza automaticamente.
        </p>
      )}
      <div className="stat-label">Valor</div>
      <div style={{ marginBottom: 14 }}>{centsToBRL(link.amountCents)}</div>
      {order?.pixEmv || order?.pixQrCodeBase64 ? (
        <>
          <div className="qr-box" style={{ marginBottom: 12 }}>
            <PixQrImage emv={order.pixEmv} gatewayQrCodeBase64={order.pixQrCodeBase64} />
          </div>
          {order.pixEmv && (
            <>
              <div className="stat-label">Copia e cola (EMV)</div>
              <div className="emv-code">{order.pixEmv}</div>
            </>
          )}
        </>
      ) : (
        <div className="empty-state">QR Code indisponível para este link.</div>
      )}
    </div>
  );
}

/* gera o QR local a partir do EMV de preferência (é a fonte validada pelo padrão BR Code). 
 só usa a imagem crua do gateway se não tiver EMV ou se a geração local der erro */
function PixQrImage({
  emv,
  gatewayQrCodeBase64,
}: {
  emv?: string;
  gatewayQrCodeBase64?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(null);
    setFailed(false);
    if (!emv) return;
    generateEmvQrCodeDataUrl(emv)
      .then(setSrc)
      .catch(() => setFailed(true));
  }, [emv]);

  if (emv && src) {
    return <img src={src} alt="QR Code Pix" />;
  }
  if ((!emv || failed) && gatewayQrCodeBase64) {
    return <img src={toQrCodeImageSrc(gatewayQrCodeBase64)} alt="QR Code Pix" />;
  }
  if (emv && !failed) {
    return <div className="empty-state">Gerando QR Code…</div>;
  }
  return <div className="empty-state">QR Code indisponível para este link.</div>;
}

function SendEmailBox({ linkId }: { linkId: string }) {
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await api.post<{ sent: boolean }>(`/checkout/links/${linkId}/send-email`, {
        to,
      });
      setFeedback(
        res.sent
          ? 'E-mail enviado com sucesso.'
          : 'SMTP não configurado no backend — envio apenas registrado em log (ver .env SMTP_*).',
      );
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Falha ao enviar e-mail.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Enviar por e-mail</div>
      <form onSubmit={handleSend} className="row">
        <input
          type="email"
          placeholder="pagador@email.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
        <button className="btn btn-primary" disabled={sending} type="submit">
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
      {feedback && (
        <p className="hint" style={{ marginTop: 10 }}>
          {feedback}
        </p>
      )}
    </div>
  );
}

function ReceiptBox({ orderId }: { orderId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/checkout/orders/${orderId}/receipt`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Não foi possível gerar o comprovante.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao baixar comprovante.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Comprovante</div>
      {error && <div className="alert alert-error">{error}</div>}
      <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
        {downloading ? 'Gerando…' : 'Baixar comprovante em PDF'}
      </button>
    </div>
  );
}

// Segundos restantes até expirar atualizado a cada segundo.
function useCountdown(expiresAt?: string): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    expiresAt ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)) : null,
  );

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const target = new Date(expiresAt).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return secondsLeft;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Contador + botão de cancelar exibidos enquanto o link de cartão ta aberto aguardando os dados
function CardLinkExpiryBar({
  link,
  onExpired,
  onCancelled,
}: {
  link: CheckoutLink;
  onExpired: () => void;
  onCancelled: () => void;
}) {
  const secondsLeft = useCountdown(link.expiresAt);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expiredRef = useState({ notified: false })[0];

  //avisa o componente pai (via onExpired) assim que o contador chegar em zero, só uma vez
  useEffect(() => {
    if (secondsLeft === 0 && !expiredRef.notified) {
      expiredRef.notified = true;
      onExpired();
    }
  }, [secondsLeft, expiredRef, onExpired]);

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      await api.post(`/checkout/links/${link.id}/cancel`, {});
      onCancelled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cancelar o link.');
    } finally {
      setCancelling(false);
    }
  }

  if (secondsLeft === null) return null;

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div className="stat-label">Expira em</div>
        <div className="mono" style={{ fontSize: 18 }}>
          {secondsLeft > 0 ? formatCountdown(secondsLeft) : 'expirando…'}
        </div>
        {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}
      </div>
      <button className="btn" onClick={handleCancel} disabled={cancelling || secondsLeft === 0}>
        {cancelling ? 'Cancelando…' : 'Cancelar'}
      </button>
    </div>
  );
}

function CardPaymentForm({
  link,
  order,
  onPaid,
}: {
  link: CheckoutLink;
  order: Order | null;
  onPaid: () => void;
}) {
  const [fees, setFees] = useState<GatewayFee[]>([]);
  const [brand, setBrand] = useState('VISA');
  const [installments, setInstallments] = useState(1);
  const [payerDocument, setPayerDocument] = useState('');
  const [holderName, setHolderName] = useState('');
  const [number, setNumber] = useState('');
  const [expMonth, setExpMonth] = useState(12);
  const [expYear, setExpYear] = useState(new Date().getFullYear() + 3);
  const [cvv, setCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<GatewayFee[]>('/gateway/fees', { brand })
      .then(setFees)
      .catch(() => setFees([]));
  }, [brand]);

  // Sincroniza a bandeira sozinha com o que o usuário digita no numero do cartão. 
  useEffect(() => {
    const detected = detectCardBrand(number);
    if (detected) setBrand(detected);
  }, [number]);

  const currentFee = fees.find((f) => f.installments === installments);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidDocumentLength(payerDocument)) {
      setError('CPF/CNPJ do pagador deve ter 11 (CPF) ou 14 (CNPJ) dígitos.');
      return;
    }
    const detectedBrand = detectCardBrand(number);
    if (detectedBrand && detectedBrand !== brand) {
      setError(
        `O número do cartão parece ser ${detectedBrand === 'MASTERCARD' ? 'Mastercard' : detectedBrand === 'ELO' ? 'Elo' : 'Visa'}, mas a bandeira selecionada é outra. Ajuste a bandeira antes de continuar.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/checkout/links/${link.id}/pay-card`, {
        installments,
        brand,
        payerDocument,
        feePercent: currentFee?.feePercent,
        card: { holderName, number, expMonth, expYear, cvv },
      });
      onPaid();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao processar o pagamento.');
    } finally {
      setSubmitting(false);
    }
  }

  if (link.status === 'EXPIRED' || link.status === 'CANCELLED') {
    return (
      <div className="card">
        <div className="card-title">
          Pagar com cartão <StatusStamp status={link.status} />
        </div>
        <div className="empty-state">
          {link.status === 'EXPIRED'
            ? 'Este link expirou antes que os dados do cartão fossem informados.'
            : 'Este link foi cancelado pelo usuário.'}
        </div>
      </div>
    );
  }

  if (order) {
    return (
      <div className="card">
        <div className="card-title">
          Pagamento com cartão <StatusStamp status={order.status} />
        </div>
        {order.status === 'PENDING' && (
          <p className="hint" style={{ marginTop: -6, marginBottom: 12 }}>
            Aguardando confirmação do pagamento… atualiza automaticamente.
          </p>
        )}
        <div className="stat-label">Valor</div>
        <div>{centsToBRL(order.amountCents)}</div>
        <div className="stat-label" style={{ marginTop: 10 }}>
          Parcelas / taxa
        </div>
        <div>
          {order.installments}x · {order.feePercent}%
        </div>
      </div>
    );
  }

  if (link.status !== 'OPEN') {
    return (
      <div className="card">
        <div className="card-title">
          Pagar com cartão <StatusStamp status={link.status} />
        </div>
        <div className="empty-state">Este link não está mais disponível para pagamento.</div>
      </div>
    );
  }

  return (
    <>
      <CardLinkExpiryBar link={link} onExpired={onPaid} onCancelled={onPaid} />
      <div className="card">
        <div className="card-title">Pagar com cartão</div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handlePay}>
        <div className="row">
          <div className="field">
            <label>Bandeira</label>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="VISA">Visa</option>
              <option value="MASTERCARD">Mastercard</option>
              <option value="ELO">Elo</option>
            </select>
          </div>
          <div className="field">
            <label>Parcelas</label>
            <select
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
            >
              {(fees.length > 0 ? fees.map((f) => f.installments) : [1]).map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>
        </div>
        {currentFee && (
          <p className="hint" style={{ marginTop: -6, marginBottom: 12 }}>
            Taxa vigente no gateway: {currentFee.feePercent}%
          </p>
        )}
        {detectCardBrand(number) && (
          <p className="hint" style={{ marginTop: -6, marginBottom: 12 }}>
            Bandeira detectada automaticamente pelo número do cartão.
          </p>
        )}
        <DocumentField label="CPF/CNPJ do pagador" value={payerDocument} onChange={setPayerDocument} required />
        <div className="field">
          <label>Nome impresso no cartão</label>
          <input
            value={holderName}
            onChange={(e) => setHolderName(onlyLetters(e.target.value))}
            minLength={3}
            maxLength={100}
            placeholder="MARIA A SILVA"
            required
          />
        </div>
        <CardNumberField label="Número do cartão" value={number} onChange={setNumber} required />
        <div className="row">
          <div className="field">
            <label>Mês</label>
            <input
              type="number"
              min={1}
              max={12}
              value={expMonth}
              onChange={(e) => setExpMonth(Number(e.target.value))}
              required
            />
          </div>
          <div className="field">
            <label>Ano</label>
            <input
              type="number"
              value={expYear}
              onChange={(e) => setExpYear(Number(e.target.value))}
              required
            />
          </div>
          <div className="field">
            <DigitsField label="CVV" value={cvv} onChange={setCvv} maxLength={4} required />
          </div>
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting} type="submit">
          {submitting ? 'Processando…' : `Pagar ${centsToBRL(link.amountCents)}`}
        </button>
        </form>
      </div>
    </>
  );
}
