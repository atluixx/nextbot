// @ts-nocheck

const command = {
  name: 'autosticker',
  aliases: [],
  description: 'Ativa ou desativa o envio automático de figurinhas',
  args_length: 0,
  args: '',
  admin_only: true,
  group_admin_only: false,
  group_only: false,

  /**
   * @param {{ client: import("@open-wa/wa-automate").Client, message: import("@open-wa/wa-automate").Message, args: string[], prisma: import("@prisma/client").PrismaClient, prefix: string, user: any }} param0
   */
  execute: async ({ client, message, args, prefix, prisma, user }) => {
    try {
      let u = user;

      if (!u) {
        u = await prisma.user.findUnique({
          where: { id: message.sender.id },
          include: { config: true },
        });
      }

      if (!u || !u.config) {
        return client.reply(
          message.chat.id,
          '❌ Usuário ou configuração não encontrada no banco de dados.',
          message.id
        );
      }

      const currentStatus = u.config.auto_sticker;

      await prisma.user.update({
        where: { id: u.id },
        data: {
          config: {
            update: {
              auto_sticker: !currentStatus,
            },
          },
        },
      });

      await client.reply(
        message.chat.id,
        `✅ A opção de figurinhas automáticas foi *${
          !currentStatus ? 'ativada' : 'desativada'
        }*.`,
        message.id
      );
    } catch (err) {
      console.error('Erro ao alternar autosticker:', err);
      await client.reply(
        message.chat.id,
        '❌ Ocorreu um erro ao processar o comando.',
        message.id
      );
    }
  },
};

export default command;
