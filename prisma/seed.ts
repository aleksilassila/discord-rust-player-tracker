import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const playersToAdd: Prisma.PlayerCreateArgs["data"][] = [
    { id: "990467569", name: "punked adunked paranoid.gg" },
    { id: "337513411", name: "aimless" },
    { id: "73044459", name: "powow" },
    { id: "73520738", name: ".CpiX" },
    { id: "978492666", name: "g0ne" },
    { id: "496710410", name: "Punisher" },
    { id: "598512007", name: "order66.exe" },
    { id: "898598573", name: "quArex ‘" },
    { id: "452103849", name: "KAPTEN" },
    { id: "1102306991", name: "PUTINHUJLO" },
    { id: "907725702", name: "OxyT" },
    { id: "941749375", name: "T0XIC" },
    { id: "284370632", name: "么 Bahsusiwja" },
    { id: "240949883", name: "Fizzla" },
    { id: "100704904", name: "Peppa Pig" },
    { id: "473315224", name: "ValtsU" },
    { id: "444250942", name: "Lester-_-#RustClash" },
    { id: "895084784", name: "slapnut" },
    { id: "1104521873", name: "Battery paranoid.gg" },
    { id: "78609924", name: "M1niBonD paranoid.gg" },
    { id: "191172820", name: "300eAthletes" },
    { id: "906804099", name: "THEDUKEOFNUKE" },
  ];

  for (const player of playersToAdd) {
    try {
      await prisma.player.create({
        data: player,
      });
    } catch (e) {
      console.error(e);
    }
  }

  await prisma.guild.upsert({
    where: {
      id: "923259625145524354",
    },
    update: {},
    create: {
      id: "923259625145524354",
      name: "0x3A7F14's server",
    },
  });

  for (const player of playersToAdd) {
    try {
      await prisma.guildPlayerTracks.create({
        data: {
          playerId: player.id,
          guildId: "923259625145524354",
          nickname: player.name,
        },
      });
    } catch (e) {
      console.error(e);
    }
  }
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
