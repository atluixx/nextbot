// @ts-nocheck

/**
 * @param {{
 *   client: import('@open-wa/wa-automate').Client,
 *   message: import('@open-wa/wa-automate').Message,
 *   prisma: import('@prisma/client').PrismaClient,
 *   prefix: string
 * }} param0
 */

const message_handler = async ({ client, message, prisma }) => {
  const chatId = message.chatId;
  const senderId = message.sender.id;
  const isGroup = chatId.endsWith('@g.us');

  if (!message.body?.trim()) return;

  let user = await prisma.user.findFirst({ where: { id: senderId } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: senderId,
        name: message.sender.pushname || 'Unknown',
        config: {
          create: {},
        },
        stats: {
          create: {},
        },
      },
      include: {
        config: true,
        stats: true,
      },
    });

    console.log(`[DB] Novo usuário registrado: ${senderId}`);
  }

  if (user.name !== message.sender.pushname) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: message.sender.pushname,
      },
    });
  }

  let group = null;

  if (isGroup) {
    group = await prisma.group.findFirst({ where: { group_id: chatId } });

    if (!group) {
      try {
        group = await prisma.group.create({
          data: {
            group_id: chatId,
            name: message.chat.name || 'Unknown',
          },
        });

        console.log(`[DB] Novo grupo registrado: ${chatId}`);
      } catch (err) {
        console.error(`[DB] Erro ao registrar grupo ${chatId}:`, err);
      }
    }

    try {
      await prisma.groupUser.upsert({
        where: {
          user_id_group_id: {
            user_id: user.database_id,
            group_id: group.database_id,
          },
        },
        update: {
          messages: { increment: 1 },
        },
        create: {
          user_id: user.database_id,
          group_id: group.database_id,
          messages: 1,
        },
      });
    } catch (err) {
      console.error(`[DB] Erro ao registrar GroupUser:`, err);
    }

    await prisma.group.update({
      where: { group_id: chatId },
      data: {
        total_messages: { increment: 1 },
        last_activity: new Date(),
        prefix: '.',
      },
    });
  }

  const prefix = isGroup ? group?.prefix || prefix : prefix;

  console.log(
    `[M] Mensagem de ${
      message.sender.pushname || message.sender.formattedName || 'Alguém'
    }: ${message.body || message.caption || '[Sem texto]'} | Tipo: ${
      message.type
    } | ID: ${message.id} | Grupo: ${isGroup}`
  );

  if (
    typeof message.body === 'string' &&
    message.body.includes('@559193959166')
  ) {
    const botInfo = await client.getMe();

    return await client.reply(
      message.chat.id,
      `✨ | Olá, ${message.sender.pushname || 'usuário'}! Eu sou o ${
        botInfo.name
      }.\n` + `Meu prefixo neste grupo é: *${prefix}*`,
      message.id
    );
  }

  if (!message.body.startsWith(prefix)) return;

  const [commandName, ...args] = message.body
    .slice(prefix.length)
    .trim()
    .split(/\s+/);

  const command = client.commands.get(commandName.toLowerCase());

  if (!command) return;

  await prisma.config.update({
    where: { config_id: user.config_id },
    data: {
      commands_used: {
        increment: 1,
      },
    },
  });

  if (command.admin_only && !client.isAdmin(message.sender)) {
    return client.reply(
      chatId,
      client.messages?.moderation?.admin_only?.({
        username: message.sender.pushname,
      }) || '⚠️ Apenas administradores podem usar este comando.',
      message.id
    );
  }

  if (
    command.group_admin_only &&
    !(await client.getGroupAdmins(chatId)).includes(senderId)
  ) {
    return client.reply(
      chatId,
      client.messages?.moderation?.group_admin?.({
        username: message.sender.pushname,
      }) || '⚠️ Apenas administradores do grupo podem usar este comando.',
      message.id
    );
  }

  try {
    await client.react(message.id, '⏳');

    await command.execute({
      client,
      message,
      args,
      user,
      group,
      prisma,
      prefix,
      chatId,
      senderId,
      isGroup,
    });

    await client.react(message.id, '✅');
  } catch (error) {
    console.error(`[CMD] Erro ao executar comando '${commandName}':`, error);
    await client.reply(
      chatId,
      '❌ Ocorreu um erro ao executar o comando. Tente novamente.',
      message.id
    );
  }
};

export default message_handler;
