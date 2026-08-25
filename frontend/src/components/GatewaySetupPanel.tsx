import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { DocumentField } from './fields';
import { isValidDocumentLength } from '../lib/masks';
import { GatewayStatus } from '../types';

export function GatewaySetupPanel() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // form: cadastro
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PJ');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [registering, setRegistering] = useState(false);

  // form: login
  const [loginDocument, setLoginDocument] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  async function loadStatus() {
    setLoadingStatus(true);
    try {
      const data = await api.get<GatewayStatus>('/gateway/status');
      setStatus(data);
    } catch {
      // primeira visita ainda não tem conta
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!isValidDocumentLength(document)) {
      setError('CPF/CNPJ deve ter 11 (CPF) ou 14 (CNPJ) dígitos.');
      return;
    }
    if (phone.length < 10) {
      setError('Telefone deve ter DDD + número (10 ou 11 dígitos).');
      return;
    }
    setRegistering(true);
    try {
      const res = await api.post<{ message: string }>('/gateway/register', {
        personType,
        document,
        email,
        phone,
        name,
        zipCode,
        address,
        number,
        neighborhood,
        city,
        state,
      });
      setSuccess(res.message);
      setLoginDocument(document);
      await loadStatus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar no gateway.');
    } finally {
      setRegistering(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!isValidDocumentLength(loginDocument)) {
      setError('CPF/CNPJ deve ter 11 (CPF) ou 14 (CNPJ) dígitos.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await api.post<{ message: string; codigoCliente: string; chaveLoja: string }>(
        '/gateway/login',
        { document: loginDocument, password: loginPassword },
      );
      setSuccess(res.message);
      setLoginPassword('');
      await loadStatus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao autenticar no gateway.');
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Conta no gateway</div>
          <div className="page-sub">Conecte sua loja ao processador de pagamentos Lera Box</div>
        </div>
      </div>

      {!loadingStatus && status && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Status da conexão</div>
          <div className="row" style={{ gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div className="stat-label">Cadastro no gateway</div>
              <div>{status.registered ? '✅ Concluído' : '— Pendente'}</div>
            </div>
            <div>
              <div className="stat-label">Sessão ativa (token)</div>
              <div>{status.authenticated ? '✅ Autenticado' : '— Não autenticado'}</div>
            </div>
            {status.codigoCliente && (
              <div>
                <div className="stat-label">Código do cliente</div>
                <div className="mono">{status.codigoCliente}</div>
              </div>
            )}
            {status.chaveLoja && (
              <div>
                <div className="stat-label">Chave da loja</div>
                <div className="mono">{status.chaveLoja}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">1. Cadastro público</div>
          <p className="hint" style={{ marginBottom: 14 }}>
            Envia seus dados ao gateway. Documento, senha, CodigoCliente e ChaveLoja chegam por
            e-mail — use um e-mail e telefone reais.
          </p>
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Tipo de pessoa</label>
              <select value={personType} onChange={(e) => setPersonType(e.target.value as any)}>
                <option value="PJ">Pessoa jurídica (PJ)</option>
                <option value="PF">Pessoa física (PF)</option>
              </select>
            </div>
            <div className="field">
              <label>Nome / Razão social</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>CPF/CNPJ</label>
              <input value={document} onChange={(e) => setDocument(e.target.value)} required />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="field">
              <label>CEP</label>
              <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} required />
            </div>
            <div className="field">
              <label>Endereço</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div className="field">
              <label>Número</label>
              <input value={number} onChange={(e) => setNumber(e.target.value)} required />
            </div>
            <div className="field">
              <label>Bairro</label>
              <input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Cidade</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="field">
              <label>Estado (UF)</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                maxLength={2}
                required
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={registering} type="submit">
              {registering ? 'Enviando…' : 'Cadastrar no gateway'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">2. Login no gateway</div>
          <p className="hint" style={{ marginBottom: 14 }}>
            Use o documento e a senha recebidos por email. O token fica cifrado no backend — o
            frontend nunca vê a senha do gateway.
          </p>
          <form onSubmit={handleLogin}>
            <DocumentField label="CPF/CNPJ" value={loginDocument} onChange={setLoginDocument} required />
            <div className="field">
              <label>Senha (recebida por e-mail)</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={loggingIn} type="submit">
              {loggingIn ? 'Entrando…' : 'Entrar no gateway'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}