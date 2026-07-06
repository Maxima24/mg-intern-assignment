import { Global, Module } from '@nestjs/common';
import { SetuClient } from './setu.client';

/** Global so EsignModule (and the webhook controller) can inject the one client. */
@Global()
@Module({
  providers: [SetuClient],
  exports: [SetuClient],
})
export class SetuModule {}
