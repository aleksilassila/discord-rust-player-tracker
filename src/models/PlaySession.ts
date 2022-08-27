import { PlayerSession } from "../apis/battemetrics/get-sessions";
import Server from "./Server";
import { PlaySession } from "@prisma/client";
import prisma from "../prisma";

const createPlaySession = async function (
  session: PlayerSession,
  playerId: string
): Promise<PlaySession | undefined> {
  const serverId = session?.relationships?.server?.data?.id;

  if (!serverId) return;

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
        playerId: playerId,
        serverId: serverId,
      },
    })
    .catch(() =>
      console.error("Could not create play session. Does the server exist?")
    );

  return playSession || undefined;
};

export default {
  createPlaySession,
};
