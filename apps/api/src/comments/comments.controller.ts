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
import { CommentsService } from './comments.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  CreateCommentDto,
  CreateReactionDto,
  CommentListQuery,
  ReactionQuery,
  CommentDto,
  ReactionCountsDto,
} from './dto/comments.dto.js';

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('comments')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List comments for a target (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated comments.' })
  async listComments(
    @Request() req: { user?: { id: string } },
    @Query() query: CommentListQuery,
  ) {
    return this.commentsService.listComments(req.user?.id ?? null, query);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment' })
  @ApiResponse({ status: 201, type: CommentDto })
  async createComment(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(req.user.id, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Deleted.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async deleteComment(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.commentsService.deleteComment(req.user.id, id);
  }

  @Get('reactions')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Get reaction counts for a target' })
  @ApiResponse({ status: 200, type: ReactionCountsDto })
  async getReactionCounts(@Query() query: ReactionQuery) {
    return this.commentsService.getReactionCounts(query);
  }

  @Post('reactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add/toggle a reaction' })
  @ApiResponse({ status: 201, description: 'Reaction toggled.' })
  async toggleReaction(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReactionDto,
  ) {
    return this.commentsService.toggleReaction(req.user.id, dto);
  }
}
