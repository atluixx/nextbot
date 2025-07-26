// @ts-nocheck

import { generateCanvas } from "../../functions/render.hangman.js";
import { InferenceClient } from "@huggingface/inference";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import "dotenv/config.js";

const GEMINI_API_KEY = process.env.GENAI_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const games = new Map();

// 🧠 Carregamento e salvamento do used.words.json
const USED_WORDS_PATH = path.resolve("app/persistence/used.words.json");

let usedWords = new Set();

function loadUsedWords() {
  try {
    const data = fs.readFileSync(USED_WORDS_PATH, "utf8");
    const words = JSON.parse(data);
    if (Array.isArray(words)) {
      usedWords = new Set(words);
    }
  } catch {
    usedWords = new Set();
  }
}

function saveUsedWords() {
  try {
    fs.writeFileSync(USED_WORDS_PATH, JSON.stringify([...usedWords], null, 2));
  } catch (err) {
    console.error("Erro ao salvar used.words.json:", err);
  }
}

loadUsedWords();

function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractJsonFromText(text) {
  if (typeof text !== "string") return null;
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch {}
  }
  const fallbackMatch = text.match(/{[\s\S]*?}/);
  if (fallbackMatch) {
    try {
      return JSON.parse(fallbackMatch[0]);
    } catch {}
  }
  return null;
}

async function generateAIWord(maxAttempts = 5) {
  const client = new InferenceClient(process.env.HFT);
  const prompt = `Gere um objeto JSON no formato: { "word": "", "hint": "" }.
A palavra deve ter entre 5 e 10 letras. Pode ser substantivo, adjetivo, conceito, lugar, etc. A dica deve ter entre 10 e 25 palavras e ajudar logicamente, sem usar a palavra.`;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await client.chatCompletion({
        provider: "novita",
        model: "deepseek-ai/DeepSeek-R1-0528",
        messages: [{ role: "user", content: prompt }],
      });

      const text = result.choices[0].message?.content;
      const jsonData = extractJsonFromText(text);

      if (!jsonData || !jsonData.word || !jsonData.hint) throw new Error();

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
      saveUsedWords();
      return { word, hint };
    } catch {}
  }

  return {
    word: "aurora",
    hint: "É quando o céu desperta antes de todo mundo.",
  };
}

async function getOrCreateUser(prisma, userId) {
  let user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) {
    const stats = await prisma.stats.create({ data: {} });
    user = await prisma.user.create({
      data: {
        name: "Unknown",
        id: userId,
        stats_id: stats.stats_id,
        config_id: crypto.randomUUID(),
      },
    });
  }

  const stats = await prisma.stats.findUnique({
    where: { stats_id: user.stats_id },
  });

  return { user, stats };
}

async function updateStats(prisma, userId, won) {
  const { user, stats } = await getOrCreateUser(prisma, userId);

  const updatedStats = {
    hangman_games: { increment: 1 },
  };

  if (won) {
    const newStreak = stats.hangman_streak + 1;
    const newBest = Math.max(newStreak, stats.hangman_best ?? 0);
    updatedStats.hangman_wins = { increment: 1 };
    updatedStats.hangman_streak = { increment: 1 };
    updatedStats.hangman_best = { set: newBest };
  } else {
    updatedStats.hangman_losses = { increment: 1 };
    updatedStats.hangman_streak = { set: 0 };
  }

  const totalGames = stats.hangman_games + 1;
  const totalWins = stats.hangman_wins + (won ? 1 : 0);
  const winrate = Math.round((totalWins / totalGames) * 100);

  await prisma.stats.update({
    where: { stats_id: user.stats_id },
    data: {
      ...updatedStats,
      hangman_winrate: winrate,
    },
  });
}

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
    let gameOverNow = false;
    let isWin = false;

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
      gameOverNow = true;
      isWin = result.isWin;
      await updateStats(prisma, userId, isWin);
      games.delete(gameKey);
    }

    await client.sendImage(
      chatId,
      result.buffer,
      "forca.png",
      result.isGameOver
        ? isWin
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
