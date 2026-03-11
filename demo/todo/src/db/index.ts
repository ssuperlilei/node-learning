import { getPrisma } from './prismaClient';

export async function ping(): Promise<boolean> {
  const prisma = getPrisma();
  try {
    // 简单查询一条记录，验证数据库连通性
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
