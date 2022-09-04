import { getSessions, PlayerSession } from "../apis/battemetrics/get-sessions";
import Server from "./Server";
import { PlaySession, Server as RustServer } from "@prisma/client";
import prisma from "../prisma";
import { PlayerModel } from "./Player";

const PlaySession = {
  updatePlayerSessions: async function (
    player: PlayerModel,
    serverIds?: string[]
  ) {
    const sessions = await getSessions(player.id, serverIds);
    if (!sessions) return;

    console.log("Updating play sessions for " + player.name);

    for (const session of sessions) {
      const serverId = session.relationships?.server?.data?.id;

      if (!serverId) continue;
      const server = await Server.getOrCreate(serverId);

      if (!server) continue;

      await this.createPlaySession(session, server, player);
    }
  },
  createPlaySession: async function (
    session: PlayerSession,
    server: RustServer,
    player: PlayerModel
  ): Promise<PlaySession | undefined> {
    const playSession = await prisma.playSession
      .upsert({
        where: {
          id: session.id,
        },
        update: {
          stop: session?.attributes?.stop,
        },
        create: {
          id: <string>session?.id,
          start: <string>session?.attributes?.start,
          stop: session?.attributes?.stop,
          playerId: player.id,
          serverId: server.id,
        },
      })
      .catch(() =>
        console.error("Could not create play session. Does the server exist?")
      );

    return playSession || undefined;
  },
};

export default PlaySession;
