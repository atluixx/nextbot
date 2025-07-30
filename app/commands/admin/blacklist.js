// @ts-nocheck

const command = {
  name: 'blacklist',
  aliases: [],
  description: 'Manage blacklist',
  args_length: 1,
  args: '<method> [@user] [motivo]',
  admin_only: true,
  group_admin_only: false,
  group_only: false,

  /**
   * @param {{ client: import("@open-wa/wa-automate").Client, message: import("@open-wa/wa-automate").Message, args: string[], prisma: import("@prisma/client").PrismaClient, prefix: string }} param0
   */
  execute: async ({ client, message, args, prefix, prisma }) => {
    try {
      const method = (args[0] || 'list').toLowerCase();
      const methods = ['list', 'add', 'remove'];

      if (!methods.includes(method)) {
        return client.reply(
          message.chat.id,
          `❌ Método inválido. Use:\n${prefix}blacklist <list|add|remove> [@user] [motivo]`,
          message.id
        );
      }

      if (method === 'list') {
        const users = await prisma.user.findMany({
          where: { blacklisted: true },
        });

        if (users.length === 0) {
          return client.reply(
            message.chat.id,
            '✅ Nenhum usuário na blacklist.',
            message.id
          );
        }

        const list = users
          .map((u, i) => `${i + 1}. ${u.name || 'Unknown'} (${u.id})`)
          .join('\n');
        return client.reply(
          message.chat.id,
          `📛 *Blacklist de usuários:*\n${list}\n\nTotal: ${users.length}`,
          message.id
        );
      }

      if (!args[1]) {
        return client.reply(
          message.chat.id,
          `❌ Você precisa mencionar um usuário. Exemplo:\n${prefix}blacklist ${method} @user`,
          message.id
        );
      }

      const user = await client.findUser({
        input: args[1],
        chat: message.chat.id,
        message,
      });

      if (!user) {
        return client.reply(
          message.chat.id,
          `❌ Usuário ${args[1]} não encontrado no grupo.`,
          message.id
        );
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        return client.reply(
          message.chat.id,
          `❌ O usuário ${user.formattedName} não existe no banco de dados.`,
          message.id
        );
      }

      if (method === 'add') {
        const reason = args.slice(2).join(' ') || 'Não informado';
        const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

        await prisma.user.update({
          where: { id: user.id },
          data: {
            blacklisted: true,
            blacklisted_reason: reason,
            blacklisted_until: thirtyDaysLater,
          },
        });

        return client.reply(
          message.chat.id,
          `🚫 O usuário *${user.formattedName}* foi adicionado à blacklist.\n📝 Motivo: ${reason}`,
          message.id
        );
      }

      if (method === 'remove') {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            blacklisted: false,
            blacklisted_reason: '',
            blacklisted_until: null,
          },
        });

        return client.reply(
          message.chat.id,
          `✅ O usuário *${user.formattedName}* foi removido da blacklist.`,
          message.id
        );
      }
    } catch (error) {
      console.error('Erro ao executar o comando blacklist:', error);
      return client.reply(
        message.chat.id,
        '❌ Ocorreu um erro ao processar o comando. Tente novamente.',
        message.id
      );
    }
  },
};

export default command;
