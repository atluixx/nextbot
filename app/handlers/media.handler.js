// @ts-nocheck
/**
 * @param {{client: import("@open-wa/wa-automate").Client, message: import("@open-wa/wa-automate").Message, prisma: import("@prisma/client").PrismaClient }} param0
 */

import { createCanvas, loadImage } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

const tempDir = path.resolve('./temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

async function stretchVideoToSquare(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters('scale=512:512,setdar=1:1')
      .noAudio()
      .outputOptions(['-preset', 'veryfast', '-crf', '32', '-fs', '950k'])
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

async function fitImageToCanvas(inputBuffer) {
  const canvasSize = 512;
  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  const img = await loadImage(inputBuffer);
  ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
  return canvas.toBuffer('image/png');
}

const media_handler = async ({ client, message, prisma }) => {
  const isGif = message.isGif === true;
  const isImage =
    message.mimetype?.includes('image/') && message.mimetype !== 'image/gif';
  const isVideo =
    message.mimetype?.includes('video/') || message.type === 'video';

  const isStickerCommand =
    message.caption?.toLowerCase().startsWith('sticker') ||
    message.caption?.toLowerCase().startsWith('figurinha');

  const shouldCheckMedia = isImage || isVideo || isGif || isStickerCommand;

  if (!shouldCheckMedia) return;

  const senderId = message.sender.id;
  const chatId = message.chat.id;

  let shouldConvert = false;
  let user;
  let group;

  try {
    // Verifica/grava grupo
    if (chatId.includes('@g.us')) {
      group = await prisma.group.upsert({
        where: { group_id: chatId },
        update: {},
        create: {
          group_id: chatId,
          name: message.chat.name || 'No Name',
        },
      });
    }

    // Verifica/grava usuário com config
    user = await prisma.user.findFirst({
      where: { id: senderId },
      include: { stats: true, config: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: senderId,
          name:
            message.sender.pushname ||
            message.sender.name ||
            message.sender.formattedName ||
            'Unknown',
          config: { create: { auto_sticker: false } },
          stats: { create: { stickers: 0 } },
        },
        include: { stats: true, config: true },
      });
    }

    shouldConvert =
      group?.autosticker || user?.config?.auto_sticker || isStickerCommand;

    if (!shouldConvert) return;

    await client.react(message.id, '⏳');

    let mediaRaw = await client.decryptMedia(message);

    const mediaBuffer = Buffer.isBuffer(mediaRaw)
      ? mediaRaw
      : Buffer.from(mediaRaw.split(',')[1], 'base64');

    if (!mediaBuffer || mediaBuffer.length < 1000) {
      throw new Error(
        'Falha ao obter a mídia. O buffer está vazio ou corrompido.'
      );
    }

    const stickerOptions = {
      pack: '🅽',
      author: 'NextBOT',
      keepScale: false,
    };

    if (isImage) {
      const squareBuffer = await fitImageToCanvas(mediaBuffer);
      await client.sendImageAsStickerAsReply(
        chatId,
        squareBuffer,
        message.id,
        stickerOptions
      );
      console.log('[STICKER ENVIADO] imagem');
    } else if (isVideo || isGif) {
      const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);

      await fs.promises.writeFile(inputPath, mediaBuffer);
      await stretchVideoToSquare(inputPath, outputPath);

      const stretchedBuffer = await fs.promises.readFile(outputPath);
      console.log(stretchedBuffer);

      if (stretchedBuffer.length < 1024 * 1024) {
        await client.sendMp4AsSticker(
          chatId,
          stretchedBuffer,
          null,
          stickerOptions,
          message.id
        );
        console.log('[STICKER ENVIADO] video/gif');
      } else {
        console.warn('⚠️ Arquivo final ultrapassa 1MB. Ignorando envio.');
      }

      await fs.promises.unlink(inputPath);
      await fs.promises.unlink(outputPath);
    }

    if (user?.stats?.stats_id) {
      await prisma.stats.update({
        where: { stats_id: user.stats.stats_id },
        data: { stickers: { increment: 1 } },
      });
    }

    await client.react(message.id, '✅');
  } catch (error) {
    console.error('[ERRO AO CRIAR STICKER]', error);
    await client.sendText(
      chatId,
      '⚠️ Ocorreu um erro ao tentar criar a figurinha.\nCertifique-se de que a mídia não é muito grande ou tente novamente mais tarde.'
    );
    await client.react(message.id, '❌');
  }
};

export default media_handler;
