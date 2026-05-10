import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { nameRu: "Сантехника", nameEn: "Plumbing", nameHy: "Սանտեխնիկ" },
  { nameRu: "Электрик", nameEn: "Electrician", nameHy: "Էլեկտրիկ" },
  { nameRu: "Уборка", nameEn: "Cleaning", nameHy: "Մաքրման ծառայություններ" },
  { nameRu: "Грузчик", nameEn: "Moving", nameHy: "Բանվոր / Բեռնափոխադրում" },
  { nameRu: "Ремонт техники", nameEn: "Appliance Repair", nameHy: "Կենցաղային տեխնիկայի վերանորոգում" },
  { nameRu: "Строительство", nameEn: "Construction", nameHy: "Շինարարական աշխատանքներ" },
  { nameRu: "Малярные работы", nameEn: "Painting", nameHy: "Ներկման աշխատանքներ" },
  { nameRu: "Репетитор", nameEn: "Tutor", nameHy: "Դասավանդող" },
  { nameRu: "Курьер", nameEn: "Courier", nameHy: "Առաքիչ" },
  { nameRu: "Водитель", nameEn: "Driver", nameHy: "Վարորդական ծառայություններ" },
  { nameRu: "Риелтор", nameEn: "Realtor", nameHy: "Անշարժ գույքի գործակալ" },
  { nameRu: "Авто ходовик", nameEn: "Auto Chassis", nameHy: "Խադավիկ" },
  { nameRu: "Авто малярка", nameEn: "Auto Body Painting", nameHy: "Ավտոփականագործ" },
  { nameRu: "Другое", nameEn: "Other", nameHy: "Այլ ծառայություններ" },
];

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { nameEn: cat.nameEn },
      update: { nameRu: cat.nameRu, nameHy: cat.nameHy },
      create: cat,
    });
  }
  console.log("Seeded categories");
}

main().finally(() => prisma.$disconnect());
