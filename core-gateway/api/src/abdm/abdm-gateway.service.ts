import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { HealthExchangeAdapter, ExchangeRequest, ExchangeStatus } from '../hie/interfaces/health-exchange-adapter.interface.js';

export enum AbdmMode {
  REAL = 'REAL',
  SANDBOX = 'SANDBOX',
  LOCAL_SIMULATION = 'LOCAL_SIMULATION',
  UNAVAILABLE = 'UNAVAILABLE'
}

@Injectable()
export class AbdmGatewayService implements HealthExchangeAdapter {
  private readonly logger = new Logger(AbdmGatewayService.name);
  private readonly mode: AbdmMode;

  constructor(private readonly fhirService: FhirService) {
    const envMode = process.env.ABDM_MODE?.toUpperCase() || 'LOCAL_SIMULATION';
    if (Object.values(AbdmMode).includes(envMode as AbdmMode)) {
      this.mode = envMode as AbdmMode;
    } else {
      this.mode = AbdmMode.LOCAL_SIMULATION;
    }
    this.logger.log(`ABDM Gateway initialized in mode: \${this.mode}`);
  }

  getMode(): AbdmMode {
    return this.mode;
  }

  async linkCareContext(patientId: string, facilityId: string, consentArtifactId: string): Promise<boolean> {
    this.logger.log(`[ABDM_SIM] Linking care context for \${patientId} to \${facilityId} with consent \${consentArtifactId}`);
    return true;
  }

  // Phase 9: HealthExchangeAdapter implementation
  async createExchangeRequest(request: ExchangeRequest): Promise<string> {
    this.logger.log(`[ABDM \${this.mode}] Creating exchange request for patient \${request.patientId}, purpose: \${request.purpose}`);
    return `ex-\${Date.now()}`;
  }

  async submitInformation(exchangeId: string, bundle: any): Promise<boolean> {
    this.logger.log(`[ABDM \${this.mode}] Submitting FHIR Bundle for exchange \${exchangeId}`);
    // Simulate async submission logic
    return true; 
  }

  async checkStatus(exchangeId: string): Promise<ExchangeStatus> {
    // In a real integration, we'd poll the HIE or NDHM API.
    return ExchangeStatus.COMPLETED;
  }

  async receiveInformation(exchangeId: string): Promise<any> {
    // Return empty bundle for simulation
    return { resourceType: 'Bundle', entry: [] };
  }

  async cancelExchange(exchangeId: string): Promise<void> {
    this.logger.log(`[ABDM \${this.mode}] Cancelling exchange \${exchangeId}`);
  }
}
