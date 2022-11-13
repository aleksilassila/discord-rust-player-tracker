import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from "discord.js";
import Player from "../../models/Player";
import { messages } from "../../messages";
import { SubcommandWithChannel } from "../slash-command";
import Server from "../../models/Server";

class PlayerAdd extends SubcommandWithChannel {
  shouldDelayResponses(): boolean {
    return true;
  }

  getName(): string {
    return "add";
  }

  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Add player to track list")
      .addIntegerOption((option) =>
        option
          .setName("player-id")
          .setDescription("Player Battlemetrics id")
          .setRequired(true)
      );
  }

  async executeWithChannel(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild,
    channel: TextChannel
  ): Promise<void> {
    const playerId = await this.requirePlayerId(interaction);
    const guildServer = await this.requireGuildServer(interaction, channel);
    const player = await this.requirePlayer(interaction);
    if (!playerId || !guildServer || !player) return;

    const playerNickname =
      interaction.options.getString("nickname") || player.name;

    const server = await Server.get(guildServer.serverId);

    if (server) {
      await Server.trackPlayer(guild, guildServer, player, playerNickname);
      await this.replyEphemeral(
        interaction,
        messages.trackPlayer(player.name, player.id, playerNickname)
      );
      await Server.updateOverviews(guildServer);
    } else {
      await this.replyEphemeral(
        interaction,
        "Could not add player, invalid server."
      );
    }
  }
}

export default PlayerAdd;
