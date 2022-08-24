import { ChatInputCommandInteraction, Guild as DiscordGuild } from "discord.js";
import {
  getPlayerInfo,
  PlayerInfo,
} from "../../apis/battemetrics/get-player-info";
import Guild from "../../models/Guild";
import Player from "../../models/Player";
import { messages } from "../../messages";

export const executeAdd = async function (
  interaction: ChatInputCommandInteraction,
  playerId: string,
  guild: DiscordGuild
): Promise<void> {
  const playerInfo: PlayerInfo | void = await getPlayerInfo(playerId).catch(
    console.error
  );

  if (!playerInfo) {
    await interaction.reply("Could not fetch the player");
    return;
  }

  const playerNickname =
    interaction.options.getString("nickname") || playerInfo.attributes.name;

  Player.createMissingPlayer(playerInfo)
    .then(async () => {
      await Guild.trackPlayer(guild.id, playerId, playerNickname);
      await interaction.reply({
        content: messages.trackPlayer(
          playerInfo.attributes.name,
          playerInfo.id,
          playerNickname
        ),
      });
    })
    .catch(async (err) => {
      await interaction.reply("Error adding player");
      console.error(err);
    });
};
