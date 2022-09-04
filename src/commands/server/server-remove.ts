import { SubcommandWithChannel } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from "discord.js";
import { messages } from "../../messages";
import Server from "../../models/Server";

class ServerRemove extends SubcommandWithChannel {
  buildSubcommand(
    builderWithName: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builderWithName.setDescription("Remove tracked server.");
  }

  async executeWithChannel(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild,
    channel: TextChannel
  ): Promise<void> {
    // await Guild.unsetTrackedServer(guild.id);
    const guildServer = await this.requireGuildServer(interaction, channel);
    if (!guildServer) return;

    await Server.untrack(guildServer);
    await this.reply(interaction, messages.unsetTrackedServer);
  }

  getName(): string {
    return "remove";
  }
}

export default ServerRemove;
