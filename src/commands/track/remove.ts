import { ChatInputCommandInteraction, Guild as DiscordGuild } from "discord.js";
import { messages } from "../../messages";
import Guild from "../../models/Guild";

export const executeRemove = async function (
  interaction: ChatInputCommandInteraction,
  playerId: string,
  guild: DiscordGuild
): Promise<void> {
  await Guild.untrackPlayer(guild.id, playerId).then((b) =>
    interaction.reply(b ? messages.untrackPlayer : messages.playerNotFound)
  );
};
