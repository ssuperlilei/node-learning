/**
 * Swagger 配置：加载 OpenAPI 文档并暴露 /api-docs
 * 不在加载时引用 config，避免与入口的加载顺序导致导出异常
 */
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';
import * as path from 'path';
import * as fs from 'fs';

function loadSpec(port: number): Record<string, unknown> {
  let spec: Record<string, unknown> = {};
  try {
    const jsonPath = path.join(__dirname, 'swagger.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    spec = JSON.parse(raw) as Record<string, unknown>;
    if (spec.servers && Array.isArray(spec.servers) && (spec.servers as unknown[])[0]) {
      (spec.servers as { url?: string }[])[0].url = `http://localhost:${port}`;
    }
  } catch (_e) {
    spec = { openapi: '3.0.0', info: { title: 'Todo API', version: '1.0.0' }, paths: {} };
  }
  return spec;
}

export function setupSwagger(app: Express, basePath = '/api-docs', port = 3000): void {
  const spec = loadSpec(port);
  app.use(basePath, swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'Todo API 文档' }));
}
