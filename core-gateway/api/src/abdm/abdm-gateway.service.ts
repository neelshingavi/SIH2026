import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

export enum AbdmMode {
  REAL = 'REAL',
  SANDBOX = 'SANDBOX',
  LOCAL_SIMULATION = 'LOCAL_SIMULATION',
  UNAVAILABLE = 'UNAVAILABLE'
}

@Injectable()
export class AbdmGatewayService {
  private readonly logger = new Logger(AbdmGatewayService.name);
  private readonly mode: AbdmMode;

  constructor() {
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

  async verifyAbha(abhaNumber: string): Promise<any> {
    this.logger.log(`Verifying ABHA: \${abhaNumber} (Mode: \${this.mode})`);
    
    if (this.mode === AbdmMode.UNAVAILABLE) {
      throw new HttpException('ABDM service is currently unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }

    if (this.mode === AbdmMode.LOCAL_SIMULATION) {
      // Simulate verification
      if (!abhaNumber || abhaNumber.length < 5) {
         return { valid: false, message: 'Invalid format' };
      }
      return {
         valid: true,
         patientDetails: {
           abhaNumber,
           name: 'Simulated Patient',
           gender: 'M',
           yearOfBirth: '1980'
         }
      };
    }

    // In SANDBOX or REAL, this would make an external HTTP call to ABDM APIs
    // e.g. POST to https://dev.abdm.gov.in/gateway/v0.5/users/auth/fetch-modes
    return { valid: false, message: 'Not implemented in this environment' };
  }
}
