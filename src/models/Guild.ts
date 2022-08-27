import prisma from "../prisma";
import { Client, EmbedBuilder, Guild as DiscordGuild } from "discord.js";
import { Guild as PrismaGuild } from "@prisma/client";
import Server from "./Server";
import Player, { analyzePlayer } from "./Player";
import { syncGuildCommands } from "../deploy-commands";
import { client } from "../app";
import { renderOverviewEmbeds } from "../embeds/overview-embed";
import PersistentMessage from "./PersistentMessage";
import TaskQueue from "../task-queue";

export type GuildModel = PrismaGuild;

const Guild = {
  trackPlayer: async function (
    guildId: string,
    playerId: string,
    playerNickname: string
  ) {
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
      include: {
        sessions: true,
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

    await Player.updatePlayerSessions(player, guild.serverId || undefined);
    await syncGuildCommands(guildId);
    await Guild.updateOverview(guildId);
  },

  untrackPlayer: async function (
    guildId: string,
    playerId: string
  ): Promise<any> {
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
    await Guild.updateOverview(guildId);
    return deleted;
  },

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

  getOverviewEmbeds: async function (
    guild: DiscordGuild
  ): Promise<EmbedBuilder[]> {
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
              server: true,
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
          analyzePlayer(
            { ...track.player, server: track.player.server },
            track.nickname,
            trackedServer
          )
        )
      );

    players.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }

      if (a.serverId !== b.serverId) {
        return a.serverId ? -1 : 1;
      }

      return (
        (a.offlineTimeMs || a.onlineTimeMs || 0) -
        (b.offlineTimeMs || b.onlineTimeMs || 0)
      );
    });

    return renderOverviewEmbeds(players, trackedServer);
  },

  updateOverview: (guildId: string) => {
    TaskQueue.addTask(async () => {
      const discordGuild = await client.guilds.fetch(guildId);

      if (!discordGuild) return;

      const embeds = await Guild.getOverviewEmbeds(discordGuild);
      const messages = await PersistentMessage.getMessages(
        discordGuild,
        "overview",
        embeds.length
      );

      if (!messages) return;

      messages.map(async (m, index) => {
        try {
          await m.edit({ content: "", embeds: [embeds[index]] });
        } catch (e) {
          console.error(e);
        }
      });
    }, `overview-${guildId}`);
  },

  updateAllOverviews: async function () {
    const allGuilds = await prisma.guild.findMany({});
    console.log(
      "Updating overviews for" + allGuilds.map((g) => g.name).join(", ")
    );

    for (const guild of allGuilds) {
      await Guild.updateOverview(guild.id);
    }

    console.log("Overviews updated.");
  },

  unsetTrackedServer: async function (guildId: string) {
    await prisma.guild.update({
      where: {
        id: guildId,
      },
      data: {
        server: {
          disconnect: true,
        },
      },
    });
  },

  setTrackedServer: async function (
    guildId: string,
    serverId?: string
  ): Promise<GuildModel | undefined> {
    const server = serverId ? await Server.updateOrCreate(serverId) : undefined;

    if (serverId && !server) return;

    const update = await prisma.guild.update({
      where: {
        id: guildId,
      },
      data: {
        serverId: server?.id,
      },
    });

    await Guild.updateOverview(guildId);
    return update;
  },
};

export default Guild;
