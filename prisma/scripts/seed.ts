import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const playSessions = await prisma.playSession.findMany({
    where: {
      player: {
        id: "990467569",
      },
    },
  });

  playSessions.sort((a, b) => a.start.getTime() - b.start.getTime());
  console.log(playSessions[0].start);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
