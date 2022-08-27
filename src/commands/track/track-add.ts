import { ChatInputCommandInteraction, Guild as DiscordGuild } from "discord.js";
import {
  getPlayerInfo,
  PlayerInfo,
} from "../../apis/battemetrics/get-player-info";
import Guild from "../../models/Guild";
import Player from "../../models/Player";
import { messages } from "../../messages";
import Battlemetrics from "../../apis/Battlemetrics";

export const executeAdd = async function (
  interaction: ChatInputCommandInteraction,
  playerId: string,
  guild: DiscordGuild
): Promise<void> {
  const playerInfo: PlayerInfo | void = await Battlemetrics.getPlayerInfo(
    playerId
  ).catch(console.error);

  if (!playerInfo) {
    await interaction.reply("Could not fetch the player");
    return;
  }

  const playerNickname =
    interaction.options.getString("nickname") || playerInfo?.attributes?.name;
  const playerName = playerInfo?.attributes?.name;

  if (!playerNickname || !playerName) {
    await interaction.reply("Error adding player");
    return;
  }

  Player.createMissingPlayer(playerInfo)
    .then(async () => {
      await Guild.trackPlayer(guild.id, playerId, playerNickname);
      await interaction
        .reply({
          content: messages.trackPlayer(playerName, playerId, playerNickname),
        })
        .catch(console.error);
    })
    .catch(async (err: any) => {
      await interaction.reply("Error adding player").catch(console.error);
      console.error(err);
    });
};
