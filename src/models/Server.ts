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
import Task from "../task/task";

// Store ids to not fetch non rust servers twice
const nonRustServerIds: string[] = [];

export type ServerWithPlayers = Prisma.ServerGetPayload<{
  include: { players: true };
}>;

/*
TODO:
  Separate addServer, getServer and make it so that creation of server
  triggers player list update, and handle creation of guild server track.
  Also make sure to not listen to commands before the server has been initialized and updated.
  Commands should not mess with and be messed by data fetching and server updates, so maybe queue them?
 */

const Server = {
  /**
   * @return Created ServerModel or undefined if already exists
   */
  addServer: async function (
    serverId: string,
    guild: Guild
  ): Promise<ServerWithPlayers | undefined> {
    if (
      (await prisma.server.count({
        where: {
          id: serverId,
          guildServerTracks: {
            every: {
              guildId: guild.id,
            },
          },
        },
      })) !== 0
    ) {
      return undefined;
    }

    const serverInfo = await getServerInfo(serverId);

    const id = serverInfo?.id;
    const name = serverInfo?.attributes?.name;
    const wipe = serverInfo?.attributes?.details?.rust_last_wipe;
    const mapUrl = serverInfo?.attributes?.details?.rust_maps?.url;
    const mapPreview = serverInfo?.attributes?.details?.rust_maps?.thumbnailUrl;

    if (id === undefined || name === undefined || wipe === undefined) {
      console.error(
        `Invalid server info response id: ${id}, name: ${name}, wipe: ${wipe}`
      );
      return undefined;
    }

    const server =
      (await prisma.server
        .upsert({
          where: {
            id: serverId,
          },
          create: {
            id,
            name,
            wipe,
            mapUrl,
            mapPreview,
          },
          update: {
            id,
            name,
            wipe,
            mapUrl,
            mapPreview,
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
        })) || undefined;

    if (server !== undefined) {
      await this._connectToGuild(server, guild);
    }

    return server;
  },
  get: async function (
    serverId: string
  ): Promise<ServerWithPlayers | undefined> {
    return (
      (await prisma.server
        .findUnique({
          where: {
            id: serverId,
          },
          include: {
            players: true,
          },
        })
        .catch(console.error)) || undefined
    );
  },
  getOrCreate: async function (
    serverId: string,
    guild: Guild
  ): Promise<ServerWithPlayers | undefined> {
    const server = await Server.get(serverId);

    if (server) {
      return server;
    }

    return await Server.addServer(serverId, guild);
  },
  _connectToGuild: async function (
    server: ServerModel,
    guild: Guild
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
    return new UpdateTask(server).run();
  },
  _update: async function (
    server: Prisma.ServerGetPayload<{ include: { players: true } }>
  ): Promise<
    Prisma.ServerGetPayload<{ include: { players: true } }> | undefined
  > {
    console.log("Updating server " + server.name);

    const serverInfo = await getServerInfo(server.id);
    if (!serverInfo) return;

    const currentPlayerIds: string[] = serverInfo.players
      ? (serverInfo.players.map((p) => p.id).filter((p) => !!p) as string[])
      : [];
    const oldPlayerIds = server.players.map((p) => p.id);

    const joinedPlayers = currentPlayerIds.filter(
      (id) => oldPlayerIds.includes(id) === false
    );

    const leftPlayers = oldPlayerIds.filter(
      (p) => currentPlayerIds.includes(p) === false
    );

    // Update PlaySessions
    for (const playerId of [...leftPlayers, ...joinedPlayers]) {
      await Player.updateOrCreate(playerId, server.id);
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
              set: currentPlayerIds.map((id) => ({ id })),
            },
          },
          include: {
            players: true,
          },
        })
        .catch(console.error)) || undefined;

    if (!updated) return;

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

    // Send notifications
    for (const playerId of joinedPlayers) {
      const player = await prisma.player.findUnique({
        where: {
          id: playerId,
        },
      });
      if (player) await Notifications.broadcastPlayerJoined(player);
    }

    for (const playerId of leftPlayers) {
      const player = await prisma.player.findUnique({
        where: {
          id: playerId,
        },
      });
      if (player) await Notifications.broadcastPlayerLeft(player);
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
};

class UpdateTask extends Task<
  Prisma.ServerGetPayload<{ include: { players: true } }> | undefined
> {
  server: Prisma.ServerGetPayload<{ include: { players: true } }>;
  serverId: string;

  constructor(server: Prisma.ServerGetPayload<{ include: { players: true } }>) {
    super();

    this.server = server;
    this.serverId = server.id;
  }

  getKey(): string {
    return this.serverId;
  }

  shouldRun(): boolean {
    return this.server.updatedAt.getTime() < Date.now() - 1000 * 30;
  }

  execute() {
    return Server._update(this.server);
  }
}

export default Server;
