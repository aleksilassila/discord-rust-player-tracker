import { GuildServerTrack, PersistentMessage } from "@prisma/client";
import { Message, TextChannel } from "discord.js";
import prisma from "../prisma";
import { fetchMessageFromChannel } from "../discord";

export interface PersistentDiscordMessage extends PersistentMessage {
  message: Message;
}

const PersistentMessages = {
  create: async function (
    guildServer: GuildServerTrack,
    channel: TextChannel,
    messageKey: string,
    messageCount: number
  ): Promise<PersistentDiscordMessage[] | undefined> {
    const messages: PersistentDiscordMessage[] = [];

    for (let i = 0; i < messageCount; i++) {
      const message = await channel.send("Loading...").catch(console.error);

      if (message) {
        const persistentMessage = await prisma.persistentMessage
          .create({
            data: {
              id: message.id,
              pageIndex: i,
              key: messageKey,
              channelId: channel.id,
              guildId: guildServer.guildId,
            },
          })
          .catch(console.error);

        if (persistentMessage)
          messages.push({
            ...persistentMessage,
            message,
          });
      }
    }

    return messages;
  },

  delete: async function (...messages: PersistentDiscordMessage[]) {
    const deletedPersistentMessages = await prisma.persistentMessage.deleteMany(
      {
        where: {
          id: {
            in: messages.map((m) => m.id),
          },
        },
      }
    );

    for (const message of messages) {
      await message.message.delete().catch(console.error);
    }
  },

  getOrCreate: async function (
    guildServer: GuildServerTrack,
    channel: TextChannel,
    messageKey: string,
    messageCount: number
  ): Promise<PersistentDiscordMessage[] | undefined> {
    const existingLocalMessages =
      (await prisma.persistentMessage
        .findMany({
          where: {
            guildServer: {
              channelId: guildServer.channelId,
              guildId: guildServer.guildId,
            },
            key: messageKey,
          },
        })
        .catch(console.error)) || [];

    const existingMessages: PersistentDiscordMessage[] = [];

    for (const localMessage of existingLocalMessages) {
      const message = await fetchMessageFromChannel(channel, localMessage.id);
      if (message) existingMessages.push({ ...localMessage, message });
    }

    // // If first message has been deleted, don't update.
    // if (existingMessages.length && !existingMessages[0]) return;

    if (existingMessages.length !== messageCount) {
      await PersistentMessages.delete(...existingMessages);
      return await PersistentMessages.create(
        guildServer,
        channel,
        messageKey,
        messageCount
      );
    } else {
      return existingMessages;
    }
  },
};

export default PersistentMessages;
