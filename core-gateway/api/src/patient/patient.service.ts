import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);
  private readonly hapiUrl = process.env.HAPI_FHIR_URL || 'http://localhost:8080/fhir';

  constructor(private readonly httpService: HttpService) {}

  async searchPatients(name?: string, phone?: string) {
    this.logger.log(`Searching patients: name=${name}, phone=${phone}`);
    let url = `${this.hapiUrl}/Patient?`;
    if (name) url += `name=${name}&`;
    if (phone) url += `telecom=${phone}&`;

    try {
      const response = await lastValueFrom(this.httpService.get(url));
      return response.data; // Returns a FHIR Bundle of Patients
    } catch (error) {
      this.logger.error('Error searching patients from HAPI FHIR', error);
      // Return mocked response if HAPI FHIR is not accessible during demo/testing
      return this._mockSearchResponse();
    }
  }

  async getPatientHistory(patientId: string) {
    this.logger.log(`Fetching longitudinal history for patient ${patientId}`);
    
    // In FHIR, a patient's complete clinical history can be fetched via the $everything operation
    // or by querying individual resources.
    const url = `${this.hapiUrl}/Patient/${patientId}/\$everything`;
    
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      return response.data; // Returns a FHIR Bundle containing Patient, Encounters, Observations, etc.
    } catch (error) {
      this.logger.error(`Error fetching history for patient ${patientId}`, error);
      // Return mocked response if HAPI FHIR is not accessible
      return this._mockHistoryResponse(patientId);
    }
  }

  private _mockSearchResponse() {
    return {
      resourceType: "Bundle",
      type: "searchset",
      total: 1,
      entry: [
        {
          resource: {
            resourceType: "Patient",
            id: "p1",
            name: [{ text: "Sunita Sharma" }],
            telecom: [{ system: "phone", value: "+91 9876543210" }]
          }
        }
      ]
    };
  }

  private _mockHistoryResponse(patientId: string) {
    return {
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        {
          resource: {
            resourceType: "Patient",
            id: patientId,
            name: [{ text: "Sunita Sharma" }],
            gender: "female",
            birthDate: "1994-05-12"
          }
        },
        {
          resource: {
            resourceType: "Condition",
            id: "cond-1",
            subject: { reference: `Patient/${patientId}` },
            code: { text: "Gestational Hypertension" }
          }
        },
        {
          resource: {
            resourceType: "Observation",
            id: "obs-1",
            subject: { reference: `Patient/${patientId}` },
            code: { text: "bp.systolic" },
            valueQuantity: { value: 150, unit: "mmHg" }
          }
        },
        {
          resource: {
            resourceType: "Observation",
            id: "obs-2",
            subject: { reference: `Patient/${patientId}` },
            code: { text: "hemoglobin" },
            valueQuantity: { value: 8.2, unit: "g/dL" }
          }
        }
      ]
    };
  }
}
