import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { jwtVerify, SignJWT } from 'jose';

const ISSUER = 'memoriser';

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();
  private readonly secret: Uint8Array;
  private readonly clientId: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.secret = new TextEncoder().encode(config.getOrThrow<string>('JWT_SECRET'));
    this.clientId = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
  }

  /** Verifies a Google ID token (signature, audience, expiry) and issues our own session token. */
  async loginWithGoogle(credential: string) {
    let payload;
    try {
      const ticket = await this.google.verifyIdToken({ idToken: credential, audience: this.clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }
    if (!payload?.sub || payload.email_verified === false) {
      throw new UnauthorizedException('Invalid Google credential');
    }
    return {
      access_token: await this.sign(payload.sub, payload.email),
      user: { id: payload.sub, email: payload.email, name: payload.name },
    };
  }

  sign(sub: string, email?: string): Promise<string> {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);
  }

  async verify(token: string): Promise<{ id: string }> {
    try {
      const { payload } = await jwtVerify(token, this.secret, { algorithms: ['HS256'], issuer: ISSUER });
      if (!payload.sub) throw new Error('no subject');
      return { id: payload.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
