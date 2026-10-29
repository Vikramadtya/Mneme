import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const sentryTrace = req.headers['sentry-trace'];
    const traceId = typeof sentryTrace === 'string' ? sentryTrace.split('-')[0] : 'no-trace';
    const startedAt = Date.now();
    const line = (status: number | string) =>
      `[Trace: ${traceId}] ${req.method} ${req.originalUrl.split('?')[0]} ${status} - ${Date.now() - startedAt}ms`;

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(line(res.statusCode)),
        error: (error: any) => {
          const status = error instanceof HttpException ? error.getStatus() : 500;
          if (status < 500) return this.logger.warn(line(status));
          this.logger.error(line(status), error.stack);
          if (process.env.SENTRY_DSN) Sentry.captureException(error);
        },
      }),
    );
  }
}
