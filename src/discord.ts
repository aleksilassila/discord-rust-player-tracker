import { client } from "./app";
import {
  CategoryChannel,
  ChannelType,
  Guild,
  Message,
  TextChannel,
  User as DiscordUser,
} from "discord.js";
import { User } from "@prisma/client";
import { GuildModel } from "./models/Guild";

export const getChannelName = function (name: string) {
  return name.replace(" ", "-").replace(/[^a-zA-Z0-9\-]/g, "");
};

const getOrCreateCategory = async function (
  guild: Guild,
  name: string
): Promise<CategoryChannel> {
  const categoryName = getChannelName(name);
  const category = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === categoryName
  );

  if (category) {
    return category as CategoryChannel;
  } else {
    return await (guild.channels
      .create({
        name: categoryName,
        type: ChannelType.GuildCategory,
      })
      .catch((err) => undefined) as Promise<CategoryChannel>);
  }
};

export const getOrCreateChannel = async function (
  guild: Guild,
  name: string,
  channelId?: string
): Promise<TextChannel | undefined> {
  let channel = channelId ? await fetchChannel(channelId) : undefined;

  if (!channel) {
    channel = await guild.channels
      .create({
        name,
        parent: await getOrCreateCategory(guild, "tracked-servers"),
      })
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
