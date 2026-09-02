import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

@ApiTags('health')
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'API health status', description: 'Returns an HTML page showing the health of the API and its dependencies.' })
  @ApiResponse({ status: 200, description: 'Health status page.' })
  async health(): Promise<string> {
    const startedAt = new Date();
    const checks = await Promise.allSettled([
      this.checkApi(),
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const results = checks.map((r, i) => {
      const name = ['API', 'PostgreSQL', 'Redis'][i];
      if (r.status === 'fulfilled') return { name, ...r.value };
      return { name, status: 'unhealthy' as const, message: r.reason?.message ?? 'Unknown error' };
    });

    const allHealthy = results.every((r) => r.status === 'healthy');
    const overallStatus = allHealthy ? 'healthy' : 'degraded';

    const elapsed = Date.now() - startedAt.getTime();

    return this.renderPage(overallStatus, results, elapsed);
  }

  private async checkApi() {
    return { status: 'healthy' as const, message: `Node ${process.version}` };
  }

  private async checkPostgres() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const matchCount = await this.prisma.match.count();
      return { status: 'healthy' as const, message: `${matchCount} matches in database` };
    } catch (e: any) {
      return { status: 'unhealthy' as const, message: e.message };
    }
  }

  private async checkRedis() {
    try {
      const pong = await this.redis.cached.ping();
      return { status: 'healthy' as const, message: pong };
    } catch (e: any) {
      return { status: 'unhealthy' as const, message: e.message };
    }
  }

  private renderPage(
    overallStatus: string,
    results: { name: string; status: string; message: string }[],
    elapsed: number,
  ): string {
    const isHealthy = overallStatus === 'healthy';
    const statusColor = isHealthy ? '#16a34a' : '#dc2626';
    const statusBg = isHealthy ? '#f0fdf4' : '#fef2f2';
    const statusBorder = isHealthy ? '#bbf7d0' : '#fecaca';
    const statusLabel = isHealthy ? 'ALL SYSTEMS OPERATIONAL' : 'DEGRADED';

    const serviceCards = results
      .map((r) => {
        const ok = r.status === 'healthy';
        const dotColor = ok ? '#16a34a' : '#dc2626';
        const cardBg = ok ? '#f0fdf4' : '#fef2f2';
        const cardBorder = ok ? '#bbf7d0' : '#fecaca';
        return `
          <div class="card" style="border-color: ${cardBorder}; background: ${cardBg};">
            <div class="card-header">
              <span class="dot" style="background: ${dotColor};"></span>
              <span class="service-name">${r.name}</span>
              <span class="badge" style="color: ${dotColor};">${r.status.toUpperCase()}</span>
            </div>
            <div class="card-message">${r.message}</div>
          </div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CricApp API — Health</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 560px;
      padding: 2rem;
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: #22d3ee;
      letter-spacing: -0.02em;
    }
    .logo span { color: #16a34a; }
    .subtitle {
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .status-banner {
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
      margin-bottom: 1.5rem;
      border: 1px solid ${statusBorder};
      background: ${statusBg};
    }
    .status-banner .label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: ${statusColor};
    }
    .status-banner .dot-lg {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${statusColor};
      margin-right: 0.5rem;
      vertical-align: middle;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .cards { display: flex; flex-direction: column; gap: 0.75rem; }
    .card {
      border: 1px solid;
      border-radius: 10px;
      padding: 1rem 1.25rem;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .service-name {
      font-weight: 600;
      font-size: 0.95rem;
      color: #1e293b;
      flex: 1;
    }
    .badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .card-message {
      margin-top: 0.4rem;
      font-size: 0.8rem;
      color: #475569;
      padding-left: 1.1rem;
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.7rem;
      color: #475569;
    }
    .footer a { color: #22d3ee; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">cric<span>app</span></div>
      <div class="subtitle">API Health Status</div>
    </div>

    <div class="status-banner">
      <span class="dot-lg"></span>
      <span class="label">${statusLabel}</span>
    </div>

    <div class="cards">
      ${serviceCards}
    </div>

    <div class="footer">
      Checked in ${elapsed}ms &middot; ${new Date().toISOString()}<br />
      <a href="/docs">Swagger Docs</a>
    </div>
  </div>
</body>
</html>`;
  }
}
