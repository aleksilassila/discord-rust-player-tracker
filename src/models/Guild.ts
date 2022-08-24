import prisma from "../prisma";
import {
  Client,
  EmbedBuilder,
  Guild as DiscordGuild,
  TextChannel,
} from "discord.js";
import { messages } from "../messages";
import { Guild as PrismaGuild } from "@prisma/client";
import { getServerInfo } from "../apis/battemetrics/get-server-info";
import Server from "./Server";
import Player from "./Player";
import { syncGuildCommands } from "../deploy-commands";

export type GuildModel = PrismaGuild;

const Guild = Object.assign(prisma.guild, {
  async trackPlayer(guildId: string, playerId: string, playerNickname: string) {
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });

    const guild = await prisma.guild.findUnique({
      where: {
        id: guildId,
      },
    });

    if (!player || !guild) return;

    await prisma.guildPlayerTracks.create({
      data: {
        playerId,
        guildId: guildId,
        nickname: playerNickname,
      },
    });

    await Player.updatePlayerSessions(playerId, guild.serverId || undefined);
    await syncGuildCommands(guildId);
  },
  async untrackPlayer(guildId: string, playerId: string): Promise<any> {
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });

    const guild = await prisma.guild.findUnique({
      where: {
        id: guildId,
      },
    });

    if (!player || !guild) return;

    const deleted = prisma.guildPlayerTracks
      .delete({
        where: {
          playerId_guildId: {
            playerId,
            guildId: guildId,
          },
        },
      })
      .catch(() => undefined);

    await syncGuildCommands(guildId);
    return deleted;
  },
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

  async getPersistentMessage(
    guild: DiscordGuild
  ): Promise<{ embeds: EmbedBuilder[] }> {
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
              name: "asc",
            },
          },
        ],
      })
      .then((t) => t.map((t) => ({ ...t.player, nickname: t.nickname })));

    const server = await prisma.guild
      .findUnique({
        where: { id: guild.id },
        include: {
          server: true,
        },
      })
      .then((g) => g?.server || undefined);

    return { embeds: [messages.trackStats(players, server)] };
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
                  await fetchedMessage.edit(
                    await this.getPersistentMessage(guild)
                  )
              )
              .catch((e) => {});
          } catch (error) {}
        });
      }
    });
  },

  async setTrackedServer(
    guildId: string,
    serverId?: string
  ): Promise<GuildModel | undefined> {
    if (!serverId) {
      return await prisma.guild.update({
        where: {
          id: guildId,
        },
        data: {
          serverId: null,
        },
      });
    }

    const server = await Server.getOrCreate(serverId);

    if (!server) return;

    return await prisma.guild.update({
      where: {
        id: guildId,
      },
      data: {
        serverId: server.id,
      },
    });
  },
});

export default Guild;
