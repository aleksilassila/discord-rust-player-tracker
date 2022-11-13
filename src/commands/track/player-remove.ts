import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from "discord.js";
import { messages } from "../../messages";
import { SubcommandWithChannel } from "../slash-command";
import Server from "../../models/Server";

class PlayerRemove extends SubcommandWithChannel {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Remove player from track list")
      .addStringOption((option) =>
        option.setName("nickname").setDescription("Player nickname")
      )
      .addIntegerOption((option) =>
        option.setName("player-id").setDescription("Player Battlemetrics id")
      );
  }

  getName(): string {
    return "remove";
  }

  async executeWithChannel(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild,
    channel: TextChannel
  ): Promise<void> {
    const player = await this.requirePlayer(interaction);
    if (!player) return;

    const guildServer = await this.requireGuildServer(interaction, channel);
    if (!guildServer) return;

    await Server.removePlayer(guild, guildServer, player);
    await this.reply(interaction, messages.untrackPlayer);

    const server = await Server.get(guildServer.serverId);
    if (server) await Server.update(server);
  }
}
export default PlayerRemove;
