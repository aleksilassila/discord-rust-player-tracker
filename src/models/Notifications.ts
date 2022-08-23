import prisma from "../prisma";
import { PlayerModel } from "./Player";
import { client } from "../app";

const Notifications = Object.assign(prisma.guildUserNotifications, {
  async enableNotifications(userId: string, guildId: string) {
    return prisma.guildUserNotifications.upsert({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
      update: {},
      create: {
        userId,
        guildId,
      },
    });
  },
  async disableNotifications(userId: string, guildId: string) {
    return prisma.guildUserNotifications
      .delete({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
      })
      .catch((err) => {});
  },
  async sendNotifications(player: PlayerModel) {
    console.log("Sending notifications for", player);
    // List of guilds that track that player
    const guilds = await prisma.player
      .findUnique({
        where: {
          id: player.id,
        },
        include: {
          guilds: {
            include: {
              guild: {
                include: {
                  notifiees: {
                    include: {
                      user: true, // jeez
                    },
                  },
                },
              },
            },
          },
        },
      })
      .then((p) => p?.guilds?.map((g) => g.guild));

    if (!guilds) return;

    const notifeeIds: string[] = [];

    for (const g of guilds) {
      console.log(g.notifiees);
      for (const notifee of g.notifiees) {
        notifeeIds.push(notifee.user.id);
      }
    }

    for (const userId of Array.from(new Set(notifeeIds))) {
      await client.users.cache
        .get(userId)
        ?.send(
          `${player.name} is now ${player.serverId ? "online" : "offline"}.`
        );
    }
  },
});

export default Notifications;
