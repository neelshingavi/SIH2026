import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service.js';
import { StockController } from './stock.controller.js';
import { StockItem } from './entities/stock.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([StockItem, StockMovement])],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService]
})
export class StockModule {}
