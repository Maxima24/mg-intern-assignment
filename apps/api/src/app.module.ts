import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { appConfig } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { SetuModule } from './modules/setu/setu.module';
import { StorageModule } from './modules/storage/storage.module';
import { EsignModule } from './modules/esign/esign.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    PrismaModule,
    StorageModule,
    SetuModule,
    EsignModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
