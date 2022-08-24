import prisma from "../prisma";
import { RustServer as ServerModel } from "@prisma/client";
import { getServerInfo } from "../apis/battemetrics/get-server-info";

// Store ids to not fetch non rust servers twice
const nonRustServerIds: string[] = [];

const Server = Object.assign(prisma.rustServer, {
  async getOrCreate(serverId: string): Promise<ServerModel | undefined> {
    const server = await prisma.rustServer.findUnique({
      where: {
        id: serverId,
      },
    });

    if (!server) {
      if (nonRustServerIds.includes(serverId)) return;

      const serverInfo = await getServerInfo(serverId).catch(
        (err) => undefined
      );

      if (!serverInfo || serverInfo.relationships.game.data.id !== "rust") {
        if (serverInfo) nonRustServerIds.push(serverId);
        console.log(
          "Could not fetch rust server",
          !serverInfo ? "Error" : "Not a rust server"
        );
        return;
      }

      return prisma.rustServer
        .create({
          data: {
            id: serverInfo.id,
            name: serverInfo.attributes.name,
            wipe: serverInfo.attributes.details.rust_last_wipe,
            mapUrl: serverInfo.attributes.details.rust_maps?.url,
            mapPreview: serverInfo.attributes.details.rust_maps?.thumbnailUrl,
          },
        })
        .catch((err) => undefined)
        .finally(() => console.log("Created new server", serverInfo.id));
    }

    return server;
  },
});

export default Server;
