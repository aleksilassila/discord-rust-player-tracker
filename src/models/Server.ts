import prisma from "../prisma";
import { RustServer as ServerModel } from "@prisma/client";
import { getServerInfo } from "../apis/battemetrics/get-server-info";
import { isOlderThan } from "../utils";
import { SERVER_REFRESH_TIME } from "../config";

// Store ids to not fetch non rust servers twice
const nonRustServerIds: string[] = [];

const Server = {
  updateOrCreate: async function (
    serverId: string
  ): Promise<ServerModel | undefined> {
    const staleServer = await prisma.rustServer.findUnique({
      where: {
        id: serverId,
      },
    });

    if (
      staleServer &&
      !isOlderThan(staleServer.updatedAt, SERVER_REFRESH_TIME)
    ) {
      return staleServer;
    }

    const serverInfo = await getServerInfo(serverId);

    if (!serverInfo) {
      console.error("Could not fetch rust server.");
      return;
    }

    if (serverInfo?.relationships?.game?.data?.id !== "rust") {
      nonRustServerIds.push(serverId);

      // console.log(`Skipping ${serverInfo?.relationships?.game?.data?.id} server`);
      return;
    }

    if (!staleServer) {
      if (nonRustServerIds.includes(serverId)) return;

      const newServer = await prisma.rustServer
        .create({
          data: {
            id: <string>serverInfo?.id,
            name: <string>serverInfo?.attributes?.name,
            wipe: <string>serverInfo?.attributes?.details?.rust_last_wipe,
            mapUrl: serverInfo?.attributes?.details?.rust_maps?.url,
            mapPreview:
              serverInfo?.attributes?.details?.rust_maps?.thumbnailUrl,
          },
        })
        .catch((err) => {
          console.error("Could not create new server", err);
        });

      if (newServer) {
        // console.log("Created new server", serverInfo.id);
      }

      return newServer || undefined;
    } else {
      const updatedServer = await prisma.rustServer
        .update({
          where: {
            id: serverId,
          },
          data: {
            id: <any>serverInfo?.id,
            name: <any>serverInfo?.attributes?.name,
            wipe: <any>serverInfo?.attributes?.details?.rust_last_wipe,
            mapUrl: serverInfo?.attributes?.details?.rust_maps?.url,
            mapPreview:
              serverInfo?.attributes?.details?.rust_maps?.thumbnailUrl,
          },
        })
        .catch(console.error);

      if (updatedServer) {
        console.log("Updated server", updatedServer.id);
      }

      return updatedServer || undefined;
    }
  },
};

export default Server;
