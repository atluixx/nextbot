/**
 * @param {{ client: import('@open-wa/wa-automate').Client, prefix: String, message: import("@open-wa/wa-automate").Message, prisma: import("@prisma/client").PrismaClient }} param0
 */
const message_handler = async ({ client, message, prisma, prefix = '-' }) => {
  let group = false;

  if (message.chat.id.endsWith('@g.us')) group = true;
  if (!message.body.trim()) return;

  let user = await prisma.user.findUnique({
    where: { id: message.sender.id },
  });

  let chat = await prisma.group.findUnique({
    where: { group_id: message.chat.id },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: message.sender.id,
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
  }

  if (!chat && group) {
    chat = await prisma.group.create({
      data: {
        group_id: message.chat.id,
      },
    });
  }

  console.log(
    `[M] Message received from ${
      message.sender.pushname || message.sender.formattedName || 'somebody'
    }: ${message.body || message.caption || 'No text'} | ${
      message.type
    } | ID: ${message.id} | Group: ${group}`
  );

  if (!message.body.startsWith(prefix)) return;

  const [command, ...args] = message.body
    .slice(prefix.length)
    .trim()
    .split(/ +/);

  // @ts-ignore
  const cmd = client.commands.get(command.toLowerCase());

  if (!cmd) {
    return;
  }

  if (
    cmd.admin_only &&
    // @ts-ignore
    !client.isAdmin(message.sender)
  )
    return client.reply(
      message.chat.id,
      // @ts-ignore
      client.messages.moderation.admin_only({
        username: message.sender.pushname,
      }),
      message.id
    );

  if (
    cmd.group_admin_only &&
    // @ts-ignore
    !(await client.getGroupAdmins(message.chat.id)).includes(message.sender.id)
  )
    return client.reply(
      message.chat.id,
      // @ts-ignore
      client.messages.moderation.group_admin({
        username: message.sender.pushname,
      }),
      message.id
    );

  try {
    await cmd.execute({
      client,
      message,
      args,
      user,
      prisma,
      prefix,
    });
  } catch (error) {
    console.log(`[M] Error executing command ${command}:`, error);
  }
};

export default message_handler;
