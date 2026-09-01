import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger extends ConsoleLogger {
  
  log(message: any, context?: string) {
    this.printStructured('INFO', message, context);
  }

  error(message: any, stack?: string, context?: string) {
    this.printStructured('ERROR', message, context, { stack });
  }

  warn(message: any, context?: string) {
    this.printStructured('WARN', message, context);
  }

  debug(message: any, context?: string) {
    this.printStructured('DEBUG', message, context);
  }

  verbose(message: any, context?: string) {
    this.printStructured('VERBOSE', message, context);
  }

  clinical(message: any, context?: string, metadata?: any) {
    this.printStructured('CLINICAL', message, context, metadata);
  }

  security(message: any, context?: string, metadata?: any) {
    this.printStructured('SECURITY', message, context, metadata);
  }

  private printStructured(level: string, message: any, context?: string, metadata?: any) {
    const logObj = {
      timestamp: new Date().toISOString(),
      level,
      context: context || this.context,
      message: typeof message === 'string' ? message : undefined,
      data: typeof message !== 'string' ? message : undefined,
      ...metadata,
    };
    
    // In production, this would go to stdout as strict JSON
    // For local dev, we still print JSON but let Nest handle it conceptually
    console.log(JSON.stringify(logObj));
  }
}
