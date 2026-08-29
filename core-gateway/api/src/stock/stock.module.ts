import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service.js';
import { StockController } from './stock.controller.js';
import { StockItem } from './entities/stock.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([StockItem, StockMovement])],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
