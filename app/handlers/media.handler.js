/**
 * @param {{client: import("@open-wa/wa-automate").Client, message: import("@open-wa/wa-automate").Message, prisma: import("@prisma/client").PrismaClient }} param0
 */

const media_handler = async ({ client, message, prisma }) => {
  const isImage =
    message.mimetype?.includes('image/') || message.type === 'image';
  const isVideo =
    message.mimetype?.includes('video/') || message.type === 'video';

  const isStickerCommand =
    message.caption?.toLowerCase().startsWith('sticker') ||
    message.caption?.toLowerCase().startsWith('figurinha');

  const chatId = message.chat.id;

  const isMedia = isImage || isVideo || isStickerCommand;
  if (!isMedia) {
    return client.reply(
      chatId,
      // @ts-ignore
      client?.messages?.stickers?.media_not_found?.() ||
        'Mídia não reconhecida para figurinha.',
      message.id
    );
  }

  let shouldConvert = false;
  let user;
  let group;
  try {
    if (chatId.includes('@g.us')) {
      group = await prisma.group.findUnique({
        where: { group_id: chatId },
      });
      if (!group) {
        group = prisma.group
          .create({
            data: {
              group_id: chatId,
              name: message.chat.name || 'No Name',
            },
          })
          .catch(() => null);
      }

      user = await prisma.user
        .findUnique({
          where: {
            id: message.sender.id,
          },
        })
        .catch(() => null);

      if (!user) {
        user = prisma.user.create({
          data: {
            id: message.sender.id,
            name:
              message.sender.pushname ||
              message.sender.name ||
              message.sender.formattedName ||
              'Unknown',
          },
        });
      }

      shouldConvert =
        // @ts-ignore
        group?.autosticker || user?.config?.auto_sticker || isStickerCommand;
    } else {
      user = await prisma.user
        .findUnique({
          where: { id: message?.sender?.id },
        })
        .catch(() => null);
      shouldConvert = user?.config?.auto_sticker || isStickerCommand;
    }

    if (!shouldConvert) return;

    const mediaBuffer = await client.decryptMedia(message);

    const stickerOptions = {
      pack: '🅽',
      author: 'NextBOT',
      keepScale:
        user?.config?.user_ratio === 'RATIO_16_9' ? true : false || false,
    };

    if (isImage) {
      await client.sendImageAsStickerAsReply(
        chatId,
        mediaBuffer,
        message.id,
        stickerOptions
      );

      // @ts-ignore
      console.log(client?.messages?.stickers?.success());
    } else if (isVideo) {
      await client.sendMp4AsSticker(
        chatId,
        mediaBuffer,
        null,
        stickerOptions,
        message.id
      );

      // @ts-ignore
      console.log(client?.messages?.stickers?.success());
    }
  } catch (error) {
    // @ts-ignore
    console.log(client?.messages?.stickers?.error());
  }
};

export default media_handler;
