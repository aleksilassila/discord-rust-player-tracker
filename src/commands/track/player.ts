import { CommandWithSubcommands, Subcommand } from "../slash-command";
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import PlayerRemove from "./player-remove";
import PlayerInfo from "./player-info";
import PlayerAdd from "./player-add";
import PlayerList from "./player-list";

class Player extends CommandWithSubcommands {
  async buildCommandWithSubcommands(): Promise<
    SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
  > {
    return new SlashCommandBuilder()
      .setName(this.getName())
      .setDescription("Track a rust player based on their Battlemetrics id")
      .setDMPermission(false);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await this.executeSubcommand(interaction);
  }

  getSubcommands(): Subcommand[] {
    return [
      new PlayerAdd(),
      new PlayerRemove(),
      new PlayerInfo(),
      // new TrackOverview(),
      new PlayerList(),
    ];
  }

  getName(): string {
    return "player";
  }
}

export default Player;
