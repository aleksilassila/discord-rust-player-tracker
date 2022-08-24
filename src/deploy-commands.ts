import { Client, REST, Routes } from "discord.js";
import { DISCORD_CLIENT_ID, DISCORD_TOKEN } from "./config";
import { getCommands } from "./commands";

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

export const syncGuildCommands = async (guildId: string) => {
  const commands = await getCommands();

  const commandsJSON = await Promise.all(
    commands.map((c) => c.data(guildId).then((r) => r.toJSON()))
  );

  rest
    .put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId), {
      body: commandsJSON,
    })
    .then(() =>
      console.log("Successfully registered application commands.", commandsJSON)
    )
    .catch(console.error);
};

export const syncAllGuildsCommands = async (client: Client) => {
  for (const guild of client.guilds.cache.map((g) => g)) {
    await syncGuildCommands(guild.id);
  }
};
