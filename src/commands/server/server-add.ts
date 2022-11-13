import { SubcommandWithGuild } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
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

    const server = await Server.track(serverId, guild);

    // if (server) {
    //   const guildServer = await Server.track(guild, server);
    //   if (guildServer) {
    //     const serverWithPlayers = await Server.getOrCreate(serverId);
    //     if (serverWithPlayers) await Server.update(serverWithPlayers);
    //   }
    // }

    // await Guild.setTrackedServer(guild.id, serverId);
    if (server) {
      await this.replyEphemeral(interaction, "Server tracked.");
    } else {
      await this.replyEphemeral(
        interaction,
        "Could not track server. Is it already being tracked?"
      );
    }
  }

  getName(): string {
    return "add";
  }
}

export default ServerAdd;
