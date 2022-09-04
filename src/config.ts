require("dotenv").config();

export const BATTLEMETRICS_TOKEN = process.env.BATTLEMETRICS_TOKEN || "";
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
export const DISCORD_CLIENT_ID =
  process.env.DISCORD_CLIENT_ID || "1010612547239563387";

export const REQUEST_CACHE_TIME = 2 * 60 * 1000;
