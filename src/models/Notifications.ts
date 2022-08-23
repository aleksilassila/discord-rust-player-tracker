import prisma from "../prisma";
import { PlayerModel } from "./Player";
import { client } from "../app";

const Notifications = Object.assign(prisma.userPlayerNotification, {
  async addNotification(playerId: string, userId: string) {
    await prisma.user.upsert({
      where: {
        id: userId,
      },
      update: {
        enableNotifications: true,
      },
      create: {
        id: userId,
        enableNotifications: true,
      },
    });

    return prisma.userPlayerNotification.upsert({
      where: {
        userId_playerId: {
          userId,
          playerId,
        },
      },
      update: {},
      create: {
        userId,
        playerId,
      },
    });
  },
  async removeNotification(playerId: string, userId: string) {
    return prisma.userPlayerNotification
      .delete({
        where: {
          userId_playerId: {
            userId,
            playerId,
          },
        },
      })
      .catch((err) => undefined);
  },
  async enableNotifications(userId: string) {
    return prisma.user.upsert({
      where: {
        id: userId,
      },
      update: {
        enableNotifications: true,
      },
      create: {
        id: userId,
        enableNotifications: true,
      },
    });
  },
  async disableNotifications(userId: string) {
    return prisma.user.upsert({
      where: {
        id: userId,
      },
      update: {
        enableNotifications: false,
      },
      create: {
        id: userId,
        enableNotifications: false,
      },
    });
  },
  async sendNotifications(player: PlayerModel) {
    const notifications = await prisma.userPlayerNotification.findMany({
      where: {
        playerId: player.id,
        user: {
          enableNotifications: true,
        },
      },
      include: {
        user: true,
      },
    });

    for (const n of notifications) {
      await client.users.cache
        .get(n.userId)
        ?.send(
          `${player.name} is now ${player.online ? "online" : "offline"}.`
        );
    }
  },
});

export default Notifications;
