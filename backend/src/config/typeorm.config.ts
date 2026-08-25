import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const buildTypeOrmOptions = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get<string>('db.host'),
  port: config.get<number>('db.port'),
  username: config.get<string>('db.username'),
  password: config.get<string>('db.password'),
  database: config.get<string>('db.database'),
  autoLoadEntities: true,
  // synchronize cria/ajusta as tabelas sozinho.
  synchronize: config.get<string>('nodeEnv') !== 'production',
  logging: config.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
});
