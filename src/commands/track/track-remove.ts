import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { messages } from "../../messages";
import Guild from "../../models/Guild";
import { SubcommandWithGuild } from "../slash-command";

class TrackRemove extends SubcommandWithGuild {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Remove player from track list")
      .addStringOption((option) =>
        option.setName("nickname").setDescription("Player nickname")
      )
      .addNumberOption((option) =>
        option.setName("player-id").setDescription("Player Battlemetrics id")
      );
  }

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild
  ): Promise<void> {
    const playerId = await this.requirePlayerId(interaction);
    if (!playerId) return;

    await Guild.untrackPlayer(guild.id, playerId).then((b) =>
      this.reply(
        interaction,
        b ? messages.untrackPlayer : messages.playerNotFound
      )
    );
  }

  getName(): string {
    return "remove";
  }
}
export default TrackRemove;
