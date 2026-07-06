import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/** Global so EsignService can inject the one storage client. */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
