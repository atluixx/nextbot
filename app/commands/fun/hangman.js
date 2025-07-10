// @ts-nocheck

import { generateCanvas } from "../../functions/render.hangman.js";
import { InferenceClient } from "@huggingface/inference";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config.js";

const GEMINI_API_KEY = process.env.GENAI_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const games = new Map();
const usedWords = new Set();

function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function generateAIWord(maxAttempts = 5) {
  const client = new InferenceClient(process.env.HFT);

  const prompt = `Gere um objeto JSON no formato: { "word": "", "hint": "" }.
  O objeto retornado deve conter apenas o JSON sem texto adicional e sem formatação como crase ou 'json'.
A palavra (word) pode ser qualquer coisa (de 8 a 20 letras) — substantivo, adjetivo, verbo, nome próprio, objeto, conceito, lugar, etc. de media complexidade, nada exageradamente complicado.
A dica (hint) deve ter tamanho médio (entre 10 e 25 palavras), ser clara. Ela não pode conter a palavra, mas deve ajudar a pessoa a pensar logicamente nela, com associações, contexto ou características. Evite dicas muito vagas, devem ser óbvias. Seja criativo e inteligente.
`;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await client.chatCompletion({
        provider: "novita",
        model: "deepseek-ai/DeepSeek-R1-0528",
        messages: [{ role: "user", content: prompt }],
      });

      const text = (await result).choices[0].message;
      console.log(text);
      const jsonMatch = text.match(/{[^}]+}/s);
      if (!jsonMatch) throw new Error("Resposta inválida da IA.");

      const jsonData = JSON.parse(jsonMatch[0]);
      const word = jsonData.word.trim().toLowerCase();
      const hint = jsonData.hint.trim();

      if (
        word.length < 6 ||
        word.length > 20 ||
        !/^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(word) ||
        usedWords.has(word)
      )
        continue;

      usedWords.add(word);
      return { word, hint };
    } catch (err) {
      console.error("Erro ao gerar palavra com Gemini:", err);
    }
  }

  return {
    word: "aurora",
    hint: "É quando o céu desperta antes de todo mundo.",
  };
}

// FUNÇÕES INTERNAS DE BANCO
async function getOrCreateUser(prisma, userId) {
  let user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const stats = await prisma.stats.create({ data: {} });
    user = await prisma.user.create({
      data: {
        id: userId,
        stats_id: stats.id,
      },
    });
  }

  const stats = await prisma.stats.findUnique({
    where: { id: user.stats_id },
  });

  return { user, stats };
}

async function updateStats(prisma, userId, won) {
  const { user, stats } = await getOrCreateUser(prisma, userId);

  const updatedStats = {
    hangman_games: { increment: 1 },
    hangman_wins: won ? { increment: 1 } : undefined,
    hangman_streak: won ? { increment: 1 } : { set: 0 },
  };

  const totalGames = stats.hangman_games + 1;
  const totalWins = stats.hangman_wins + (won ? 1 : 0);
  const winrate = Math.round((totalWins / totalGames) * 100);

  await prisma.stats.update({
    where: { id: user.stats_id },
    data: {
      ...updatedStats,
      hangman_winrate: winrate,
    },
  });
}

async function saveGame(prisma, userId, word, won, guessed, wrong) {
  const { user } = await getOrCreateUser(prisma, userId);
  await prisma.hangman_game.create({
    data: {
      user_id: user.id,
      word,
      won,
      guessed_letters: guessed.join(","),
      wrong_letters: wrong.join(","),
    },
  });
}

