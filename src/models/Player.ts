import { Player as PrismaPlayer, PlaySession } from "@prisma/client";

import prisma from "../prisma";
import { PlayerInfo } from "../apis/battemetrics/get-player-info";
import { getSessions } from "../apis/battemetrics";
import { Guild, Guild as DiscordGuild } from "discord.js";
import Notifications from "./Notifications";
import { syncCommands } from "../deploy-commands";

export type PlayerModel = PrismaPlayer;
export type TrackedPlayer = PlayerModel & {
  nickname: string;
  sessions: PlaySession[];
};

const Player = Object.assign(prisma.player, {
  async trackPlayer(
    playerId: string,
    discordGuild: Guild,
    playerNickname: string
  ) {
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });

    const guild = await prisma.guild.findUnique({
      where: {
        id: discordGuild.id,
      },
    });

    if (!player || !guild) return;

    await prisma.guildPlayerTracks.create({
      data: {
        playerId,
        guildId: discordGuild.id,
        nickname: playerNickname,
      },
    });

    await this.updateSessions(playerId, guild.serverId || undefined);
    await syncCommands(discordGuild);
  },
  async untrackPlayer(playerId: string, discordGuild: Guild): Promise<any> {
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });

    const guild = await prisma.guild.findUnique({
      where: {
        id: discordGuild.id,
      },
    });

    if (!player || !guild) return;

    const deleted = prisma.guildPlayerTracks
      .delete({
        where: {
          playerId_guildId: {
            playerId,
            guildId: discordGuild.id,
          },
        },
      })
      .catch(() => undefined);

    await syncCommands(discordGuild);
    return deleted;
  },
  async createPlayer(playerInfo: PlayerInfo) {
    return prisma.player.upsert({
      where: {
        id: playerInfo.id,
      },
      update: {},
      create: {
        id: playerInfo.id,
        name: playerInfo.attributes.name,
      },
    });
  },
  async updateSessions(playerId: string, serverId?: string) {
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
      include: {
        sessions: true,
      },
    });

    if (!player) return;

    const remoteSessions = await getSessions(
      player.id,
      serverId ? [serverId] : undefined
    ).catch(console.error);
    if (!remoteSessions) return;

    for (const remoteSession of remoteSessions) {
      await prisma.playSession.upsert({
        where: {
          id: remoteSession.id,
        },
        update: {
          stop: remoteSession.attributes.stop,
        },
        create: {
          id: remoteSession.id,
          start: remoteSession.attributes.start,
          stop: remoteSession.attributes.stop,
          playerId: playerId,
          serverId: remoteSession.relationships?.server?.data?.id,
        },
      });
    }

    await this.updateOnlineStatus(playerId);
  },
  async updateAllSessions() {
    const players = await prisma.player.findMany({
      include: {
        guilds: {
          include: {
            guild: true,
          },
        },
      },
    });

    for (const player of players) {
      const uniqueServerIds = Array.from(
        new Set(player.guilds.map((g) => g.guild.serverId))
      );

      for (const serverId of uniqueServerIds) {
        await this.updateSessions(player.id, serverId || undefined);
      }
    }
  },
  async updateOnlineStatus(playerId: string) {
    await prisma.playSession
      .findFirst({
        where: {
          playerId,
        },
        orderBy: {
          start: "desc",
        },
      })
      .then(async (session) => {
        if (session) {
          const oldPlayer = await prisma.player.findUnique({
            where: { id: playerId },
          });

          const newPlayer = await prisma.player.update({
            where: {
              id: playerId,
            },
            data: {
              online: !session.stop,
            },
          });

          if (oldPlayer && newPlayer && oldPlayer.online !== newPlayer.online) {
            await Notifications.sendNotifications(newPlayer);
          }
        }
      });
  },
});

export const getLastSession = function (
  sessions: PlaySession[],
  serverId?: string
): PlaySession | null {
  const sorted = sessions
    .filter((s) => !serverId || s.serverId === serverId)
    .sort((a, b) => b.start.getTime() - a.start.getTime());
  if (!sorted.length) return null;

  return sorted[0];
};

export default Player;
