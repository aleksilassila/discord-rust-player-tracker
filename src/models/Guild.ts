import prisma from "../prisma";
import {
  Client,
  EmbedBuilder,
  Guild as DiscordGuild,
  Message,
  TextChannel,
} from "discord.js";
import { Guild as PrismaGuild } from "@prisma/client";
import Server from "./Server";
import Player, { analyzePlayer } from "./Player";
import { syncGuildCommands } from "../deploy-commands";
import { client } from "../app";
import { renderOverviewEmbeds } from "../embeds/overview-embed";

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
    await this.updatePersistentMessage(guildId);
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
    await this.updatePersistentMessage(guildId);
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

  async getOverviewEmbeds(guild: DiscordGuild): Promise<EmbedBuilder[]> {
    const trackedServer = await prisma.rustServer
      .findFirst({
        where: {
          guilds: {
            some: {
              id: guild.id,
            },
          },
        },
      })
      .then((s) => s || undefined);

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
      .then((guildPlayerTracks) =>
        guildPlayerTracks.map((track) =>
          analyzePlayer(track.player, track.nickname, trackedServer)
        )
      );

    players.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }

      return (
        (a.offlineTimeMs || a.onlineTimeMs || 0) -
        (b.offlineTimeMs || b.onlineTimeMs || 0)
      );
    });

    return renderOverviewEmbeds(players, trackedServer);
  },

  async updatePersistentMessage(guildId: string) {
    const messages = await prisma.persistentMessage.findMany({
      where: {
        guildId,
        key: "overview",
      },
    });

    const discordGuild = await client.guilds.fetch(guildId);

    if (!messages || !discordGuild) return;

    const embeds = await this.getOverviewEmbeds(discordGuild);

    for (const message of messages) {
      await this.getGuildMessage(discordGuild, message.id).then(
        (discordMessage) => {
          if (discordMessage) {
            discordMessage.edit({ embeds: [embeds[message.pageIndex]] });
          }
        }
      );
    }
  },

  async updateAllPersistentMessages() {
    const allGuilds = await prisma.guild.findMany({});

    for (const guild of allGuilds) {
      await this.updatePersistentMessage(guild.id);
    }
  },

  async getGuildMessage(
    guild: DiscordGuild,
    messageId: string
  ): Promise<Message | undefined> {
    for (const channel of Array.from(guild.channels.cache.values())) {
      const textChannel = channel as TextChannel;
      const message = await textChannel.messages
        ?.fetch(messageId)
        .catch(() => {});

      if (message) return message;
    }

    return;
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
