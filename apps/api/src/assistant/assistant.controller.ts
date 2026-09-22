import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AssistantService } from './assistant.service.js';
import { AssistantAskDto } from './dto/assistant-ask.dto.js';

@ApiTags('assistant')
@Controller('assistant')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('ask')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Cricket AI assistant (retrieve-then-explain)',
    description:
      'Classifies intent, loads verified stats from Postgres, optionally rephrases via LLM when ASSISTANT_LLM_ENABLED=true.',
  })
  ask(@Body() dto: AssistantAskDto) {
    return this.assistant.ask(dto);
  }
}
