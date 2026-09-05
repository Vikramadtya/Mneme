import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('api/v1')
export class AuthController {
  
  @Get('health')
  healthCheck() {
    return { status: 'UP' };
  }

  @Post('auth/login')
  async login(@Body() body: any) {
    // In the old Java implementation, this verified the Google token.
    // For now, we mock the success response to keep the frontend working if it skips real auth.
    // The current frontend uses '0000-0000-0000-0000' dummy userId when no actual token is present.
    return {
      token: 'mock_jwt_token',
      user: {
        id: '0000-0000-0000-0000',
        email: 'test@memoriser.local',
        name: 'Test User'
      }
    };
  }
}
