import prisma from "../prisma";
import {
  bold,
  Client,
  TextChannel,
  Guild as DiscordGuild,
  EmbedBuilder,
} from "discord.js";
import { messages } from "../messages";
import { Guild } from "@prisma/client";
import { getServerInfo } from "../apis/battemetrics/get-server-info";

export type GuildModel = Guild;

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
  async getPersistentMessage(guild: DiscordGuild): Promise<EmbedBuilder> {
    const players = await prisma.guildPlayerTracks
      .findMany({
        where: {
          guildId: guild.id,
        },
        include: {
          player: {
            include: {
              sessions: true,
            },
          },
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

    const serverInfo = await prisma.guild
      .findUnique({
        where: { id: guild.id },
      })
      .then((g) => {
        if (g?.serverId) {
          return getServerInfo(g.serverId);
        }
      });

    return messages.trackReport(players, serverInfo);
  },
  async updatePersistentMessages(client: Client) {
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
                  await fetchedMessage.edit({
                    embeds: [await this.getPersistentMessage(guild)],
                  })
              )
              .catch((e) => {});
          } catch (error) {}
        });
      }
    });
  },
  async setTrackedServer(guildId: string, serverId: string | null) {
    return await prisma.guild.update({
      where: {
        id: guildId,
      },
      data: {
        serverId,
      },
    });
  },
});

export default Guild;
