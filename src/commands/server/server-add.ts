import { SubcommandWithGuild } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { messages } from "../../messages";
import Server from "../../models/Server";

class ServerAdd extends SubcommandWithGuild {
  buildSubcommand(
    builderWithName: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builderWithName
      .setDescription("Add server to track based on its Battlemetrics id.")
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

    const server = await Server.getOrCreate(serverId);

    if (server) {
      const guildServer = await Server.track(guild, server);
      if (guildServer) {
        const serverWithPlayers = await Server.getOrCreate(serverId);
        if (serverWithPlayers) await Server.update(serverWithPlayers);
      }
    }

    // await Guild.setTrackedServer(guild.id, serverId);
    await this.reply(interaction, messages.setTrackedServer);
  }

  getName(): string {
    return "add";
  }
}

export default ServerAdd;
