// Asaas API Service - Sistema de Pagamentos e Cobranças
// Docs: https://docs.asaas.com/reference

import { Client } from '../types';

const ASAAS_API_URL = 'https://api.asaas.com/v3';

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  country?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  observations?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeId?: string;
  pixCopiaECola?: string;
  netValue?: number;
  originalValue?: number;
  interestValue?: number;
  fine?: {
    value: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  discount?: {
    value: number;
    dueDateLimitDays: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  nextDueDate: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  externalReference?: string;
}

export interface AsaasBalance {
  balance: number;
}

export interface AsaasFinancialSummary {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  totalRefunded: number;
  balance: number;
}

class AsaasService {
  private apiKey: string = '';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) throw new Error('API Key do Asaas não configurada');

    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.errors?.[0]?.description || `Erro Asaas: ${response.status}`);
    }

    return response.json();
  }

  // ========== CUSTOMERS ==========
  async createCustomer(client: Client): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: client.name,
        email: client.email,
        phone: client.phone,
        cpfCnpj: client.cpf_cnpj?.replace(/\D/g, ''),
        externalReference: client.id,
        notificationDisabled: false,
      }),
    });
  }

  async getCustomer(customerId: string): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>(`/customers/${customerId}`);
  }

  async listCustomers(offset = 0, limit = 100): Promise<{ data: AsaasCustomer[]; totalCount: number }> {
    return this.request(`/customers?offset=${offset}&limit=${limit}`);
  }

  async findCustomerByExternalRef(externalRef: string): Promise<AsaasCustomer | null> {
    const result = await this.request<{ data: AsaasCustomer[] }>(`/customers?externalReference=${externalRef}`);
    return result.data?.[0] || null;
  }

  // ========== PAYMENTS ==========
  async createPayment(data: {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
  }): Promise<AsaasPayment> {
    return this.request<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayment(paymentId: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(`/payments/${paymentId}`);
  }

  async listPayments(filters: { customer?: string; status?: string; offset?: number; limit?: number } = {}): Promise<{ data: AsaasPayment[]; totalCount: number }> {
    const params = new URLSearchParams();
    if (filters.customer) params.append('customer', filters.customer);
    if (filters.status) params.append('status', filters.status);
    params.append('offset', String(filters.offset || 0));
    params.append('limit', String(filters.limit || 100));
    return this.request(`/payments?${params.toString()}`);
  }

  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
    return this.request(`/payments/${paymentId}/pixQrCode`);
  }

  async refundPayment(paymentId: string, value?: number): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(value ? { value } : {}),
    });
  }

  // ========== SUBSCRIPTIONS ==========
  async createSubscription(data: {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    description?: string;
    externalReference?: string;
  }): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>(`/subscriptions/${subscriptionId}`);
  }

  async listSubscriptions(filters: { customer?: string; status?: string } = {}): Promise<{ data: AsaasSubscription[]; totalCount: number }> {
    const params = new URLSearchParams();
    if (filters.customer) params.append('customer', filters.customer);
    if (filters.status) params.append('status', filters.status);
    return this.request(`/subscriptions?${params.toString()}`);
  }

  async cancelSubscription(subscriptionId: string): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>(`/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  // ========== BALANCE & SUMMARY ==========
  async getBalance(): Promise<AsaasBalance> {
    return this.request<AsaasBalance>('/finance/balance');
  }

  async getFinancialSummary(): Promise<AsaasFinancialSummary> {
    const [balance, pendingPayments, overduePayments, receivedPayments] = await Promise.all([
      this.getBalance(),
      this.listPayments({ status: 'PENDING' }),
      this.listPayments({ status: 'OVERDUE' }),
      this.listPayments({ status: 'RECEIVED' }),
    ]);

    const sumValues = (payments: AsaasPayment[]) => payments.reduce((acc, p) => acc + p.value, 0);

    return {
      balance: balance.balance,
      totalPending: sumValues(pendingPayments.data),
      totalOverdue: sumValues(overduePayments.data),
      totalReceived: sumValues(receivedPayments.data),
      totalRefunded: 0,
    };
  }

  // ========== VALIDATE ==========
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch {
      return false;
    }
  }
}

export const asaasService = new AsaasService();
