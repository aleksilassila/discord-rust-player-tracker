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
  timePlayedSince,
} from "../utils";
import Battlemetrics from "../apis/Battlemetrics";
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
  getOrCreate: async function (
    playerId: string
  ): Promise<PrismaPlayer | undefined> {
    let player = await prisma.player
      .findUnique({
        where: {
          id: playerId,
        },
      })
      .catch(console.error);

    if (player === null) {
      const playerInfo = await Battlemetrics.getPlayerInfo(playerId);

      if (!playerInfo) {
        console.error("Could not fetch player info.");
        return undefined;
      }

      console.log("Creating a new player " + playerInfo.attributes?.name);
      player = await prisma.player
        .create({
          data: {
            id: <any>playerInfo?.id,
            name: <any>playerInfo?.attributes?.name,
          },
        })
        .catch(console.error);

      if (player) await PlaySession.updatePlayerSessions(player);
    }

    return player || undefined;
  },

  update: async function (
    player: PlayerModel,
    serverId?: string
  ): Promise<PrismaPlayer | undefined> {
    const playerInfo = await getPlayerInfo(player.id);
    const name = playerInfo?.attributes?.name;
    if (!playerInfo || !name) return;

    await PlaySession.updatePlayerSessions(
      player,
      serverId ? [serverId] : undefined
    );

    return (
      (await prisma.player
        .update({
          where: {
            id: player.id,
          },
          data: {
            name,
          },
        })
        .catch(console.error)) || undefined
    );
  },

  // updateSessions: function (
  //   player: Prisma.PlayerGetPayload<{ include: { sessions: true } }>,
  //   serverId?: string,
  //   force: boolean = false
  // ) {
  //   TaskQueue.addTask(async () => {
  //     console.log("Fetching remote sessions for", player.name);
  //
  //     const remoteSessions = await Battlemetrics.getSessions(
  //       player.id,
  //       serverId ? [serverId] : undefined
  //     );
  //
  //     if (!remoteSessions) {
  //       console.error("No remote sessions for", player.name);
  //       return;
  //     }
  //
  //     const serverIds = uniqueArray(
  //       remoteSessions.map((s) => s.relationships?.server?.data?.id)
  //     ).filter((s): s is string => !!s);
  //
  //     const rustServers: RustServer[] = [];
  //
  //     for (const serverId of serverIds) {
  //       const server = await Server.getOrCreate(serverId);
  //       if (server) rustServers.push(server);
  //     }
  //
  //     for (const remoteSession of remoteSessions) {
  //       const serverExists = rustServers
  //         .map((s) => s.id)
  //         .includes(remoteSession.relationships?.server?.data?.id || "");
  //
  //       serverExists &&
  //         (await PlaySession.createPlaySession(remoteSession, player.id));
  //     }
  //
  //     await prisma.player.update({
  //       where: { id: player.id },
  //       data: {
  //         sessionsUpdatedAt: new Date(),
  //       },
  //     });
  //
  //     await Player.updatePlayerServer(player);
  //   }, `sessions-${player.id}`);
  // },
  //
  // updateAllSessions: async function () {
  //   console.log("Updating all sessions...");
  //
  //   const players = await prisma.player.findMany({
  //     include: {
  //       sessions: true,
  //       guilds: {
  //         include: {
  //           guild: true,
  //         },
  //       },
  //     },
  //   });
  //
  //   for (const player of players) {
  //     const uniqueServerIds = Array.from(
  //       new Set(player.guilds.map((g) => g.guild.serverId))
  //     );
  //
  //     for (const serverId of uniqueServerIds) {
  //       await Player.updateSessions(player, serverId || undefined);
  //     }
  //   }
  //
  //   console.log("All sessions updated.");
  // },

  // updatePlayerServer: async function (player: PrismaPlayer) {
  //   const lastSession = await prisma.playSession.findFirst({
  //     where: {
  //       playerId: player.id,
  //     },
  //     orderBy: {
  //       start: "desc",
  //     },
  //   });
  //
  //   if (lastSession) {
  //     const updatedPlayer = await prisma.player.update({
  //       where: {
  //         id: player.id,
  //       },
  //       data: {
  //         serverId: lastSession.stop ? null : lastSession.serverId,
  //       },
  //     });
  //
  //     if (updatedPlayer && player.serverId !== updatedPlayer.serverId) {
  //       await Notifications.sendNotifications(updatedPlayer);
  //     }
  //   }
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
      ? timePlayedSince(
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
