import { client } from "./app";
import { Guild, Message, TextChannel, User as DiscordUser } from "discord.js";
import { User } from "@prisma/client";
import { GuildModel } from "./models/Guild";

export const getChannelName = function (name: string) {
  return name.replace(" ", "-").replace(/[^a-zA-Z0-9\-]/g, "");
};

export const getOrCreateChannel = async function (
  guild: Guild,
  name: string,
  channelId?: string
): Promise<TextChannel | undefined> {
  let channel = channelId ? await fetchChannel(channelId) : undefined;

  if (!channel) {
    channel = await guild.channels
      .create({ name, topic: "Tracked Servers" })
      .catch((err) => undefined);
  }

  if (!(channel instanceof TextChannel)) return undefined;

  return channel;
};

export const deleteChannel = async function (channelId: string) {
  let channel = await fetchChannel(channelId);

  if (channel) {
    await channel.delete().catch(console.error);
  }
};

export const fetchChannel = async function (
  channelId: string
): Promise<TextChannel | undefined> {
  const channel =
    (await client.channels.fetch(channelId).catch(console.error)) || undefined;

  if (channel instanceof TextChannel) {
    return <TextChannel>channel;
  } else {
    return undefined;
  }
};

export const fetchMessageFromChannel = async function (
  channel: TextChannel,
  messageId: string
): Promise<Message | undefined> {
  return (
    (await channel.messages.fetch(messageId).catch(console.error)) || undefined
  );
};

export const fetchMessage = async function (
  guild: Guild,
  messageId: string
): Promise<Message | undefined> {
  const textChannels: TextChannel[] = Array.from(guild.channels.cache.values())
    .filter((c) => c instanceof TextChannel)
    .map((c) => <TextChannel>c);

  for (const channel of textChannels) {
    const message = await channel.messages
      .fetch(messageId)
      .catch(() => undefined);
    if (message) return message;
  }
};

export const fetchUser = async function (
  user: User
): Promise<DiscordUser | undefined> {
  return (await client.users.fetch(user.id).catch(console.error)) || undefined;
};

export const fetchGuild = async function (
  guild: GuildModel
): Promise<Guild | undefined> {
  return (
    (await client.guilds.fetch(guild.id).catch(console.error)) || undefined
  );
};
