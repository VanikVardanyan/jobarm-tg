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
  await prisma.category.createMany({ data: categories, skipDuplicates: true })
  console.log('Seeded categories')
}

main().finally(() => prisma.$disconnect())
