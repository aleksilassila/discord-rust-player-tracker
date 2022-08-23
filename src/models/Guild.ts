import prisma from "../prisma";
import { bold, Client, TextChannel } from "discord.js";

const Guild = Object.assign(prisma.guild, {
  async updateGuilds(client: Client) {
    const guilds = client.guilds.cache.map((guild) => guild);
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
  async getTrackReport(guildId: string): Promise<string> {
    const players = await prisma.guildPlayerTracks
      .findMany({
        where: {
          guildId,
        },
        include: {
          player: true,
        },
        orderBy: [
          {
            player: {
              online: "desc",
            },
          },
          {
            player: {
              name: "asc",
            },
          },
        ],
      })
      .then((t) => t.map((t) => ({ ...t.player, nickname: t.nickname })));

    return `${players.filter((p) => p.online).length}/${
      players.length
    } of tracked players online:\n${players
      .map(
        (p) =>
          `> [${p.online ? "✅ Online" : "❌ Offline"}] ${bold(p.nickname)}`
      )
      .join("\n")}`;
  },
  async deliverTrackReports(client: Client) {
    await prisma.persistentMessage.findMany().then((messages) => {
      for (const message of messages) {
        const guild = client.guilds.cache.get(message.guildId);
        if (!guild) continue;

        guild.channels.cache.forEach((channel) => {
          try {
            const textChannel = channel as TextChannel;
            textChannel.messages
              .fetch(message.id)
              .then(
                async (fetchedMessage) =>
                  await fetchedMessage.edit(await this.getTrackReport(guild.id))
              )
              .catch((e) => {});
          } catch (error) {}
        });
      }
    });
  },
});

export default Guild;
