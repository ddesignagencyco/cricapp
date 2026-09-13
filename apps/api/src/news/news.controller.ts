import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import { NewsService } from './news.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import {
  CreateNewsDto,
  UpdateNewsDto,
  NewsListQuery,
  NewsArticleDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  NewsCategoryDto,
} from './dto/news.dto.js';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List news articles (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated articles.' })
  async list(@Query() query: NewsListQuery) {
    return this.newsService.list(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List news categories' })
  @ApiResponse({ status: 200, type: [NewsCategoryDto] })
  async listCategories() {
    return this.newsService.listCategories();
  }

  @Get('categories/:idOrSlug')
  @ApiOperation({ summary: 'Get a news category by ID or SEO slug' })
  @ApiResponse({ status: 200, type: NewsCategoryDto })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async getCategory(@Param('idOrSlug') idOrSlug: string) {
    return this.newsService.getCategory(idOrSlug);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get article by ID or slug' })
  @ApiParam({ name: 'idOrSlug', description: 'Article ID or slug' })
  @ApiResponse({ status: 200, type: NewsArticleDto })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  async getByIdOrSlug(@Param('idOrSlug') idOrSlug: string) {
    return this.newsService.getByIdOrSlug(idOrSlug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a news article (admin)' })
  @ApiResponse({ status: 201, type: NewsArticleDto })
  async create(@Request() req: { user: { id: string } }, @Body() dto: CreateNewsDto) {
    return this.newsService.create(dto, req.user.id);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a news category (admin)' })
  @ApiResponse({ status: 201, type: NewsCategoryDto })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.newsService.createCategory(dto);
  }

  @Patch('categories/:idOrSlug')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update a news category (admin)' })
  @ApiResponse({ status: 200, type: NewsCategoryDto })
  async updateCategory(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.newsService.updateCategory(idOrSlug, dto);
  }

  @Delete('categories/:idOrSlug')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete a news category (admin)' })
  @ApiResponse({ status: 200, description: 'Deleted.' })
  async removeCategory(@Param('idOrSlug') idOrSlug: string) {
    return this.newsService.removeCategory(idOrSlug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update a news article (admin)' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @ApiResponse({ status: 200, type: NewsArticleDto })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  async update(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete a news article (admin)' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @ApiResponse({ status: 200, description: 'Deleted.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  async remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
