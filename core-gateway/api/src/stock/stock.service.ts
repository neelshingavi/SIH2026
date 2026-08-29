import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockItem } from './entities/stock.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepo: Repository<StockMovement>,
  ) {}

  async search(drug: string, nearFacilityId: string) {
    this.logger.log(`Searching for stock of ${drug} near ${nearFacilityId}`);

    // Fetch all stock for this drug across all facilities where quantity > 0
    const available = await this.stockItemRepo
      .createQueryBuilder('stock')
      .where('LOWER(stock.drugName) = LOWER(:drug)', { drug })
      .andWhere('stock.currentQty > 0')
      .orderBy('stock.currentQty', 'DESC')
      .getMany();

    // Mock distances for the prototype
    return available.map((item, index) => ({
      facilityId: item.facilityId,
      facilityName: `Facility ${item.facilityId}`, // In real app, join with Facility table
      quantity: item.currentQty,
      distance: (index + 1) * 5.2, // mock distance in km
    }));
  }

  // OpenLMIS-style Stock Movement Logic
  async recordMovement(facilityId: string, drugName: string, type: 'RECEIVED' | 'DISPENSED' | 'TRANSFERRED', quantity: number) {
    // 1. Find or create the stock item ledger line
    let stockItem = await this.stockItemRepo.findOne({ where: { facilityId, drugName }});
    if (!stockItem) {
      stockItem = this.stockItemRepo.create({ facilityId, drugName, unit: 'units', currentQty: 0 });
    }

    // 2. Adjust quantity
    if (type === 'RECEIVED' || type === 'TRANSFERRED') { // Assuming TRANSFERRED here means transferred IN.
      stockItem.currentQty += quantity;
    } else if (type === 'DISPENSED') {
      if (stockItem.currentQty < quantity) throw new Error(`Insufficient stock for ${drugName} at ${facilityId}`);
      stockItem.currentQty -= quantity;
    }

    await this.stockItemRepo.save(stockItem);

    // 3. Record the audit trail movement
    const movement = this.stockMovementRepo.create({
      itemId: stockItem.id,
      type: type,
      quantity: quantity,
    });
    
    await this.stockMovementRepo.save(movement);
    
    return stockItem;
  }
}
