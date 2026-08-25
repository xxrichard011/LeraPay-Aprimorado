import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as GatewayTypes from './gateway.types';

/* Comunicação HTTP com o gateway Lera Box */

// Modulo pode chamar axios/fetch direto no gateway, fica mais facill de logar e tratar erro 
/* Nas rotas autenticadas o accessToken (Bearer) já vem resolvido pelo
   GatewayAuthService apartir da credencial cifrada do user */
@Injectable()
export class GatewayHttpService {
  private readonly logger = new Logger(GatewayHttpService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('gateway.baseUrl') as string;
  }

  private authHeaders(accessToken: string): AxiosRequestConfig {
    return { headers: { Authorization: `Bearer ${accessToken}` } };
  }

  //Wrapper unico pra toda chamada ao gateway ja trata e loga os erros
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http.request<T>({ ...config, url: `${this.baseUrl}${config.url}` }),
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError<any>;
      const status = axiosErr.response?.status;
      const gatewayMessage = axiosErr.response?.data?.message;

      this.logger.error(
        `Gateway ${config.method} ${config.url} falhou (${status ?? 'sem resposta'}): ${
          gatewayMessage ? JSON.stringify(gatewayMessage) : axiosErr.message
        }`,
      );

      if (axiosErr.response && gatewayMessage) {
        // o gateway respondeu com um erro (tipo bandeira não suportada)
        throw new BadGatewayException({
          message: Array.isArray(gatewayMessage) ? gatewayMessage.join(', ') : gatewayMessage,
          gatewayStatus: status,
        });
      }

      // sem resposta do gateway (rede caiu, timeout, etc).
      throw new BadGatewayException({
        message:
          'Não foi possível se comunicar com o processador de pagamentos no momento. Tente novamente em instantes.',
        gatewayStatus: status,
      });
    }
  }

  //Publico (sem token)
  registerUser(
    payload: GatewayTypes.GatewayRegisterPayload,
  ): Promise<GatewayTypes.GatewayRegisterResponse> {
    return this.request({ method: 'POST', url: '/users', data: payload });
  }

  login(payload: GatewayTypes.GatewayLoginPayload): Promise<GatewayTypes.GatewayLoginResponse> {
    return this.request({ method: 'POST', url: '/auth/login', data: payload });
  }

  resetPassword(email: string): Promise<{ message: string }> {
    return this.request({ method: 'POST', url: '/auth/reset-password', data: { email } });
  }

  getFees(brand?: string): Promise<GatewayTypes.GatewayFee[]> {
    return this.request<{ total: number; fees: GatewayTypes.GatewayFee[] }>({
      method: 'GET',
      url: '/fees',
      params: brand ? { brand } : undefined,
    }).then((res) => res.fees);
  }

  //Autenticado (Bearer)
  getMe(accessToken: string): Promise<Record<string, unknown>> {
    return this.request({ method: 'GET', url: '/users/me', ...this.authHeaders(accessToken) });
  }

  // o gateway devolve o campo como "balance", aqui converte pro nome que a gente usa (balanceCents)
  getWallet(accessToken: string): Promise<GatewayTypes.GatewayWalletResponse> {
    return this.request<any>({ method: 'GET', url: '/wallet', ...this.authHeaders(accessToken) }).then((res) => ({
      balanceCents: res.balance,
    }));
  }

  // Aqui tambem normaliza o formato, as vezes o gateway devolve array puro, as vezes um objeto com "transactions"
  getWalletTransactions(
    accessToken: string,
    query: GatewayTypes.GatewayWalletTransactionsQuery,
  ): Promise<GatewayTypes.GatewayWalletTransaction[]> {
    return this.request<any>({
      method: 'GET',
      url: '/wallet/transactions',
      params: query,
      ...this.authHeaders(accessToken),
    }).then((res: any) => {
      const rawTransactions: any[] = Array.isArray(res) ? res : res?.transactions ?? [];
      return rawTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amountCents: tx.amount,
        externalReference: tx.externalReference ?? tx.metadata?.externalReference,
        description: tx.description,
        denialReason: tx.denialReason ?? null,
        createdAt: tx.createdAt,
      }));
    });
  }

  createPixPayment(
    accessToken: string,
    payload: GatewayTypes.GatewayPixPaymentPayload,
  ): Promise<GatewayTypes.GatewayPixPaymentResponse> {
    return this.request({
      method: 'POST',
      url: '/payments/pix',
      data: payload,
      ...this.authHeaders(accessToken),
    });
  }

  createCardPayment(
    accessToken: string,
    payload: GatewayTypes.GatewayCardPaymentPayload,
  ): Promise<GatewayTypes.GatewayCardPaymentResponse> {
    return this.request({
      method: 'POST',
      url: '/payments/card',
      data: payload,
      ...this.authHeaders(accessToken),
    });
  }

  getPayment(
    accessToken: string,
    paymentId: string,
  ): Promise<GatewayTypes.GatewayPaymentStatusResponse> {
    return this.request({
      method: 'GET',
      url: `/payments/${paymentId}`,
      ...this.authHeaders(accessToken),
    });
  }

  createWithdrawal(
    accessToken: string,
    payload: GatewayTypes.GatewayWithdrawalPayload,
  ): Promise<GatewayTypes.GatewayWithdrawalResponse> {
    return this.request({
      method: 'POST',
      url: '/withdrawals',
      data: payload,
      ...this.authHeaders(accessToken),
    });
  }

  getWithdrawal(
    accessToken: string,
    withdrawalId: string,
  ): Promise<GatewayTypes.GatewayWithdrawalResponse> {
    return this.request({
      method: 'GET',
      url: `/withdrawals/${withdrawalId}`,
      ...this.authHeaders(accessToken),
    });
  }

  registerWebhook(
    accessToken: string,
    payload: GatewayTypes.GatewayWebhookRegisterPayload,
  ): Promise<GatewayTypes.GatewayWebhookResponse> {
    return this.request({
      method: 'POST',
      url: '/webhooks',
      data: payload,
      ...this.authHeaders(accessToken),
    });
  }

  listWebhooks(accessToken: string): Promise<GatewayTypes.GatewayWebhookResponse[]> {
    return this.request({ method: 'GET', url: '/webhooks', ...this.authHeaders(accessToken) });
  }

  deleteWebhook(accessToken: string, webhookId: string): Promise<void> {
    return this.request({
      method: 'DELETE',
      url: `/webhooks/${webhookId}`,
      ...this.authHeaders(accessToken),
    });
  }
}
