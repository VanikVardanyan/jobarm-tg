import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { nameRu: 'Сантехника', nameEn: 'Plumbing', nameHy: 'Սանտեխնիկա' },
  { nameRu: 'Электрик', nameEn: 'Electrician', nameHy: 'Էլեկտրիկ' },
  { nameRu: 'Уборка', nameEn: 'Cleaning', nameHy: 'Մաքրություն' },
  { nameRu: 'Грузчик', nameEn: 'Moving', nameHy: 'Բեռնակիր' },
  { nameRu: 'Ремонт техники', nameEn: 'Appliance Repair', nameHy: 'Տեխնիկայի վերանորոգում' },
  { nameRu: 'Строительство', nameEn: 'Construction', nameHy: 'Շինարարություն' },
  { nameRu: 'Малярные работы', nameEn: 'Painting', nameHy: 'Ներկարարություն' },
  { nameRu: 'Репетитор', nameEn: 'Tutor', nameHy: 'Կրկնուսույց' },
  { nameRu: 'Курьер', nameEn: 'Courier', nameHy: 'Սուրհանդակ' },
  { nameRu: 'Водитель', nameEn: 'Driver', nameHy: 'Վարորդ' },
  { nameRu: 'Риелтор', nameEn: 'Realtor', nameHy: 'Անշարժ գույքի գործակալ' },
  { nameRu: 'Авто ходовик', nameEn: 'Auto Chassis', nameHy: 'Խոդովիկ' },
  { nameRu: 'Авто малярка', nameEn: 'Auto Body Painting', nameHy: 'Ավտո ներկարարություն' },
  { nameRu: 'Другое', nameEn: 'Other', nameHy: 'Այլ' },
]

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { nameEn: cat.nameEn },
      update: { nameRu: cat.nameRu, nameHy: cat.nameHy },
      create: cat,
    })
  }
  console.log('Seeded categories')
}

main().finally(() => prisma.$disconnect())