// COMANDO PRINCIPAL
const command = {
  name: "letra",
  aliases: ["palavra", "forca"],
  description:
    "Jogue forca. Use 'letra <letra>' ou 'palavra <palpite>'. Sem argumentos para iniciar.",
  args_length: 1,
  args: "[letra | palavra]",
  admin_only: false,
  group_admin_only: false,
  group_only: false,

  /**
   * @param {{ client: import('@open-wa/wa-automate').Client, message: import("@open-wa/wa-automate").Message, args: string[], prisma: import("@prisma/client").PrismaClient, prefix: string }} param0
   */
  execute: async ({ client, message, args, prisma, prefix }) => {
    const chatId = message.chatId;
    const userId = message.sender.id;
    const gameKey = chatId;
    const input = args.join(" ").trim().toLowerCase();
    const maxWrongGuesses = 6;
    const commandUsed = message.body
      .slice(prefix.length)
      .split(" ")[0]
      .toLowerCase();

    if (!input && games.has(gameKey)) {
      return client.reply(
        chatId,
        `⚠️ Já existe um jogo em andamento!\nUse *${prefix}letra <letra>* ou *${prefix}palavra <palpite>* para jogar.`,
        message.id
      );
    }

    if (!input && !games.has(gameKey)) {
      const generated = await generateAIWord();
      games.set(gameKey, {
        word: generated.word,
        hint: generated.hint,
        guessed: [],
        wrong: [],
        hintRevealed: false,
      });

      const result = await generateCanvas({
        word: generated.word,
        guessedLetters: [],
        wrongGuesses: [],
        fullGuess: "",
        maxWrongGuesses,
        hint: "",
        texts: {
          usedLetters: "LETRAS USADAS:",
          attemptsLeft: "TENTATIVAS RESTANTES:",
          totalLetters: "LETRAS TOTAIS:",
          hintLabel: "",
        },
      });

      return client.sendImage(
        chatId,
        result.buffer,
        "forca.png",
        `🎮 Novo jogo de *forca* iniciado!\nUse *${prefix}letra <letra>* ou *${prefix}palavra <palpite>* para jogar.`,
        message.id
      );
    }

    const game = games.get(gameKey);
    if (!game) {
      return client.reply(
        chatId,
        `⚠️ Nenhum jogo ativo. Use *${prefix}letra* para começar.`,
        message.id
      );
    }

    if (input === "dica") {
      if (game.hintRevealed)
        return client.reply(chatId, "💡 A dica já foi revelada.", message.id);

      game.hintRevealed = true;
      return client.reply(chatId, `💡 Dica: ${game.hint}`, message.id);
    }

    const { word, hint, guessed, wrong, hintRevealed } = game;
    const normalizedWord = normalize(word);
    const guess = normalize(input);

    if (commandUsed === "letra") {
      if (guess.length !== 1 || !/^[a-z]$/i.test(guess)) {
        return client.reply(chatId, "❌ Envie *uma única letra*.", message.id);
      }

      if (guessed.includes(guess) || wrong.includes(guess)) {
        return client.reply(chatId, "⚠️ Letra já usada.", message.id);
      }

      if (normalizedWord.includes(guess)) {
        guessed.push(guess);
      } else {
        wrong.push(guess);
      }
    } else if (commandUsed === "palavra" || commandUsed === "forca") {
      if (guess.length <= 1 || !/^[a-z]+$/i.test(guess)) {
        return client.reply(
          chatId,
          "❌ Envie uma *palavra válida* com pelo menos 2 letras.",
          message.id
        );
      }

      if (guess === normalizedWord) {
        game.guessed = [...new Set(normalizedWord.split(""))];
        await updateStats(prisma, userId, true);
      }
    } else {
      return client.reply(chatId, "❓ Comando desconhecido.", message.id);
    }

    const result = await generateCanvas({
      word,
      guessedLetters: guessed,
      wrongGuesses: wrong,
      fullGuess: guess.length > 1 ? guess : "",
      maxWrongGuesses,
      hint: hintRevealed ? hint : "",
      texts: {
        usedLetters: "LETRAS USADAS:",
        attemptsLeft: "TENTATIVAS RESTANTES:",
        totalLetters: "LETRAS TOTAIS:",
        hintLabel: hintRevealed ? "DICA:" : "",
      },
    });

    if (result.isGameOver) {
      games.delete(gameKey);

      const isWin = result.isWin;
      await updateStats(prisma, userId, isWin);
      await saveGame(prisma, userId, word, isWin, guessed, wrong);
    }

    await client.sendImage(
      chatId,
      result.buffer,
      "forca.png",
      result.isGameOver
        ? result.isWin
          ? `🎉 Parabéns! Você acertou a palavra: *${word.toUpperCase()}*!`
          : `💀 Fim de jogo! A palavra era: *${word.toUpperCase()}*.`
        : guess.length > 1
        ? guess === normalizedWord
          ? "✅ Palavra correta!"
          : "❌ Palavra incorreta!"
        : normalizedWord.includes(guess)
        ? "✅ Letra correta!"
        : "❌ Letra incorreta!",
      message.id
    );
  },
};

export default command;
