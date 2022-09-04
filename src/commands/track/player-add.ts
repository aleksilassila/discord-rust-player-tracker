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
    if (!playerId || !guildServer) return;

    const player = await Player.getOrCreate(playerId);

    if (!player) {
      await this.replyEphemeral(interaction, "Error adding player.");
      return;
    }

    const playerNickname =
      interaction.options.getString("nickname") || player.name;

    await Server.addPlayer(guild, guildServer, player, playerNickname);
    await this.replyEphemeral(
      interaction,
      messages.trackPlayer(player.name, player.id, playerNickname)
    );

    const serverWithPlayers = await Server.getOrCreate(guildServer.server.id);
    if (serverWithPlayers) await Server.update(serverWithPlayers);
  }
}

export default PlayerAdd;
