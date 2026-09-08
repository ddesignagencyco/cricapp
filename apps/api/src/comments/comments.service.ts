import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import type { CreateCommentDto, CreateReactionDto, CommentListQuery, ReactionQuery } from './dto/comments.dto.js';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listComments(userId: string | null, query: CommentListQuery) {
    const { page, limit, skip } = getPaginationOffset(query.page, query.limit, query.offset);

    const where = { targetType: query.targetType, targetId: query.targetId };

    const [rows, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: { user: { select: { id: true, username: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return createPaginatedResponse(rows, total, page, limit);
  }

  async createComment(userId: string, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        body: dto.body,
      },
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new NotFoundException('Comment not found');

    await this.prisma.reaction.deleteMany({ where: { commentId } });
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  private async validateComment(commentId?: string) {
    if (!commentId || commentId === 'string') return;
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new BadRequestException(`Comment ${commentId} does not exist`);
  }

  async toggleReaction(userId: string, dto: CreateReactionDto) {
    await this.validateComment(dto.commentId);

    const existing = await this.prisma.reaction.findUnique({
      where: { userId_targetType_targetId_emoji: { userId, targetType: dto.targetType, targetId: dto.targetId, emoji: dto.emoji } },
    });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      return { toggled: 'removed', emoji: dto.emoji };
    }

    await this.prisma.reaction.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        emoji: dto.emoji,
        commentId: dto.commentId,
      },
    });
    return { toggled: 'added', emoji: dto.emoji };
  }

  async getReactionCounts(query: ReactionQuery) {
    const reactions = await this.prisma.reaction.findMany({
      where: { targetType: query.targetType, targetId: query.targetId },
      select: { emoji: true },
    });

    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    }

    return { counts, emojis: Object.keys(counts) };
  }
}
