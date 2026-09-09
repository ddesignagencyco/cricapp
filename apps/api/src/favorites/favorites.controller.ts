import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AddFavoriteDto, FavoriteListQuery, FavoriteDto } from './dto/favorites.dto.js';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List user favorites (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated favorites.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async list(@Request() req: { user: { id: string } }, @Query() query: FavoriteListQuery) {
    return this.favoritesService.list(req.user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Add a favorite' })
  @ApiResponse({ status: 201, type: FavoriteDto })
  @ApiResponse({ status: 409, description: 'Already in favorites.' })
  async add(@Request() req: { user: { id: string } }, @Body() dto: AddFavoriteDto) {
    return this.favoritesService.add(req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a favorite' })
  @ApiParam({ name: 'id', description: 'Favorite ID' })
  @ApiResponse({ status: 200, description: 'Deleted.' })
  @ApiResponse({ status: 404, description: 'Favorite not found.' })
  async remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.favoritesService.remove(req.user.id, id);
  }
}
