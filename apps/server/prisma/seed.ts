import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const client = await prisma.user.upsert({
    where: { telegramId: '100000001' },
    update: {},
    create: {
      telegramId: '100000001',
      chatId: '100000001',
      firstName: 'Тест',
      lastName: 'Клиент',
      role: 'CLIENT',
      language: 'ru',
    },
  })

  const serviceUser = await prisma.user.upsert({
    where: { telegramId: '100000002' },
    update: {},
    create: {
      telegramId: '100000002',
      chatId: '100000002',
      firstName: 'Тест',
      lastName: 'Сервис',
      role: 'SERVICE',
      language: 'ru',
    },
  })

  await prisma.serviceProfile.upsert({
    where: { userId: serviceUser.id },
    update: {},
    create: {
      userId: serviceUser.id,
      name: 'Авто Мастер Плюс',
      address: 'Ереван, ул. Тестовая 1',
      district: 'Kentron',
      phoneNumber: '+37400000000',
      specializations: ['BODY_PAINT', 'ENGINE_CHASSIS'],
      isVerified: true,
      isActive: true,
      photos: [],
    },
  })

  console.log('Seeded test users:', { client: client.id, service: serviceUser.id })
}

main().finally(() => prisma.$disconnect())
