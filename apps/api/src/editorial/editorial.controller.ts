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
} from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { EditorialGuard, EditorGuard } from '../auth/editorial.guard.js';
import { EditorialService } from './editorial.service.js';
import {
  CreateNewsDto,
  UpdateNewsDto,
  NewsListQuery,
  BulkNewsActionDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateAuthorDto,
  UpdateAuthorDto,
  UpsertEditorialPageDto,
} from '../news/dto/news.dto.js';

class UpsertMyProfileDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@ApiTags('editorial')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, EditorialGuard)
@Controller('editorial')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EditorialController {
  constructor(private readonly editorialService: EditorialService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get role-scoped editorial dashboard overview' })
  getOverview(@Request() req: { user: { id: string } }) {
    return this.editorialService.getOverview(req.user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get the current user linked author profile' })
  getMyProfile(@Request() req: { user: { id: string } }) {
    return this.editorialService.getMyProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Create or update the current user linked author profile' })
  upsertMyProfile(
    @Request() req: { user: { id: string } },
    @Body() dto: UpsertMyProfileDto,
  ) {
    return this.editorialService.upsertMyProfile(req.user.id, dto);
  }

  @Get('articles')
  @ApiOperation({ summary: 'List articles scoped to author or all for editors' })
  listArticles(
    @Request() req: { user: { id: string } },
    @Query() query: NewsListQuery,
  ) {
    return this.editorialService.listArticles(req.user.id, query);
  }

  @Get('articles/:id')
  @ApiOperation({ summary: 'Get article by ID for editorial editing' })
  getArticle(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.editorialService.getArticle(req.user.id, id);
  }

  @Post('articles')
  @ApiOperation({ summary: 'Create a new article (author or editor)' })
  createArticle(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateNewsDto,
  ) {
    return this.editorialService.createArticle(req.user.id, dto);
  }

  @Patch('articles/:id')
  @ApiOperation({ summary: 'Update an article (owner author or editor)' })
  updateArticle(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateNewsDto,
  ) {
    return this.editorialService.updateArticle(req.user.id, id, dto);
  }

  @Delete('articles/:id')
  @ApiOperation({ summary: 'Delete an article (owner author or editor)' })
  deleteArticle(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.editorialService.deleteArticle(req.user.id, id);
  }

  @Post('articles/:id/translations')
  @ApiOperation({ summary: 'Create an article translation (owner author or editor)' })
  createTranslation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: CreateNewsDto,
  ) {
    return this.editorialService.createTranslation(req.user.id, id, dto);
  }

  @Post('articles/bulk')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'Bulk update or delete articles (editor/admin)' })
  bulkAction(
    @Request() req: { user: { id: string } },
    @Body() dto: BulkNewsActionDto,
  ) {
    return this.editorialService.bulkAction(req.user.id, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List news categories for editorial studio' })
  listCategories() {
    return this.editorialService.listCategories();
  }

  @Post('categories')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'Create a category (editor/admin)' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.editorialService.createCategory(dto);
  }

  @Patch('categories/:idOrSlug')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'Update a category (editor/admin)' })
  updateCategory(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.editorialService.updateCategory(idOrSlug, dto);
  }

  @Delete('categories/:idOrSlug')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'Delete a category (editor/admin)' })
  removeCategory(@Param('idOrSlug') idOrSlug: string) {
    return this.editorialService.removeCategory(idOrSlug);
  }

  @Get('authors')
  @ApiOperation({ summary: 'List authors for editorial studio' })
  listAuthors() {
    return this.editorialService.listAuthors();
  }

  @Post('authors')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'Create an author (editor/admin)' })
  createAuthor(@Body() dto: CreateAuthorDto) {
    return this.editorialService.createAuthor(dto);
  }

  @Patch('authors/:id')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'Update an author (editor/admin)' })
  updateAuthor(@Param('id') id: string, @Body() dto: UpdateAuthorDto) {
    return this.editorialService.updateAuthor(id, dto);
  }

  @Delete('authors/:id')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'Delete an author (editor/admin)' })
  removeAuthor(@Param('id') id: string, @Query('reassignTo') reassignTo?: string) {
    return this.editorialService.removeAuthor(id, reassignTo?.trim() || undefined);
  }

  @Get('pages')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'List editorial policy pages (editor/admin)' })
  listEditorialPages() {
    return this.editorialService.listEditorialPages();
  }

  @Put('pages/:slug')
  @UseGuards(EditorGuard)
  @ApiOperation({ summary: 'Create or update an editorial policy page (editor/admin)' })
  upsertEditorialPage(
    @Param('slug') slug: string,
    @Body() dto: UpsertEditorialPageDto,
  ) {
    return this.editorialService.upsertEditorialPage(slug, dto);
  }
}
