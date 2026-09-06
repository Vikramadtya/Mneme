import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Controller('api/v1')
export class AuthController {
  
  @Get('health')
  healthCheck() {
    return { status: 'UP' };
  }

  @Post('auth/login')
  async login(@Body() body: any) {
    if (!body || !body.token) {
        throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
    }

    try {
        // Fetch user profile from Google using the access token
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${body.token}`
            }
        });

        const user = response.data;
        if (!user || !user.sub) {
            throw new Error('Invalid Google user data');
        }

        // Create a simple unverified JWT format since our backend currently just decodes it
        const payload = Buffer.from(JSON.stringify({ sub: user.sub, email: user.email })).toString('base64');
        const fakeJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature`;

        return {
            access_token: fakeJwt, // The frontend expects this key!
            user: {
                id: user.sub,
                email: user.email,
                name: user.name
            }
        };
    } catch (error: any) {
        throw new HttpException('Failed to verify Google token: ' + error.message, HttpStatus.UNAUTHORIZED);
    }
  }
}