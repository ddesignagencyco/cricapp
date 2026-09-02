import { Controller, Logger, Param, Sse } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { filter, map, merge, Observable, timer } from 'rxjs';
import { LiveService } from './live.service.js';

interface StreamEvent {
  data: string;
}

@ApiTags('live')
@Controller()
export class LiveController {
  private readonly logger = new Logger(LiveController.name);

  constructor(private readonly liveService: LiveService) {}

  @Sse('matches/live/stream')
  @ApiOperation({ summary: 'Subscribe to all live match updates (SSE)' })
  @ApiResponse({ status: 200, description: 'Server-Sent Events stream of live match updates.' })
  liveAll(): Observable<StreamEvent> {
    this.logger.log('SSE client connected to global live stream');
    void this.liveService.subscribeToAllLive().catch((e: Error) => {
      this.logger.error(`Failed to subscribe to live matches: ${e.message}`);
    });
    return merge(
      this.liveService.stream().pipe(map((u) => ({ data: JSON.stringify(u) }))),
      timer(0, 20000).pipe(map(() => ({ data: JSON.stringify({ type: 'ping', ts: Date.now() }) }))),
    );
  }

  @Sse('matches/:matchId/stream')
  @ApiOperation({ summary: 'Subscribe to updates for a single match (SSE)' })
  @ApiParam({ name: 'matchId', description: 'Provider match id (e.g. sr:match:66650320).' })
  @ApiResponse({ status: 200, description: 'Server-Sent Events stream for the given match.' })
  liveMatch(@Param('matchId') matchId: string): Observable<StreamEvent> {
    this.liveService.subscribeToMatch(matchId).catch((e: Error) => {
      this.logger.error(`Failed to subscribe to ${matchId}: ${e.message}`);
    });
    this.logger.log(`SSE client connected to match ${matchId}`);
    return merge(
      this.liveService
        .stream()
        .pipe(filter((u) => u.matchId === matchId))
        .pipe(map((u) => ({ data: JSON.stringify(u) }))),
      timer(0, 20000).pipe(map(() => ({ data: JSON.stringify({ type: 'ping', ts: Date.now() }) }))),
    );
  }
}
