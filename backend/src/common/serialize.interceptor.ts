import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Maps Mongo documents (hydrated or lean) to the public shape: `_id` -> `id`, no `__v`. */
export function toPlain(value: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (value._bsontype === 'ObjectId') return value.toString();
  if (typeof value.toObject === 'function') value = value.toObject();
  if (Array.isArray(value)) return value.map(toPlain);

  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(value)) {
    if (key === '__v') continue;
    out[key === '_id' ? 'id' : key] = toPlain(val);
  }
  return out;
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(toPlain));
  }
}
