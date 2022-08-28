import { SubcommandWithGuild } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import Guild from "../../models/Guild";
import { messages } from "../../messages";

class ServerSet extends SubcommandWithGuild {
  buildSubcommand(
    builderWithName: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builderWithName
      .setDescription("Set server to track based on its Battlemetrics id.")
      .addIntegerOption((option) =>
        option
          .setName("server-id")
          .setDescription("ServerCommand Battlemetrics id.")
          .setRequired(true)
      );
  }

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild
  ): Promise<void> {
    const serverId = await this.requireServerId(interaction);
    if (!serverId) return;

    await Guild.setTrackedServer(guild.id, serverId);
    await this.reply(interaction, messages.setTrackedServer);
  }

  getName(): string {
    return "set";
  }
}

export default ServerSet;
