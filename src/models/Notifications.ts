import prisma from "../prisma";
import { PlayerModel } from "./Player";
import { client } from "../app";

const Notifications = Object.assign(prisma.guildUserNotifications, {
  async enableNotifications(userId: string, guildId: string) {
    return prisma.user
      .upsert({
        where: {
          id: userId,
        },
        update: {
          notifications: {
            create: [{ guildId }],
          },
        },
        create: {
          id: userId,
          notifications: {
            create: [{ guildId }],
          },
        },
      })
      .catch((err) => {});
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
      for (const notifee of g.notifiees) {
        notifeeIds.push(notifee.user.id);
      }
    }

    for (const userId of Array.from(new Set(notifeeIds))) {
      const user = await client.users.fetch(userId);

      if (!user) console.log("Could not message", userId);

      await user?.send(
        `${player.name} is now ${player.serverId ? "online" : "offline"}.`
      );
    }
  },
});

export default Notifications;
