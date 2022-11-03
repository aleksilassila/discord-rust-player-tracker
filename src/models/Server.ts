import prisma from "../prisma";
import {
  GuildServerTrack,
  PlayerTrack,
  Prisma,
  Server as ServerModel,
} from "@prisma/client";
import { getServerInfo } from "../apis/battemetrics/get-server-info";
import { Guild } from "discord.js";
import {
  deleteChannel,
  fetchChannel,
  getChannelName,
  getOrCreateChannel,
} from "../discord";
import Player, { PlayerModel } from "./Player";
import Notifications from "./Notifications";
import { getOverviewEmbeds } from "../embeds/overview-embed";
import PersistentMessage from "./PersistentMessage";
import { GuildServerFull } from "./Guild";

// Store ids to not fetch non rust servers twice
const nonRustServerIds: string[] = [];

export type ServerFull = Prisma.ServerGetPayload<{
  include: { players: true };
}>;

const Server = {
  getOrCreate: async function (
    serverId: string
  ): Promise<ServerFull | undefined> {
    let server = await prisma.server
      .findUnique({
        where: {
          id: serverId,
        },
        include: {
          players: true,
        },
      })
      .catch(console.error);

    if (server === null) {
      const serverInfo = await getServerInfo(serverId);

      server = await prisma.server
        .create({
          data: {
            id: <string>serverInfo?.id,
            name: <string>serverInfo?.attributes?.name,
            wipe: <string>serverInfo?.attributes?.details?.rust_last_wipe,
            mapUrl: serverInfo?.attributes?.details?.rust_maps?.url,
            mapPreview:
              serverInfo?.attributes?.details?.rust_maps?.thumbnailUrl,
          },
          include: {
            players: true,
          },
        })
        .catch((err) => {
          console.error(
            "Could not create new server " +
              serverId +
              " with parameters: " +
              serverInfo?.id,
            serverInfo?.attributes?.name,
            serverInfo?.attributes?.details?.rust_last_wipe
          );
        });
    }

    return server || undefined;
  },
  track: async function (
    guild: Guild,
    server: ServerModel
  ): Promise<GuildServerFull | undefined> {
    let guildServerTrack = await prisma.guildServerTrack
      .findFirst({
        where: {
          serverId: server.id,
          guildId: guild.id,
        },
        include: {
          server: true,
          guild: true,
        },
      })
      .catch(console.error);

    if (guildServerTrack === null) {
      const channel = await getOrCreateChannel(
        guild,
        getChannelName(server.name)
      );

      if (!channel) return;

      guildServerTrack = await prisma.guildServerTrack.create({
        data: {
          serverId: server.id,
          guildId: guild.id,
          channelName: channel.name,
          channelId: channel.id,
        },
        include: {
          server: true,
          guild: true,
        },
      });
    }

    return guildServerTrack || undefined;
  },
  untrack: async function (
    guildServer: GuildServerTrack
  ): Promise<GuildServerTrack | undefined> {
    return (
      (await prisma.guildServerTrack
        .delete({
          where: {
            channelId_guildId: {
              channelId: guildServer.channelId,
              guildId: guildServer.guildId,
            },
          },
        })
        .then(async (gs) => {
          await deleteChannel(guildServer.channelId);
          return gs;
        })
        .catch(console.error)) || undefined
    );
  },
  addPlayer: async function (
    guild: Guild,
    guildServerTrack: GuildServerTrack,
    player: PlayerModel,
    nickname?: string
  ): Promise<PlayerTrack | undefined> {
    const playerTrack =
      (await prisma.playerTrack
        .upsert({
          where: {
            playerId_channelId_guildId: {
              playerId: player.id,
              channelId: guildServerTrack.channelId,
              guildId: guildServerTrack.guildId,
            },
          },
          update: {},
          create: {
            playerId: player.id,
            channelId: guildServerTrack.channelId,
            guildId: guildServerTrack.guildId,
            nickname: nickname || player.name,
          },
        })
        .catch(console.error)) || undefined;

    return playerTrack;
  },
  removePlayer: async function (
    guild: Guild,
    guildServerTrack: GuildServerTrack,
    player: PlayerModel
  ): Promise<void> {
    await prisma.playerTrack
      .delete({
        where: {
          playerId_channelId_guildId: {
            playerId: player.id,
            channelId: guildServerTrack.channelId,
            guildId: guildServerTrack.guildId,
          },
        },
      })
      .catch(console.error);
  },
  updateAll: async function () {
    const uniqueTrackedServers = await prisma.guildServerTrack
      .findMany({
        include: {
          server: {
            include: {
              players: true,
            },
          },
        },
      })
      .then((tracks) => Array.from(new Set(tracks.map((s) => s.server))))
      .catch(console.error);

    if (!uniqueTrackedServers) return;

    // Loop unique servers
    for (const server of uniqueTrackedServers) {
      await Server.update(server);
    }
  },
  update: async function (
    server: Prisma.ServerGetPayload<{ include: { players: true } }>
  ): Promise<
    Prisma.ServerGetPayload<{ include: { players: true } }> | undefined
  > {
    console.log("Updating server " + server.name);

    const serverInfo = await getServerInfo(server.id);
    if (!serverInfo) return;

    const players: PlayerModel[] = [];

    // Create players that joined but don't exist
    for (const includedPlayer of serverInfo.included || []) {
      const playerId = includedPlayer.id;
      if (!playerId) continue;

      const player = await Player.getOrCreate(playerId);
      if (player) players.push(player);
    }

    const updated =
      (await prisma.server
        .update({
          where: {
            id: server.id,
          },
          data: {
            mapUrl: serverInfo.attributes?.details?.rust_maps?.url,
            mapPreview: serverInfo.attributes?.details?.rust_maps?.thumbnailUrl,
            wipe: serverInfo.attributes?.details?.rust_last_wipe,
            players: {
              set: players.map((p) => ({ id: p.id })),
            },
          },
          include: {
            players: true,
          },
        })
        .catch(console.error)) || undefined;

    if (!updated) return;

    // Send notifications
    const joinedPlayers = updated.players.filter(
      (p) => server.players.map((p) => p.id).includes(p.id) === false
    );

    const leftPlayers = server.players.filter(
      (p) => updated.players.map((p) => p.id).includes(p.id) === false
    );

    for (const player of joinedPlayers) {
      await Notifications.broadcastPlayerJoined(player);
    }

    for (const player of leftPlayers) {
      await Notifications.broadcastPlayerLeft(player);
    }

    // Update PlaySessions
    for (const player of [...leftPlayers, ...joinedPlayers]) {
      await Player.update(player, server.id);
    }

    // Update overviews
    const guildServers = await prisma.guildServerTrack
      .findMany({
        where: {
          serverId: server.id,
        },
        include: {
          server: true,
        },
      })
      .catch(console.error);

    if (guildServers) {
      await Server.updateOverviews(...guildServers);
    }

    return updated;
  },
  updateAllOverviews: async function () {
    const guildServers = await prisma.guildServerTrack
      .findMany({
        include: {
          server: true,
          guild: true,
        },
      })
      .catch(console.error);

    if (guildServers) {
      await this.updateOverviews(...guildServers);
    }
  },
  updateOverviews: async function (
    ...guildServers: Prisma.GuildServerTrackGetPayload<{
      include: { server: true };
    }>[]
  ) {
    for (const guildServer of guildServers) {
      console.log("Updating overview for: " + guildServer.guildId);

      const embeds = await getOverviewEmbeds(guildServer);
      const channel = await fetchChannel(guildServer.channelId);

      if (!channel) return;

      const messages = await PersistentMessage.getOrCreate(
        guildServer,
        channel,
        "overview",
        embeds.length
      );

      if (!messages) return;

      messages.map(async (m, index) => {
        try {
          await m.message.edit({ content: "", embeds: [embeds[index]] });
        } catch (e) {
          console.error(e);
        }
      });
    }
  },

  // add: async function (serverId: string): Promise<ServerModel | undefined> {
  //   const existingServer = await prisma.server.findUnique({
  //     where: {
  //       id: serverId,
  //     },
  //   });
  //
  //   if (
  //     existingServer &&
  //     !isOlderThan(existingServer.updatedAt, SERVER_REFRESH_TIME)
  //   ) {
  //     return existingServer;
  //   }
  //
  //   const serverInfo = await getServerInfo(serverId);
  //
  //   if (!serverInfo) {
  //     console.error("Could not fetch rust server.");
  //     return;
  //   }
  //
  //   if (serverInfo?.relationships?.game?.data?.id !== "rust") {
  //     nonRustServerIds.push(serverId);
  //
  //     // console.log(`Skipping ${serverInfo?.relationships?.game?.data?.id} server`);
  //     return;
  //   }
  //
  //   if (!existingServer) {
  //     if (nonRustServerIds.includes(serverId)) return;
  //
  //     const newServer = await prisma.rustServer
  //       .create({
  //         data: {
  //           id: <string>serverInfo?.id,
  //           name: <string>serverInfo?.attributes?.name,
  //           wipe: <string>serverInfo?.attributes?.details?.rust_last_wipe,
  //           mapUrl: serverInfo?.attributes?.details?.rust_maps?.url,
  //           mapPreview:
  //             serverInfo?.attributes?.details?.rust_maps?.thumbnailUrl,
  //         },
  //       })
  //       .catch((err) => {
  //         console.error("Could not create new server", err);
  //       });
  //
  //     if (newServer) {
  //       // console.log("Created new server", serverInfo.id);
  //     }
  //
  //     return newServer || undefined;
  //   } else {
  //     const updatedServer = await prisma.rustServer
  //       .update({
  //         where: {
  //           id: serverId,
  //         },
  //         data: {
  //           id: <any>serverInfo?.id,
  //           name: <any>serverInfo?.attributes?.name,
  //           wipe: <any>serverInfo?.attributes?.details?.rust_last_wipe,
  //           mapUrl: serverInfo?.attributes?.details?.rust_maps?.url,
  //           mapPreview:
  //             serverInfo?.attributes?.details?.rust_maps?.thumbnailUrl,
  //         },
  //       })
  //       .catch(console.error);
  //
  //     if (updatedServer) {
  //       console.log("Updated server", updatedServer.id);
  //     }
  //
  //     return updatedServer || undefined;
  //   }
  // },
};

export default Server;
