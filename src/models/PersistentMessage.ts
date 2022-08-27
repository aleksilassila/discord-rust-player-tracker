import { PersistentMessage } from "@prisma/client";
import { Guild as DiscordGuild, Message, TextChannel } from "discord.js";
import prisma from "../prisma";

const PersistentMessages = {
  createMessages: async function (
    guild: DiscordGuild,
    channelId: string,
    messageKey: string,
    messageCount: number
  ): Promise<[PersistentMessage[] | undefined, Message[] | undefined]> {
    const channel: TextChannel | undefined = await guild.channels
      .fetch(channelId)
      .then((c) => (c instanceof TextChannel ? <TextChannel>c : undefined));

    if (!channel) {
      console.error("Channel was undefined.");
      return [undefined, undefined];
    }

    const messages: Message[] = [];

    for (let i = 0; i < messageCount; i++) {
      const message = await channel.send("Loading...").catch(console.error);
      if (message) messages.push(message);
    }

    if (messages.length !== messageCount) {
      console.error("Message count did not match.");
    }

    const persistentMessages: PersistentMessage[] = [];
    for (let i = 0; i < messages.length; i++) {
      const persistentMessage = await prisma.persistentMessage
        .create({
          data: {
            id: messages[i].id,
            pageIndex: i,
            key: messageKey,
            guildId: guild.id,
          },
        })
        .catch(console.error);
      if (persistentMessage) persistentMessages.push(persistentMessage);
    }

    return [persistentMessages, messages];
  },

  fetchMessage: async function (
    guild: DiscordGuild,
    messageId: string
  ): Promise<Message | undefined> {
    const tectChannels: TextChannel[] = Array.from(
      guild.channels.cache.values()
    )
      .filter((c) => c instanceof TextChannel)
      .map((c) => <TextChannel>c);

    for (const channel of tectChannels) {
      const message = await channel.messages
        .fetch(messageId)
        .catch(() => undefined);
      if (message) return message;
    }
  },

  deleteMessages: async function (
    guild: DiscordGuild,
    ...messageIds: string[]
  ) {
    const deletedPersistentMessages = await prisma.persistentMessage.deleteMany(
      {
        where: {
          id: {
            in: messageIds,
          },
        },
      }
    );

    for (const messageId of messageIds) {
      await PersistentMessages.fetchMessage(guild, messageId).then(
        async (m) => m && (await m.delete())
      );
    }
  },

  getMessages: async function (
    guild: DiscordGuild,
    messageKey: string,
    messageCount: number
  ): Promise<Message[] | undefined> {
    const existingLocalMessages = await prisma.persistentMessage.findMany({
      where: {
        guildId: guild.id,
        key: messageKey,
      },
    });

    const existingMessages: Message[] = [];

    for (const localMessage of existingLocalMessages) {
      const message = await PersistentMessages.fetchMessage(
        guild,
        localMessage.id
      );
      if (message) existingMessages.push(message);
    }

    // If first message has been deleted, don't update.
    if (existingMessages.length && !existingMessages[0]) return;

    const existingFiltered = existingMessages.filter(
      (m): m is Message => m !== undefined
    );

    if (existingFiltered.length !== messageCount) {
      const messagesToDelete = existingLocalMessages.map((m) => m.id);

      if (messagesToDelete.length) {
        const channelId = await PersistentMessages.fetchMessage(
          guild,
          messagesToDelete[0]
        ).then((m) => m?.channel.id);
        await PersistentMessages.deleteMessages(guild, ...messagesToDelete);

        if (channelId) {
          const [pMessages, messages] = await PersistentMessages.createMessages(
            guild,
            channelId,
            messageKey,
            messageCount
          );
          return messages;
        }
      }
    } else {
      return existingFiltered;
    }
  },
};

export default PersistentMessages;
