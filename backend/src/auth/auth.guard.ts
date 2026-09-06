import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers['authorization'];
    
    let userId = request.headers['x-user-id'] || '0000-0000-0000-0000'; // Default fallback

    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payloadBuffer = Buffer.from(payloadBase64, 'base64');
          const payload = JSON.parse(payloadBuffer.toString('utf8'));
          if (payload && payload.sub) {
            userId = payload.sub; // Google User ID
          }
        }
      } catch (e) {
        // ignore parsing errors
      }
    }
    
    // Attach userId to request object for the decorator to use
    request.user = { id: userId };
    return true;
  }
}
