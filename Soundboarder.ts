import { Client, ClientOptions } from "discord.js";
import { createClient } from "redis";

interface SoundboarderOptions {
  discord: ClientOptions;
  redis: Parameters<typeof createClient>[0];
}

export default class Soundboarder extends Client {
  constructor(options: SoundboarderOptions) {
    super(options.discord);

    this.on("ready", () => {
      if (!this.user) return;
      console.log(`Logged in as ${this.user.tag}`);
    });

    this.db = createClient(options.redis);
  }

  public async init(): Promise<void> {
    await this.db.connect();
    return;
  }

  db: ReturnType<typeof createClient>;
}
