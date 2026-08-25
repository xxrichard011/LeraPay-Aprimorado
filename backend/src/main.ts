import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { friendlyValidationExceptionFactory } from './common/validation/validation-exception-factory';

// Ponto de entrada: sobe o Nest, configura validação/erros/logs globais e o Swagger
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true, rawBody: true });
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: friendlyValidationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Documentação interativa da API, fica disponível em /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VBA Systems - BaaS API')
    .setDescription(
      'API da aplicação Banking as a Service, integrada ao gateway de pagamento Lera Box.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`BaaS API rodando em http://localhost:${port} (Swagger em /docs)`);
}

bootstrap();
