export type BillingProvider = 'asaas' | 'stripe';
export type BillingMethod = 'pix' | 'credit_card' | 'stripe';
export type BillingInterval = 'monthly' | 'yearly';
export type PlanTier = 'individual' | 'family';

export interface PlanPricingConfig {
  id: PlanTier;
  name: string;
  monthlyBrl: number;
  yearlyMonthlyEquivalentBrl: number;
  monthlyUsd: number;
  yearlyMonthlyEquivalentUsd: number;
  aiCredits: number;
  familyMembersMax: number;
}

export const BILLING_PLANS: Record<PlanTier, PlanPricingConfig> = {
  individual: {
    id: 'individual',
    name: 'Vita4Me Individual',
    monthlyBrl: 29.0,
    yearlyMonthlyEquivalentBrl: 23.0,
    monthlyUsd: 9.9,
    yearlyMonthlyEquivalentUsd: 7.9,
    aiCredits: 500,
    familyMembersMax: 1,
  },
  family: {
    id: 'family',
    name: 'Vita4Me Família',
    monthlyBrl: 59.0,
    yearlyMonthlyEquivalentBrl: 47.0,
    monthlyUsd: 19.9,
    yearlyMonthlyEquivalentUsd: 14.9,
    aiCredits: 9999,
    familyMembersMax: 5,
  },
};

export interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  userName?: string;
  userCpfCnpj?: string;
  userPhone?: string;
  planId: PlanTier;
  interval: BillingInterval;
  provider: BillingProvider;
  method?: BillingMethod;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode?: string;
    addressNumber?: string;
    phone?: string;
  };
}

export interface CheckoutResult {
  success: boolean;
  provider: BillingProvider;
  paymentId?: string;
  subscriptionId?: string;
  checkoutUrl?: string;
  pix?: {
    encodedImage: string; // Base64 PNG do QR Code
    payload: string; // Copia e Cola
    expirationDate?: string;
    paymentId: string;
  };
  status?: string;
  message?: string;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  mobilePhone?: string;
  externalReference?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  netValue?: number;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';
  status:
    | 'PENDING'
    | 'RECEIVED'
    | 'CONFIRMED'
    | 'OVERDUE'
    | 'REFUNDED'
    | 'RECEIVED_IN_CASH'
    | 'REFUND_REQUESTED'
    | 'CHARGEBACK_REQUESTED'
    | 'CHARGEBACK_DISPUTE'
    | 'AWAITING_CHARGEBACK_REVERSAL'
    | 'DUNNING_REQUESTED'
    | 'DUNNING_RECEIVED'
    | 'AWAITING_RISK_ANALYSIS';
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  externalReference?: string;
  description?: string;
}

export interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export interface AsaasWebhookEvent {
  event:
    | 'PAYMENT_CREATED'
    | 'PAYMENT_AWAITING_RISK_ANALYSIS'
    | 'PAYMENT_PRE_AUTHORIZATION_FAILED'
    | 'PAYMENT_UPDATED'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
    | 'PAYMENT_ANTICIPATED'
    | 'PAYMENT_OVERDUE'
    | 'PAYMENT_DELETED'
    | 'PAYMENT_RESTORED'
    | 'PAYMENT_REFUNDED'
    | 'PAYMENT_PARTIALLY_REFUNDED'
    | 'PAYMENT_REFUND_IN_PROGRESS'
    | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
    | 'PAYMENT_CHARGEBACK_REQUESTED'
    | 'PAYMENT_CHARGEBACK_DISPUTE'
    | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
    | 'PAYMENT_DUNNING_RECEIVED'
    | 'PAYMENT_DUNNING_REQUESTED'
    | 'PAYMENT_BANK_SLIP_VIEWED'
    | 'PAYMENT_CHECKOUT_VIEWED'
    | 'SUBSCRIPTION_CREATED'
    | 'SUBSCRIPTION_UPDATED'
    | 'SUBSCRIPTION_DELETED';
  payment?: AsaasPayment;
  subscription?: {
    id: string;
    customer: string;
    value: number;
    nextDueDate: string;
    cycle: string;
    description: string;
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
    externalReference?: string;
  };
}
