import { Module } from '@nestjs/common';
import { OrgWriteController } from './org-write.controller';

@Module({
  controllers: [OrgWriteController],
})
export class OrgWriteModule {}
