import {
  Player as PrismaPlayer,
  PlaySession as Session,
  Prisma,
  Server as RustServer,
} from "@prisma/client";

import prisma from "../prisma";
import {
  analyzeBedtimeSessions,
  BedtimeData,
  getTimeBetweenDates,
  getWipePlaytime,
} from "../utils";
import PlaySession from "./PlaySession";
import { getPlayerInfo } from "../apis/battemetrics/get-player-info";

export type PlayerModel = PrismaPlayer;

export type AnalyzedSession = Session & {};

export type PlayerWithRelations = Prisma.PlayerGetPayload<{
  include: {
    sessions: true;
    currentServer: true;
  };
}>;

export type AnalyzedPlayer = PlayerWithRelations & {
  nickname: string;
  sessions: AnalyzedSession[];
  offlineTimeMs?: number;
  onlineTimeMs?: number;
  isOnline: boolean;
  bedtimeData?: BedtimeData;
  wipePlaytimeMs?: number;
};

const Player = {
  /**
   * Updates or creates player's info and play sessions and returns the updated player.
   */
  updateOrCreate: async function (
    playerId: string,
    serverId?: string
  ): Promise<PrismaPlayer | undefined> {
    const playerInfo = await getPlayerInfo(playerId);
    const sessions = await PlaySession._updatePlayerSessions(
      playerId,
      serverId
    );

    if (!playerInfo || !sessions) {
      console.error("Could not fetch player info.", playerId);
      return undefined;
    }

    const name = playerInfo.attributes?.name;

    if (!name) {
      console.error("Error parsing fetched player.", playerId);
      return undefined;
    }

    return (
      (await prisma.player
        .upsert({
          where: {
            id: playerId,
          },
          update: {
            name,
            sessions: {
              connect: sessions.map((s) => ({ id: s.id })),
            },
          },
          create: {
            id: playerId,
            name,
            sessions: {
              connect: sessions.map((s) => ({ id: s.id })),
            },
          },
        })
        .catch(console.error)) || undefined
    );
  },

  // updateOrCreate: async function (
  //   player: PlayerModel,
  //   serverId?: string
  // ): Promise<PrismaPlayer | undefined> {
  //   const playerInfo = await getPlayerInfo(player.id);
  //   const name = playerInfo?.attributes?.name;
  //   if (!playerInfo || !name) return;
  //
  //   await PlaySession.updatePlayerSessions(
  //     player,
  //     serverId ? [serverId] : undefined
  //   );
  //
  //   return (
  //     (await prisma.player
  //       .update({
  //         where: {
  //           id: player.id,
  //         },
  //         data: {
  //           name,
  //         },
  //       })
  //       .catch(console.error)) || undefined
  //   );
  // },

  analyzePlayer: function (
    player: PlayerWithRelations,
    nickname: string,
    trackedServer?: RustServer
  ): AnalyzedPlayer {
    const isOnline = trackedServer
      ? player.serverId === trackedServer.id
      : !!player.serverId;

    const bedtimeData = analyzeBedtimeSessions(player.sessions);
    const lastSession = getLastSession(player.sessions);
    const wipePlaytimeMs = trackedServer
      ? getWipePlaytime(
          player.sessions.filter((s) => s.serverId === trackedServer.id),
          trackedServer.wipe
        )
      : undefined;

    let offlineTimeMs,
      onlineTimeMs = undefined;

    if (lastSession) {
      if (!isOnline && !!lastSession.stop) {
        offlineTimeMs = getTimeBetweenDates(new Date(), lastSession.stop);
      } else {
        onlineTimeMs = getTimeBetweenDates(new Date(), lastSession.start);
      }
    }

    return {
      ...player,
      nickname,
      isOnline,
      bedtimeData,
      offlineTimeMs,
      onlineTimeMs,
      wipePlaytimeMs,
    };
  },
};

export const getLastSession = function (
  sessions: Session[],
  serverId?: string
): Session | null {
  const sorted = sessions
    .filter((s) => !serverId || s.serverId === serverId)
    .sort((a, b) => b.start.getTime() - a.start.getTime());
  if (!sorted.length) return null;

  return sorted[0];
};

export default Player;
