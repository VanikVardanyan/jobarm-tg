import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { nameRu: 'Сантехника', nameEn: 'Plumbing' },
  { nameRu: 'Электрик', nameEn: 'Electrician' },
  { nameRu: 'Уборка', nameEn: 'Cleaning' },
  { nameRu: 'Грузчик', nameEn: 'Moving' },
  { nameRu: 'Ремонт техники', nameEn: 'Appliance Repair' },
  { nameRu: 'Строительство', nameEn: 'Construction' },
  { nameRu: 'Малярные работы', nameEn: 'Painting' },
  { nameRu: 'Репетитор', nameEn: 'Tutor' },
  { nameRu: 'Курьер', nameEn: 'Courier' },
  { nameRu: 'Другое', nameEn: 'Other' },
]

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { nameEn: cat.nameEn },
      update: { nameRu: cat.nameRu },
      create: cat,
    })
  }
  console.log('Seeded categories')
}

main().finally(() => prisma.$disconnect())
