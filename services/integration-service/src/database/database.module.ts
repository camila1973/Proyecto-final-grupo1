import { Global, Module } from "@nestjs/common";
import { DatabaseProvider, KYSELY } from "./database.provider";

@Global()
@Module({
  providers: [
    DatabaseProvider,
    {
      provide: KYSELY,
      useFactory: (provider: DatabaseProvider) => provider.db,
      inject: [DatabaseProvider],
    },
  ],
  exports: [KYSELY],
})
export class DatabaseModule {}
