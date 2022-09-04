import prisma from "../prisma";
import { Client, TextChannel } from "discord.js";
import { Guild as PrismaGuild, Prisma } from "@prisma/client";

export type GuildModel = PrismaGuild;

export type GuildServerFull = Prisma.GuildServerTrackGetPayload<{
  include: { server: true; guild: true };
}>;

const Guild = {
  updateGuilds: async function (client: Client) {
    const guilds = client.guilds.cache.map((guild) => guild);

    // Delete removed guilds
    await prisma.guild.deleteMany({
      where: {
        id: {
          notIn: guilds.map((g) => g.id),
        },
      },
    });

    for (const guild of guilds) {
      await prisma.guild.upsert({
        where: {
          id: guild.id,
        },
        update: {
          name: guild.name,
        },
        create: {
          id: guild.id,
          name: guild.name,
        },
      });
    }

    console.log(`Guilds: ${guilds.map((g) => g.name).join(", ")}`);
  },
  //
  // updateOverview: (guildId: string) => {
  //   TaskQueue.addTask(async () => {
  //     const discordGuild = await client.guilds.fetch(guildId);
  //
  //     if (!discordGuild) return;
  //
  //     const embeds = await getOverviewEmbeds(discordGuild);
  //     const messages = await PersistentMessage.getMessages(
  //       discordGuild,
  //       "overview",
  //       embeds.length
  //     );
  //
  //     if (!messages) return;
  //
  //     messages.map(async (m, index) => {
  //       try {
  //         await m.edit({ content: "", embeds: [embeds[index]] });
  //       } catch (e) {
  //         console.error(e);
  //       }
  //     });
  //   }, `overview-${guildId}`);
  // },
  //
  // updateAllOverviews: async function () {
  //   const allGuilds = await prisma.guild.findMany({});
  //   console.log(
  //     "Updating overviews for" + allGuilds.map((g) => g.name).join(", ")
  //   );
  //
  //   for (const guild of allGuilds) {
  //     await Guild.updateOverview(guild.id);
  //   }
  //
  //   console.log("Overviews updated.");
  // },
  getGuildServer: async function (
    channel: TextChannel
  ): Promise<GuildServerFull | undefined> {
    return (
      (await prisma.guildServerTrack
        .findUnique({
          where: {
            channelId_guildId: {
              guildId: channel.guildId,
              channelId: channel.id,
            },
          },
          include: {
            server: true,
            guild: true,
          },
        })
        .catch(console.error)) || undefined
    );
  },
};

export default Guild;
