import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/client'

let prisma: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!prisma) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL 未配置，无法初始化 PrismaClient')
    }
    const adapter = new PrismaMariaDb(url)
    prisma = new PrismaClient({ adapter })
  }
  return prisma
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
