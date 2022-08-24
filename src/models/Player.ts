import { Player as PrismaPlayer, PlaySession } from "@prisma/client";

import prisma from "../prisma";
import { PlayerInfo } from "../apis/battemetrics/get-player-info";
import { getSessions } from "../apis/battemetrics";
import Notifications from "./Notifications";
import Server from "./Server";

export type PlayerModel = PrismaPlayer;
export type TrackedPlayer = PlayerModel & {
  nickname: string;
  sessions: PlaySession[];
};

const Player = Object.assign(prisma.player, {
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
  async updatePlayerSessions(playerId: string, serverId?: string) {
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
      const server = await Server.getOrCreate(
        remoteSession.relationships.server.data.id
      );

      if (!server) continue;

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
          serverId: server.id,
        },
      });
    }

    await this.updatePlayerServer(playerId);
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
        await this.updatePlayerSessions(player.id, serverId || undefined);
      }
    }
  },
  async updatePlayerServer(playerId: string) {
    const lastSession = await prisma.playSession.findFirst({
      where: {
        playerId,
      },
      orderBy: {
        start: "desc",
      },
    });

    if (lastSession) {
      const oldPlayer = await prisma.player.findUnique({
        where: { id: playerId },
      });

      const newPlayer = await prisma.player.update({
        where: {
          id: playerId,
        },
        data: {
          serverId: lastSession.stop ? null : lastSession.serverId,
        },
      });

      if (oldPlayer && newPlayer && oldPlayer.serverId !== newPlayer.serverId) {
        await Notifications.sendNotifications(newPlayer);
      }
    }
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
