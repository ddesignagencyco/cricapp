import { Module } from '@nestjs/common';
import {
  ContactAdminController,
  ContactController,
} from './contact.controller.js';
import { ContactService } from './contact.service.js';

@Module({
  controllers: [ContactController, ContactAdminController],
  providers: [ContactService],
})
export class ContactModule {}
