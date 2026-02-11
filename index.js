require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  AttachmentBuilder,
} = require("discord.js");

const path = require("path");
const fs = require("fs");

/**
 * =========================
 * CONFIG
 * =========================
 */

// false = pode acumular cargos
// true  = apenas 1 cargo por vez
const SINGLE_CHOICE = false;

// Botão -> Cargo
const ROLE_MAP = {
  race_sons_of_fenrir: "1470570527666995310",
  race_Cultural: "1470569989185605705",
  race_shadow_fenrir: "1470570687952453672",
  race_lobos: "1470940273482662074",
  race_membros: "1470935115113697361",
};

// Valida ID do Discord
function isValidSnowflake(id) {
  return typeof id === "string" && /^\d{17,20}$/.test(id);
}

/**
 * =========================
 * CLIENT
 * =========================
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

/**
 * =========================
 * READY → ENVIA PAINEL
 * =========================
 */
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logado como ${client.user.tag}`);

  try {
    const guildId = process.env.GUILD_ID;
    const channelId = process.env.PANEL_CHANNEL_ID;

    if (!guildId || !channelId) {
      console.log("❌ Falta GUILD_ID ou PANEL_CHANNEL_ID no .env");
      return;
    }

    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) {
      console.log("❌ Canal inválido.");
      return;
    }

    // ===== IMAGEM LOCAL (THUMBNAIL) =====
    const clanPath = path.join(__dirname, "img", "shadow.png");

    if (!fs.existsSync(clanPath)) {
      console.log("❌ NÃO achei a imagem em:", clanPath);
      console.log("✅ Crie a pasta img e coloque shadow.png dentro.");
      return;
    }

    const thumb = new AttachmentBuilder(clanPath);

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("⚔️ Bem vindo ao clã Shadow's Fenrir")
      .setDescription(
        [
          "Escolha abaixo a sua área:",
          "",
          "✅ Clique para **aplicar** o cargo.",
          "🔁 Clique novamente para **remover**.",
          "",
          SINGLE_CHOICE
            ? "⚠️ **Modo:** escolha única."
            : "⭐ **Modo:** múltipla escolha.",
        ].join("\n")
      )
      .setThumbnail("attachment://shadow.png")
      .setFooter({ text: "Setagem automática • Shadow's Fenrir" })
      .setTimestamp();

    // ===== BOTÕES =====
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("race_sons_of_fenrir")
        .setLabel("Sons de Fenrir")
        .setEmoji("🪓")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("race_Cultural")
        .setLabel("Cultural")
        .setEmoji("🏹")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("race_shadow_fenrir")
        .setLabel("Shadow Fenrir")
        .setEmoji("🩸")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("race_lobos")
        .setLabel("Lobos")
        .setEmoji("🐺")
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("race_membros")
        .setLabel("Membros")
        .setEmoji("🤝")
        .setStyle(ButtonStyle.Secondary)
    );

    // ===== ENVIO =====
    await channel.send({
      files: [thumb],
      embeds: [embed],
      components: [row1, row2],
    });

    console.log("✅ Painel enviado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar painel:", err);
  }
});

/**
 * =========================
 * INTERAÇÕES
 * =========================
 */
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("race_")) return;

    const roleId = ROLE_MAP[interaction.customId];

    if (!roleId || !isValidSnowflake(roleId)) {
      return interaction.reply({
        content: "❌ Cargo inválido.",
        ephemeral: true,
      });
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    // Escolha única
    if (SINGLE_CHOICE) {
      const toRemove = Object.values(ROLE_MAP).filter(
        (id) => id !== roleId && member.roles.cache.has(id)
      );
      if (toRemove.length) await member.roles.remove(toRemove).catch(() => {});
    }

    // Toggle
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return interaction.reply({ content: "✅ Cargo removido!", ephemeral: true });
    } else {
      await member.roles.add(roleId);
      return interaction.reply({ content: "✅ Cargo aplicado!", ephemeral: true });
    }
  } catch (err) {
    console.error("❌ Erro na interação:", err);
    if (!interaction.replied)
      interaction.reply({ content: "❌ Erro interno.", ephemeral: true });
  }
});

/**
 * =========================
 * NÃO CRASHAR
 * =========================
 */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(process.env.DISCORD_TOKEN);
