import { Controller, Get, Patch, Post, Delete, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import {
  ListUsersQuery,
  UpdateUserDto,
  ModerateCommentDto,
  ResolveReportDto,
  CreateStreamDto,
} from './dto/admin.dto.js';
import { NewsListQuery, CreateAuthorDto, UpdateAuthorDto } from '../news/dto/news.dto.js';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiCookieAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated user list.' })
  async listUsers(@Query() query: ListUsersQuery) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (promote to admin, verify email, etc.)' })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUser(
    @Request() req: { user: { id: string; isSuperAdmin?: boolean } },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(req.user, id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user; the superadmin can never be deleted' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({ status: 403, description: 'Protected superadmin or own account.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async deleteUser(
    @Request() req: { user: { id: string; isSuperAdmin?: boolean } },
    @Param('id') id: string,
  ) {
    return this.adminService.deleteUser(req.user, id);
  }

  @Get('news')
  @ApiOperation({ summary: 'List all news articles including drafts (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated articles.' })
  async listNews(@Query() query: NewsListQuery) {
    return this.adminService.listNews(query);
  }

  @Get('authors')
  @ApiOperation({ summary: 'List editorial authors' })
  @ApiResponse({ status: 200, description: 'Author list.' })
  async listAuthors() {
    return this.adminService.listAuthors();
  }

  @Post('authors')
  @ApiOperation({ summary: 'Create an editorial author profile' })
  @ApiResponse({ status: 201, description: 'Author created.' })
  async createAuthor(@Body() dto: CreateAuthorDto) {
    return this.adminService.createAuthor(dto);
  }

  @Patch('authors/:id')
  @ApiOperation({ summary: 'Update an editorial author profile' })
  @ApiResponse({ status: 200, description: 'Author updated.' })
  async updateAuthor(@Param('id') id: string, @Body() dto: UpdateAuthorDto) {
    return this.adminService.updateAuthor(id, dto);
  }

  @Get('reported-comments')
  @ApiOperation({ summary: 'Get moderation queue (pending reports)' })
  @ApiResponse({ status: 200, description: 'List of reported comments.' })
  async listReportedComments() {
    return this.adminService.listReportedComments();
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Moderate a comment (approve/hide/delete)' })
  @ApiResponse({ status: 200, description: 'Comment status updated.' })
  async moderateComment(@Param('id') id: string, @Body() dto: ModerateCommentDto) {
    return this.adminService.moderateComment(id, dto);
  }

  @Patch('reports/:id')
  @ApiOperation({ summary: 'Resolve a comment report' })
  @ApiResponse({ status: 200, description: 'Report resolved.' })
  async resolveReport(@Param('id') id: string, @Body() dto: ResolveReportDto) {
    return this.adminService.resolveReport(id, dto);
  }

  @Post('streams')
  @ApiOperation({ summary: 'Create a new live stream entry' })
  @ApiResponse({ status: 201, description: 'Stream created.' })
  async createStream(@Body() dto: CreateStreamDto) {
    return this.adminService.createStream(dto);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get platform analytics dashboard data' })
  @ApiResponse({ status: 200, description: 'Analytics counts.' })
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('ingestion-health')
  @ApiOperation({ summary: 'Ingestion service health and sync staleness' })
  @ApiResponse({ status: 200, description: 'Ingestion health snapshot.' })
  async getIngestionHealth() {
    return this.adminService.getIngestionHealth();
  }
}
