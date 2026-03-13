import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { AppModule } from './app.module'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'
import { writeFileSync } from 'fs'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new AllExceptionsFilter())
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  const publicDir = join(__dirname, '..', 'public')
  app.useStaticAssets(publicDir)

  const config = new DocumentBuilder()
    .setTitle('Todo API')
    .setDescription('基于 NestJS + Prisma + Redis 的 Todo 接口')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, document, { customSiteTitle: 'Todo API 文档' })
  // 生成 openapi.json 文件
  writeFileSync('openapi.json', JSON.stringify(document, null, 2))
  console.log('openapi.json 文件已生成')

  const port = parseInt(process.env.PORT ?? '3000', 10)
  await app.listen(port)

  console.log(`服务已启动: http://localhost:${port}`)
  console.log(`健康检查: http://localhost:${port}/health`)
  console.log(`接口文档: http://localhost:${port}/api-docs`)
}

bootstrap()
