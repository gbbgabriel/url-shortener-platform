import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { HashService } from '../common/services/hash.service';

@Module({
  providers: [UsersService, HashService],
  exports: [UsersService],
})
export class UsersModule {}
