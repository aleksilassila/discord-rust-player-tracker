import { PersistentMessage } from "@prisma/client";
import { Guild as DiscordGuild, Message, TextChannel } from "discord.js";
import prisma from "../prisma";

async function createMessages(
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

  const messages = (
    await Promise.all(
      new Array(messageCount)
        .fill(undefined)
        .map(async () => await channel.send("Loading...").catch(console.error))
    )
  ).filter((m): m is Message => !!m);

  if (messages.length !== messageCount) {
    console.error("Message count did not match.");
  }

  const persistentMessages = await Promise.all(
    messages.map((m, i) =>
      prisma.persistentMessage.create({
        data: {
          id: m.id,
          pageIndex: i,
          key: messageKey,
          guildId: guild.id,
        },
      })
    )
  );

  return [await persistentMessages, await messages];
}

async function fetchMessage(
  guild: DiscordGuild,
  messageId: string
): Promise<Message | undefined> {
  const tectChannels: TextChannel[] = Array.from(guild.channels.cache.values())
    .filter((c) => c instanceof TextChannel)
    .map((c) => <TextChannel>c);

  for (const channel of tectChannels) {
    const message = await channel.messages
      .fetch(messageId)
      .catch(() => undefined);
    if (message) return message;
  }
}

async function deleteMessages(guild: DiscordGuild, ...messageIds: string[]) {
  const deletedPersistentMessages = await prisma.persistentMessage.deleteMany({
    where: {
      id: {
        in: messageIds,
      },
    },
  });

  for (const messageId of messageIds) {
    await fetchMessage(guild, messageId).then(
      async (m) => m && (await m.delete())
    );
  }
}

async function getMessages(
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

  const existingMessages = await Promise.all(
    existingLocalMessages.map((m) => fetchMessage(guild, m.id))
  );

  // If first message has been deleted, don't update.
  if (existingMessages.length && !existingMessages[0]) return;

  const existingFiltered = existingMessages.filter(
    (m): m is Message => m !== undefined
  );

  if (existingFiltered.length !== messageCount) {
    const messagesToDelete = existingLocalMessages.map((m) => m.id);

    if (messagesToDelete.length) {
      const channelId = await fetchMessage(guild, messagesToDelete[0]).then(
        (m) => m?.channel.id
      );
      await deleteMessages(guild, ...messagesToDelete);

      if (channelId) {
        const [pMessages, messages] = await createMessages(
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
}

export default {
  getMessages,
  deleteMessages,
};
