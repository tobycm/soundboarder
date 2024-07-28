import { Client, ClientOptions } from "discord.js";

export default class Soundboarder extends Client {
  constructor(options: ClientOptions) {
    super(options);

    this.on("ready", () => {
      if (!this.user) return;
      console.log(`Logged in as ${this.user.tag}`);
    });
  }
}
