export enum ExchangeStatus {
  DRAFT = 'DRAFT',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  REQUESTED = 'REQUESTED',
  SUBMITTED = 'SUBMITTED',
  PROCESSING = 'PROCESSING',
  AVAILABLE = 'AVAILABLE',
  RETRIEVED = 'RETRIEVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

export interface ExchangeRequest {
  patientId: string;
  purpose: string;
  scope?: string[];
  destinationFacilityId?: string;
  bundlePayload?: any;
}

export interface HealthExchangeAdapter {
  createExchangeRequest(request: ExchangeRequest): Promise<string>;
  submitInformation(exchangeId: string, bundle: any): Promise<boolean>;
  checkStatus(exchangeId: string): Promise<ExchangeStatus>;
  receiveInformation(exchangeId: string): Promise<any>;
  cancelExchange(exchangeId: string): Promise<void>;
}
