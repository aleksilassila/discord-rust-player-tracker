import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { PlayerInfo } from "../../apis/battemetrics/get-player-info";
import Guild from "../../models/Guild";
import Player from "../../models/Player";
import { messages } from "../../messages";
import Battlemetrics from "../../apis/Battlemetrics";
import { SubcommandWithGuild } from "../slash-command";

class TrackAdd extends SubcommandWithGuild {
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

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild
  ): Promise<void> {
    const playerId = await this.requirePlayerId(interaction);
    if (!playerId) return;

    const playerInfo: PlayerInfo | void = await Battlemetrics.getPlayerInfo(
      playerId
    ).catch(console.error);

    if (!playerInfo) {
      await this.reply(interaction, "Could not fetch the player");
      return;
    }

    const playerNickname =
      interaction.options.getString("nickname") || playerInfo?.attributes?.name;
    const playerName = playerInfo?.attributes?.name;

    if (!playerNickname || !playerName) {
      await this.reply(interaction, "Error adding player");
      return;
    }

    Player.createMissingPlayer(playerInfo)
      .then(async () => {
        await Guild.trackPlayer(guild.id, playerId, playerNickname);
        await this.reply(interaction, {
          content: messages.trackPlayer(playerName, playerId, playerNickname),
        }).catch(console.error);
      })
      .catch(async (err: any) => {
        await this.reply(
          interaction,
          "Could not add the player. Already did?"
        ).catch(console.error);
        console.error(err);
      });
  }
}

export default TrackAdd;
