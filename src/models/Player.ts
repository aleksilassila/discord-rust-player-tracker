import {
  Player as PrismaPlayer,
  PlaySession as Session,
  Prisma,
  RustServer,
} from "@prisma/client";

import prisma from "../prisma";
import { PlayerInfo } from "../apis/battemetrics/get-player-info";
import Notifications from "./Notifications";
import {
  analyzeBedtimeSessions,
  BedtimeData,
  getTimeBetweenDates,
  isOlderThan,
  timePlayedSince,
  uniqueArray,
} from "../utils";
import Battlemetrics from "../apis/Battlemetrics";
import { SESSIONS_REFRESH_TIME } from "../config";
import Server from "./Server";
import PlaySession from "./PlaySession";

export type PlayerModel = PrismaPlayer;

export type AnalyzedSession = Session & {};

export type PlayerWithRelations = Prisma.PlayerGetPayload<{
  include: {
    sessions: true;
    server: true;
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

const Player: any = {};

Player.createMissingPlayer = async function (playerInfo: PlayerInfo) {
  return prisma.player
    .upsert({
      where: {
        id: playerInfo.id,
      },
      update: {},
      create: {
        id: <any>playerInfo?.id,
        name: <any>playerInfo?.attributes?.name,
      },
    })
    .catch(console.error);
};

Player.updatePlayerSessions = async function (
  player: Prisma.PlayerGetPayload<{ include: { sessions: true } }>,
  serverId?: string,
  force: boolean = false
) {
  if (!force && isOlderThan(player.sessionsUpdatedAt, SESSIONS_REFRESH_TIME))
    return;

  console.log("Fetching remote sessions for", player.name);

  const remoteSessions = await Battlemetrics.getSessions(
    player.id,
    serverId ? [serverId] : undefined
  );

  if (!remoteSessions) {
    console.error("No remote sessions for", player.name);
    return;
  }

  const serverIds = uniqueArray(
    remoteSessions.map((s) => s.relationships?.server?.data?.id)
  ).filter((s): s is string => !!s);

  const rustServerIds: string[] = [];

  for (const serverId of serverIds) {
    const server = await Server.updateOrCreate(serverId);
    if (server) rustServerIds.push(server.id);
  }

  for (const remoteSession of remoteSessions) {
    const serverExists = rustServerIds.includes(
      remoteSession.relationships?.server?.data?.id || ""
    );

    serverExists &&
      (await PlaySession.createPlaySession(remoteSession, player.id));
  }

  await prisma.player.update({
    where: { id: player.id },
    data: {
      sessionsUpdatedAt: new Date(),
    },
  });

  await Player.updatePlayerServer(player);
};

Player.updateAllSessions = async function () {
  console.log("Updating all sessions...");

  const players = await prisma.player.findMany({
    include: {
      sessions: true,
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
      await Player.updatePlayerSessions(player, serverId || undefined);
    }
  }

  console.log("All sessions updated.");
};
Player.updatePlayerServer = async function (player: PrismaPlayer) {
  const lastSession = await prisma.playSession.findFirst({
    where: {
      playerId: player.id,
    },
    orderBy: {
      start: "desc",
    },
  });

  if (lastSession) {
    const updatedPlayer = await prisma.player.update({
      where: {
        id: player.id,
      },
      data: {
        serverId: lastSession.stop ? null : lastSession.serverId,
      },
    });

    if (updatedPlayer && player.serverId !== updatedPlayer.serverId) {
      await Notifications.sendNotifications(updatedPlayer);
    }
  }
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

export const analyzePlayer = function (
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
};

export default Player;
