import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockItem } from './entities/stock.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';

const FACILITY_LOCATIONS = {
  'PHC-001': { lat: 18.5204, lon: 73.8567 },
  'RH-001': { lat: 18.5300, lon: 73.8600 },
  'DH-001': { lat: 18.5500, lon: 73.8900 },
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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

    const origin = FACILITY_LOCATIONS[nearFacilityId] || { lat: 18.5, lon: 73.8 };

    const available = await this.stockItemRepo
      .createQueryBuilder('stock')
      .where('LOWER(stock.drugName) = LOWER(:drug)', { drug })
      .andWhere('stock.currentQty > 0')
      .orderBy('stock.currentQty', 'DESC')
      .getMany();

    return available.map((item) => {
      const dest = FACILITY_LOCATIONS[item.facilityId] || { lat: 18.5, lon: 73.8 };
      const dist = calculateDistance(origin.lat, origin.lon, dest.lat, dest.lon);
      
      let visibility = 'IN_STOCK';
      if (item.currentQty < 20) visibility = 'LOW_STOCK';
      if (item.currentQty === 0) visibility = 'OUT_OF_STOCK';

      return {
        facilityId: item.facilityId,
        facilityName: `Facility ${item.facilityId}`,
        quantity: item.currentQty,
        visibility: visibility,
        distance: Math.round(dist * 10) / 10, 
      };
    }).sort((a, b) => a.distance - b.distance);
  }

  async recordMovement(facilityId: string, drugName: string, type: 'RECEIVED' | 'DISPENSED' | 'TRANSFERRED', quantity: number) {
    let stockItem = await this.stockItemRepo.findOne({ where: { facilityId, drugName }});
    if (!stockItem) {
      stockItem = this.stockItemRepo.create({ facilityId, drugName, unit: 'units', currentQty: 0 });
    }

    if (type === 'RECEIVED' || type === 'TRANSFERRED') {
      stockItem.currentQty += quantity;
    } else if (type === 'DISPENSED') {
      if (stockItem.currentQty < quantity) throw new Error(`Insufficient stock for ${drugName} at ${facilityId}`);
      stockItem.currentQty -= quantity;
    }

    await this.stockItemRepo.save(stockItem);

    const movement = this.stockMovementRepo.create({
      itemId: stockItem.id,
      type: type,
      quantity: quantity,
    });
    
    await this.stockMovementRepo.save(movement);
    
    return stockItem;
  }

  async getAllStock(facilityId: string) {
    const items = await this.stockItemRepo.find({ where: { facilityId }, order: { currentQty: 'ASC' } });
    return items.map(item => {
      let visibility = 'IN_STOCK';
      if (item.currentQty < 20) visibility = 'LOW_STOCK';
      if (item.currentQty === 0) visibility = 'OUT_OF_STOCK';
      
      return {
        ...item,
        visibility
      };
    });
  }

  async seedStock(facilityId: string) {
    const drugs = [
      { name: 'Metformin 500mg', qty: 25 },
      { name: 'Amoxicillin 250mg', qty: 150 },
      { name: 'Paracetamol 500mg', qty: 300 },
      { name: 'Telmisartan 40mg', qty: 15 }, // low stock example
      { name: 'Ibuprofen 400mg', qty: 120 },
      { name: 'ORS Packets', qty: 50 },
    ];

    for (const drug of drugs) {
      const exists = await this.stockItemRepo.findOne({ where: { facilityId, drugName: drug.name }});
      if (!exists) {
        await this.stockItemRepo.save(this.stockItemRepo.create({
          facilityId,
          drugName: drug.name,
          unit: 'units',
          currentQty: drug.qty
        }));
      }
    }
    return { status: 'seeded' };
  }
}
