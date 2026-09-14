import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type { Subscription } from 'rxjs';
import { LiveService, type LiveUpdate } from './live.service.js';

const configuredOrigins = process.env.CORS_ORIGINS?.trim();

@WebSocketGateway({
  namespace: '/matches',
  cors: {
    origin:
      !configuredOrigins || configuredOrigins === '*'
        ? true
        : configuredOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
  },
})
export class LiveGateway
  implements
    OnModuleInit,
    OnModuleDestroy,
    OnGatewayConnection,
    OnGatewayDisconnect
{
  private readonly logger = new Logger(LiveGateway.name);
  private updatesSubscription?: Subscription;

  @WebSocketServer()
  server: Server;

  constructor(private readonly liveService: LiveService) {}

  onModuleInit(): void {
    this.updatesSubscription = this.liveService
      .stream()
      .subscribe((update) => this.broadcast(update));
  }

  onModuleDestroy(): void {
    this.updatesSubscription?.unsubscribe();
  }

  handleConnection(client: Socket): void {
    client.emit('ready', {
      namespace: '/matches',
      events: ['live:update'],
      ts: Date.now(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:match')
  async subscribeToMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId?: string },
  ): Promise<{ ok: boolean; matchId?: string; error?: string }> {
    const matchId = body?.matchId?.trim();
    if (!matchId || matchId.length > 200) {
      return { ok: false, error: 'A valid matchId is required' };
    }

    await this.liveService.subscribeToMatch(matchId);
    await client.join(this.matchRoom(matchId));
    return { ok: true, matchId };
  }

  @SubscribeMessage('unsubscribe:match')
  async unsubscribeFromMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId?: string },
  ): Promise<{ ok: boolean; matchId?: string; error?: string }> {
    const matchId = body?.matchId?.trim();
    if (!matchId) return { ok: false, error: 'A valid matchId is required' };
    await client.leave(this.matchRoom(matchId));
    return { ok: true, matchId };
  }

  private broadcast(update: LiveUpdate): void {
    this.server.emit('live:update', update);
    this.server.to(this.matchRoom(update.matchId)).emit('match:update', update);
  }

  private matchRoom(matchId: string): string {
    return `match:${matchId}`;
  }
}
