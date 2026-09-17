import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl } = req;
    
    // Extract Sentry Trace ID if available
    const traceparent = req.headers['sentry-trace'];
    let traceId = 'no-trace';
    if (traceparent && typeof traceparent === 'string') {
        traceId = traceparent.split('-')[1] || traceparent;
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (val: any) => {
          const res = context.switchToHttp().getResponse();
          const delay = Date.now() - startTime;
          this.logger.log(`[Trace: ${traceId}] ${method} ${originalUrl} ${res.statusCode} - ${delay}ms`);
        },
        error: (error: any) => {
          const delay = Date.now() - startTime;
          this.logger.error(`[Trace: ${traceId}] ${method} ${originalUrl} - FAILED - ${delay}ms`, error.stack);
          
          // Send to Sentry
          if (process.env.SENTRY_DSN) {
            Sentry.captureException(error);
          }
        },
      }),
    );
  }
}
