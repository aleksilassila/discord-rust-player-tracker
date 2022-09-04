import { GuildServerTrack, User } from "@prisma/client";
import prisma from "../prisma";
import { PlayerModel } from "./Player";
import { fetchUser } from "../discord";

const Notifications = {
  async enableNotifications(user: User, guildServer: GuildServerTrack) {
    return await prisma.notificationReceiver
      .upsert({
        where: {
          userId_guildServerGuildId_guildServerChannelId: {
            userId: user.id,
            guildServerChannelId: guildServer.channelId,
            guildServerGuildId: guildServer.guildId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          guildServerChannelId: guildServer.channelId,
          guildServerGuildId: guildServer.guildId,
        },
      })
      .catch(console.error);
  },
  async disableNotifications(user: User, guildServer: GuildServerTrack) {
    return await prisma.notificationReceiver
      .delete({
        where: {
          userId_guildServerGuildId_guildServerChannelId: {
            userId: user.id,
            guildServerChannelId: guildServer.channelId,
            guildServerGuildId: guildServer.guildId,
          },
        },
      })
      .catch(console.error);
  },
  broadcastPlayerLeft: async function (player: PlayerModel) {
    await this.broadcastMessage(player, `${player.name} is now offline.`);
  },
  broadcastPlayerJoined: async function (player: PlayerModel) {
    await this.broadcastMessage(player, `${player.name} is now online.`);
  },
  broadcastMessage: async function (player: PlayerModel, message: string) {
    const users = await prisma.user
      .findMany({
        where: {
          notifications: {
            some: {
              guildServer: {
                trackedPlayers: {
                  some: {
                    player: {
                      id: player.id,
                    },
                  },
                },
              },
            },
          },
        },
      })
      .catch(console.error);

    for (const user of users || []) {
      const dcUser = await fetchUser(user);

      if (dcUser) {
        await dcUser.send(message).catch(console.error);
      }
    }
  },
};

export default Notifications;
