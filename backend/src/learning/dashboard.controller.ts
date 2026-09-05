import { Controller, Get, Headers } from '@nestjs/common';
import { LearningController } from './learning.controller.js';

@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private learningController: LearningController) {}

  @Get('overview')
  async getDashboardOverview(@Headers() headers: any) {
    return this.learningController.getDashboardOverview(headers);
  }
}
