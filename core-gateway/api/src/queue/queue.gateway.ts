import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueService } from './queue.service.js';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'queue',
})
export class QueueGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly queueService: QueueService) {}

  /** Client joins a facility room to receive live updates */
  @SubscribeMessage('joinFacility')
  handleJoin(
    @MessageBody() facilityId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(facilityId);
    return { status: 'joined', facilityId };
  }

  /** Advance a patient through the state machine and broadcast */
  @SubscribeMessage('advanceStatus')
  async handleAdvance(
    @MessageBody() data: { entryId: string; facilityId: string },
    @ConnectedSocket() _client: Socket,
  ) {
    const updated = await this.queueService.advanceStatus(data.entryId);
    // Broadcast updated entry to the entire facility room
    this.server.to(data.facilityId).emit('entryUpdated', updated);
    return updated;
  }

  /** Add new patient and broadcast to facility */
  @SubscribeMessage('addPatient')
  async handleAdd(
    @MessageBody() dto: {
      facilityId: string;
      patientName: string;
      age: string;
      gender: string;
      chiefComplaint: string;
      priority: string;
    },
    @ConnectedSocket() _client: Socket,
  ) {
    const entry = await this.queueService.createEntry({ ...dto, bpVital: '', spo2Vital: '', tempVital: '' });
    this.server.to(dto.facilityId).emit('entryAdded', entry);
    return entry;
  }
}
