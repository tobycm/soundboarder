import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, Interaction, Role } from "discord.js";
import { Redis } from "ioredis";

// https://dev.to/alexanderop/implementing-a-custom-includes-utility-type-in-typescript-4dph
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type Includes<T extends readonly any[], U> = T extends [infer First, ...infer Rest]
  ? Equal<First, U> extends true
    ? true
    : Includes<Rest, U>
  : false;

export type Scope = "guild" | "channel" | "role" | "member" | "user";
type URL = string;
type Timestamp = number;

export interface DBButton {
  created: Timestamp;

  file: URL;
  emoji: string;
}

export interface Button extends DBButton {
  id: string;
  name: string;
}

interface GetButtonsOptions {
  scopes?: Scope[];
  roles?: Role[];
}

export async function getButtons(
  db: Redis,
  interaction: Interaction,

  options: GetButtonsOptions = {}
): Promise<Button[]> {
  const buttons: Button[] = [];

  let { scopes } = options;

  if (scopes === undefined) scopes = ["user"];

  if ((scopes.length !== 1 || !scopes.includes("user")) && !interaction.guild) throw new Error("Guild scopes requires a guild.");

  if (scopes.includes("role") && !options.roles?.length) throw new Error("Role scope requires at least a role.");

  const buttonKeys: string[] = [];

  const scans: string[] = [];

  for (const scope of scopes) {
    if (scope === "role") {
      for (const role of options.roles) scans.push(`${interaction.guild!.id}.${role.id}:*`);

      continue;
    }

    scans.push(
      `${
        scope === "guild"
          ? interaction.guild!.id
          : scope === "channel"
          ? (interaction.member as GuildMember).voice.channel!.id
          : scope === "member"
          ? `${interaction.guild!.id}.${interaction.user.id}`
          : interaction.user.id
      }:*`
    );
  }

  const scanPipeline = db.pipeline();
  for (const scan of scans) scanPipeline.scan(0, "MATCH", scan);

  for (const [error, result] of await scanPipeline.exec()) {
    if (error) throw error;

    const [_, keys] = result as [string, string[]];
    if (keys.length === 0) continue;

    buttonKeys.push(...keys);
  }

  console.log(buttonKeys);

  const hgetPipeline = db.pipeline();
  for (const key of buttonKeys) {
    hgetPipeline.hgetall(key);
  }

  (await hgetPipeline.exec()).forEach(([error, result], index) => {
    if (error) throw error;

    const button = result as DBButton | null;
    if (!button) return;

    buttons.push({
      id: buttonKeys[index],
      name: buttonKeys[index].split(":")[1],
      ...button,
    });
  });

  console.log(buttons);

  buttons.sort((a, b) => a.created - b.created);

  return buttons;
}

interface MakeSoundboardOptions {
  style?: ButtonStyle;

  offset?: number;
}

export function makeSoundboard(buttons: Button[], options: MakeSoundboardOptions = {}): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();

  for (const button of buttons) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(button.id)
        .setLabel(button.name)
        .setStyle(options.style ?? ButtonStyle.Primary)
        .setEmoji(button.emoji)
    );
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder<ButtonBuilder>();
    }
  }

  if (row.components.length > 0) rows.push(row);

  return rows;
}
