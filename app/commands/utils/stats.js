// @ts-nocheck

const command = {
  name: "stats",
  aliases: [],
  description: "Mostra os status do usuário atual ou de outro membro.",
  admin_only: false,
  group_admin_only: false,
  group_only: true,

  /**
   * @param {{
   *   client: import('@open-wa/wa-automate').Client,
   *   message: import('@open-wa/wa-automate').Message,
   *   prisma: import('@prisma/client').PrismaClient,
   * }} param0
   */

  execute: async ({ client, message, prisma }) => {
    const args = message.body.trim().split(/\s+/);
    const input = args[1];

    let targetUserId = message.sender.id;

    if (input) {
      const foundUser = await client.findUser({
        input: args.slice(1).join(" "),
        message,
      });

      if (!foundUser) {
        return client.sendText(message.chat.id, "Usuário não encontrado.");
      }

      targetUserId = foundUser.id;
    }

    const user = await prisma.user.findFirst({
      where: { id: targetUserId },
    });

    if (!user) {
      return client.sendText(message.chat.id, "Usuário não registrado.");
    }

    const config = await prisma.config.findFirst({
      where: { config_id: user.config_id },
    });

    const stats = await prisma.stats.findFirst({
      where: { stats_id: user.stats_id },
    });

    let stats_message = `📄 *Perfil de ${user.name}*\n\n`;

    stats_message += `🏦 *Chave PIX:* ${user?.pix_id || "Não definida"}\n`;
    stats_message += `🛡 *Autorizado:* ${user.authorized ? "Sim" : "Não"}\n`;
    stats_message += `⛔ *Banido:* ${user.blacklisted ? "Sim" : "Não"}\n`;
    stats_message += `💠 *Premium:* ${
      user.premium ? `Sim (até ${user.premium_until || "indefinido"})` : "Não"
    }\n`;
    stats_message += `🧰 *Cargo:* ${user.role || "Sem cargo"}\n\n`;

    if (config) {
      stats_message += `⚙️ *Configurações:*\n`;
      stats_message += `  • Auto Sticker: ${
        config.auto_sticker ? "Ativado" : "Desativado"
      }\n`;
      stats_message += `  • Ratio de imagem: ${config.user_ratio}\n`;
      stats_message += `  • Comandos usados: ${config.commands_used}\n\n`;
    }

    if (stats) {
      stats_message += `📊 *Estatísticas de Jogos:*\n`;

      stats_message += `🎯 Forca:\n`;
      stats_message += `  • Partidas: ${stats.hangman_games}\n`;
      stats_message += `  • Vitórias: ${stats.hangman_wins}\n`;
      stats_message += `  • Derrotas: ${stats.hangman_losses}\n`;
      stats_message += `  • Melhor sequência: ${stats.hangman_best}\n`;
      stats_message += `  • Sequência atual: ${stats.hangman_streak}\n`;
      stats_message += `  • Winrate: ${stats.hangman_winrate.toFixed(2)}%\n\n`;

      stats_message += `❌ Jogo da Velha:\n`;
      stats_message += `  • Partidas: ${stats.ttt_games}\n`;
      stats_message += `  • Vitórias: ${stats.ttt_wins}\n`;
      stats_message += `  • Empates: ${stats.ttt_draws}\n`;
      stats_message += `  • Derrotas: ${stats.ttt_losses}\n`;
      stats_message += `  • Melhor sequência: ${stats.ttt_best}\n`;
      stats_message += `  • Sequência atual: ${stats.ttt_streak}\n`;
      stats_message += `  • Winrate: ${stats.ttt_winrate.toFixed(2)}%\n\n`;

      stats_message += `🖼️ Stickers criados: ${stats.stickers}`;
    }

    await client.sendText(message.chat.id, stats_message);
  },
};

export default command;
