import { Controller, Get, Query } from '@nestjs/common';
import { StockService } from './stock.service.js';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('search')
  search(@Query('drug') drug: string, @Query('near') near: string) {
    return this.stockService.search(drug, near);
  }
}
