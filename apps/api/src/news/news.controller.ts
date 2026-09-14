import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
  CreateAuthorDto,
  UpdateAuthorDto,
  AuthorArticlesQuery,
  UpsertEditorialPageDto,
} from './dto/news.dto.js';

@ApiTags('news')
@Controller('news')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
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

  @Get('google-news-sitemap.xml')
  @ApiOperation({ summary: 'Google News sitemap for articles from the last 48 hours' })
  async googleNewsSitemap(@Res() response: Response) {
    const xml = await this.newsService.googleNewsSitemap();
    response.type('application/xml').send(xml);
  }

  @Get(':idOrSlug/seo')
  @ApiOperation({ summary: 'Get canonical URL, hreflang variants and NewsArticle JSON-LD' })
  async getSeoPayload(@Param('idOrSlug') idOrSlug: string) {
    return this.newsService.getSeoPayload(idOrSlug);
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

  @Post(':id/translations')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Author and link a separate en/ur article variant' })
  async createTranslation(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CreateNewsDto,
  ) {
    return this.newsService.createTranslation(id, dto, req.user.id);
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

@ApiTags('authors')
@Controller('authors')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AuthorsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'List public author profiles' })
  list() {
    return this.newsService.listAuthors();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get an author profile and published articles by id or slug' })
  get(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: AuthorArticlesQuery,
  ) {
    return this.newsService.getAuthor(idOrSlug, query);
  }
}

@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/authors')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AuthorsAdminController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  list() {
    return this.newsService.listAuthors();
  }

  @Post()
  create(@Body() dto: CreateAuthorDto) {
    return this.newsService.createAuthor(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAuthorDto) {
    return this.newsService.updateAuthor(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.newsService.removeAuthor(id);
  }
}

@ApiTags('editorial')
@Controller('editorial-pages')
export class EditorialPagesController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  list() {
    return this.newsService.listEditorialPages();
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.newsService.getEditorialPage(slug);
  }
}

@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/editorial-pages')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EditorialPagesAdminController {
  constructor(private readonly newsService: NewsService) {}

  @Put(':slug')
  upsert(
    @Param('slug') slug: string,
    @Body() dto: UpsertEditorialPageDto,
  ) {
    return this.newsService.upsertEditorialPage(slug, dto);
  }
}
