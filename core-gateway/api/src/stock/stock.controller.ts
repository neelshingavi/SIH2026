import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { StockService } from './stock.service.js';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('search')
  search(@Query('drug') drug: string, @Query('near') near: string) {
    return this.stockService.search(drug, near);
  }

  @Get()
  getAllStock(@Query('facilityId') facilityId: string = 'PHC-001') {
    return this.stockService.getAllStock(facilityId);
  }

  @Post('movement')
  recordMovement(@Body() body: any) {
    return this.stockService.recordMovement(
      body.facilityId || 'PHC-001',
      body.drugName,
      body.type,
      body.quantity
    );
  }

  @Post('seed')
  seedStock(@Query('facilityId') facilityId: string = 'PHC-001') {
    return this.stockService.seedStock(facilityId);
  }
}
