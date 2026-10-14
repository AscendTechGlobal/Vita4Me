import {
  AsaasCustomer,
  AsaasPayment,
  AsaasPixQrCodeResponse,
} from "./types.js";

export class AsaasClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || "";
    const env = process.env.ASAAS_ENVIRONMENT || "sandbox";
    this.baseUrl =
      env === "production"
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/v3";
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error(
        "ASAAS_API_KEY não configurada no ambiente. Configure no arquivo .env."
      );
    }

    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      access_token: this.apiKey,
      "User-Agent": "Vita4Me-SaaS/1.0",
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        (data as any)?.errors?.[0]?.description ||
        (data as any)?.message ||
        `Erro na chamada Asaas (${response.status} ${response.statusText})`;
      console.error(`❌ [AsaasClient] Erro na requisição [${options.method || "GET"} ${endpoint}]:`, errorMessage);
      throw new Error(errorMessage);
    }

    return data as T;
  }

  /**
   * Localiza ou cria um cliente no Asaas
   */
  public async getOrCreateCustomer(params: {
    name: string;
    email: string;
    cpfCnpj?: string;
    phone?: string;
    externalReference: string;
  }): Promise<AsaasCustomer> {
    // 1. Tentar buscar por email ou externalReference
    try {
      const searchRes = await this.request<{ data: AsaasCustomer[] }>(
        `/customers?email=${encodeURIComponent(params.email)}`
      );

      if (searchRes.data && searchRes.data.length > 0) {
        return searchRes.data[0];
      }
    } catch (err) {
      console.warn("⚠️ [AsaasClient] Falha na busca prévia de cliente, prosseguindo para criação:", err);
    }

    // 2. Se não existir, criar novo cliente
    const payload: Record<string, any> = {
      name: params.name || "Paciente Vita4Me",
      email: params.email,
      externalReference: params.externalReference,
    };

    if (params.cpfCnpj) {
      payload.cpfCnpj = params.cpfCnpj.replace(/\D/g, "");
    }
    if (params.phone) {
      payload.mobilePhone = params.phone.replace(/\D/g, "");
    }

    return await this.request<AsaasCustomer>("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Gera QR Code e Copia-e-Cola Pix para um pagamento existente
   */
  public async getPixQrCode(paymentId: string): Promise<AsaasPixQrCodeResponse> {
    return await this.request<AsaasPixQrCodeResponse>(
      `/payments/${paymentId}/pixQrCode`
    );
  }

  /**
   * Consulta dados e status de um pagamento
   */
  public async getPayment(paymentId: string): Promise<AsaasPayment> {
    return await this.request<AsaasPayment>(`/payments/${paymentId}`);
  }

  /**
   * Cria Assinatura Recorrente via PIX
   * Gera a assinatura e imediatamente resgata o Pix da 1ª cobrança
   */
  public async createPixSubscription(params: {
    customerId: string;
    value: number;
    cycle: "MONTHLY" | "YEARLY";
    description: string;
    externalReference: string;
  }): Promise<{
    subscriptionId: string;
    paymentId: string;
    pix: AsaasPixQrCodeResponse;
    invoiceUrl?: string;
  }> {
    // Data de vencimento: hoje para ativação imediata
    const today = new Date();
    const nextDueDate = today.toISOString().split("T")[0];

    const subPayload = {
      customer: params.customerId,
      billingType: "PIX",
      value: params.value,
      nextDueDate,
      cycle: params.cycle,
      description: params.description,
      externalReference: params.externalReference,
    };

    const subscription = await this.request<{ id: string }>(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify(subPayload),
      }
    );

    // Buscar a cobrança gerada para obter o Pix
    const paymentsList = await this.request<{ data: AsaasPayment[] }>(
      `/subscriptions/${subscription.id}/payments`
    );

    const firstPayment = paymentsList.data?.[0];
    if (!firstPayment) {
      throw new Error("Assinatura criada, mas nenhuma cobrança foi gerada automaticamente pelo Asaas.");
    }

    const pixData = await this.getPixQrCode(firstPayment.id);

    return {
      subscriptionId: subscription.id,
      paymentId: firstPayment.id,
      pix: pixData,
      invoiceUrl: firstPayment.invoiceUrl,
    };
  }

  /**
   * Cria Assinatura Recorrente via Cartão de Crédito Nacional
   */
  public async createCreditCardSubscription(params: {
    customerId: string;
    value: number;
    cycle: "MONTHLY" | "YEARLY";
    description: string;
    externalReference: string;
    creditCard: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    creditCardHolderInfo: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode?: string;
      addressNumber?: string;
      phone?: string;
    };
  }): Promise<{
    subscriptionId: string;
    status: string;
  }> {
    const today = new Date();
    const nextDueDate = today.toISOString().split("T")[0];

    const payload = {
      customer: params.customerId,
      billingType: "CREDIT_CARD",
      value: params.value,
      nextDueDate,
      cycle: params.cycle,
      description: params.description,
      externalReference: params.externalReference,
      creditCard: {
        holderName: params.creditCard.holderName,
        number: params.creditCard.number.replace(/\D/g, ""),
        expiryMonth: params.creditCard.expiryMonth,
        expiryYear: params.creditCard.expiryYear,
        ccv: params.creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: params.creditCardHolderInfo.name,
        email: params.creditCardHolderInfo.email,
        cpfCnpj: params.creditCardHolderInfo.cpfCnpj.replace(/\D/g, ""),
        postalCode: params.creditCardHolderInfo.postalCode?.replace(/\D/g, "") || "01310100",
        addressNumber: params.creditCardHolderInfo.addressNumber || "1",
        phone: params.creditCardHolderInfo.phone?.replace(/\D/g, "") || "11999999999",
      },
    };

    const res = await this.request<{ id: string; status: string }>(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    return {
      subscriptionId: res.id,
      status: res.status || "ACTIVE",
    };
  }

  /**
   * Cancela uma assinatura ativa no Asaas
   */
  public async cancelSubscription(subscriptionId: string): Promise<boolean> {
    await this.request(`/subscriptions/${subscriptionId}`, {
      method: "DELETE",
    });
    return true;
  }
}

export const asaasClient = new AsaasClient();
