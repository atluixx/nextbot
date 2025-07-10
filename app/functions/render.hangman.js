import { createCanvas, loadImage, registerFont } from "canvas";

registerFont("./app/fonts/Shippori.ttf", {
  family: "Shippori Antique Embolden",
});

const normalize = (str) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export async function generateCanvas({
  word,
  guessedLetters,
  wrongGuesses,
  fullGuess = null,
  maxWrongGuesses,
  hint,
  texts = {
    usedLetters: "LETRAS USADAS:",
    attemptsLeft: "TENTATIVAS RESTANTES:",
    totalLetters: "LETRAS TOTAIS:",
    hintLabel: "DICA:",
  },
}) {
  const canvas = createCanvas(1080, 900);
  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.08;
  const background = await loadImage("./app/icons/background.png");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  let underscoreBaseY = 0;

  function drawUnderscores() {
    const maxLettersPerLine = 16;
    const lines = [];
    let currentLine = [];
    let letterCount = 0;

    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      currentLine.push(letter);
      if (letter !== " ") letterCount++;
      if (letterCount >= maxLettersPerLine || i === word.length - 1) {
        lines.push(currentLine);
        currentLine = [];
        letterCount = 0;
      }
    }

    const lineStartY = 300;
    const lineSpacing = 70;
    underscoreBaseY = lineStartY + (lines.length - 1) * lineSpacing;

    lines.forEach((line, lineIndex) => {
      const totalWidth = line.length * 50 + (line.length - 1) * 15;
      let startX = centerX - totalWidth / 2;
      const y = lineStartY + lineIndex * lineSpacing;

      for (let i = 0; i < line.length; i++) {
        const originalLetter = line[i];

        if (originalLetter === " ") {
          startX += 65;
          continue;
        }

        const normalizedLetter = normalize(originalLetter);

        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + 50, y);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.stroke();

        if (
          guessedLetters.map((l) => normalize(l)).includes(normalizedLetter)
        ) {
          ctx.font = "bold 40px 'Shippori Antique Embolden'";
          ctx.fillStyle = "#000";
          ctx.textAlign = "center";
          ctx.fillText(originalLetter.toUpperCase(), startX + 25, y - 10);
        }

        startX += 65;
      }
    });
  }

  const normalizedWord = normalize(word);
  let fullGuessWrong = false;
  let isWin = false;

  if (fullGuess) {
    const normalizedFullGuess = normalize(fullGuess);
    if (normalizedFullGuess === normalizedWord) {
      guessedLetters = Array.from(new Set(word.replace(/ /g, "").split("")));
      isWin = true;
    } else {
      fullGuessWrong = true;
    }
  }

  if (fullGuessWrong) {
    wrongGuesses = [...wrongGuesses, "*"];
  }

  drawUnderscores();

  const textStartY = underscoreBaseY + 70;

  ctx.font = "bold 26px 'Shippori Antique Embolden'";
  ctx.textAlign = "left";
  const label = texts.usedLetters + " ";
  const used = guessedLetters.concat(wrongGuesses.filter((l) => l !== "*"));
  const coloredParts = used.map((letter) => ({
    letter: letter.toUpperCase(),
    color: wrongGuesses.includes(letter) ? "#d00" : "#0a0",
  }));

  let totalWidth = ctx.measureText(label).width;
  coloredParts.forEach((part, i) => {
    totalWidth += ctx.measureText(part.letter).width;
    if (i < coloredParts.length - 1) totalWidth += ctx.measureText(", ").width;
  });

  let x = centerX - totalWidth / 2;
  let y = textStartY;

  ctx.fillStyle = "#000";
  ctx.fillText(label, x, y);
  x += ctx.measureText(label).width;

  coloredParts.forEach((part, i) => {
    ctx.fillStyle = part.color;
    ctx.fillText(part.letter, x, y);
    x += ctx.measureText(part.letter).width;

    if (i < coloredParts.length - 1) {
      ctx.fillStyle = "#000";
      ctx.fillText(", ", x, y);
      x += ctx.measureText(", ").width;
    }
  });

  const wrongCount = wrongGuesses.length;
  const remaining = maxWrongGuesses - wrongCount;
  let attemptsColor = "#00CC00";
  if (remaining <= 2) attemptsColor = "#FF0000";
  else if (remaining <= 4) attemptsColor = "#FFA500";

  const attemptsLabel = texts.attemptsLeft + " ";
  const attemptsValue = `${remaining}`;
  const attemptsTextWidth =
    ctx.measureText(attemptsLabel).width + ctx.measureText(attemptsValue).width;

  let ax = centerX - attemptsTextWidth / 2;
  let ay = y + 40;

  ctx.fillStyle = "#000";
  ctx.fillText(attemptsLabel, ax, ay);
  ax += ctx.measureText(attemptsLabel).width;

  ctx.fillStyle = attemptsColor;
  ctx.fillText(attemptsValue, ax, ay);

  const totalLettersText = `${texts.totalLetters} ${word.length}`;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillText(totalLettersText, centerX, ay + 35);

  // 👉 Só desenha a dica se ela estiver definida
  if (hint && hint.trim() !== "") {
    ctx.font = "bold 26px 'Inter Black'";
    ctx.fillStyle = "#222";
    ctx.fillText(texts.hintLabel, centerX, ay + 70);

    ctx.textAlign = "left";
    ctx.font = "20px Inter";
    ctx.fillStyle = "#000";
    const maxHintWidth = canvas.width * 0.5;
    const hintLines = wrapText(ctx, hint, maxHintWidth);
    const leftMargin = centerX - maxHintWidth / 2;

    hintLines.forEach((line, i) => {
      ctx.fillText(line, leftMargin, ay + 100 + i * 26);
    });
  }

  // Desenha o boneco da forca
  const gallowsTop = 60;
  const headRadius = 30;
  const bodyLength = 80;
  const armLength = 30;
  const legLength = 40;

  ctx.strokeStyle = "#000";
  const parts = [
    () => {
      ctx.beginPath();
      ctx.strokeStyle = "#873e23";
      ctx.lineWidth = 4;
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, gallowsTop);
      ctx.stroke();

      ctx.strokeStyle = "#000";
      ctx.beginPath();
      ctx.arc(centerX, gallowsTop + headRadius, headRadius, 0, Math.PI * 2);
      ctx.stroke();
    },
    () => {
      ctx.beginPath();
      ctx.moveTo(centerX, gallowsTop + headRadius * 2);
      ctx.lineTo(centerX, gallowsTop + headRadius * 2 + bodyLength);
      ctx.stroke();
    },
    () => {
      ctx.beginPath();
      ctx.moveTo(centerX, gallowsTop + headRadius * 2 + 20);
      ctx.lineTo(centerX - armLength, gallowsTop + headRadius * 2 + 40);
      ctx.stroke();
    },
    () => {
      ctx.beginPath();
      ctx.moveTo(centerX, gallowsTop + headRadius * 2 + 20);
      ctx.lineTo(centerX + armLength, gallowsTop + headRadius * 2 + 40);
      ctx.stroke();
    },
    () => {
      ctx.beginPath();
      ctx.moveTo(centerX, gallowsTop + headRadius * 2 + bodyLength);
      ctx.lineTo(
        centerX - legLength,
        gallowsTop + headRadius * 2 + bodyLength + 30
      );
      ctx.stroke();
    },
    () => {
      ctx.beginPath();
      ctx.moveTo(centerX, gallowsTop + headRadius * 2 + bodyLength);
      ctx.lineTo(
        centerX + legLength,
        gallowsTop + headRadius * 2 + bodyLength + 30
      );
      ctx.stroke();
    },
  ];

  for (let i = 0; i < wrongCount && i < maxWrongGuesses; i++) {
    parts[i]();
  }

  if (!isWin) {
    const normalizedWordLetters = [
      ...new Set(
        word
          .split("")
          .filter((c) => c !== " ")
          .map((l) => normalize(l))
      ),
    ];
    const normalizedGuesses = guessedLetters.map((l) => normalize(l));
    isWin = normalizedWordLetters.every((letter) =>
      normalizedGuesses.includes(letter)
    );
  }

  const isGameOver = isWin || wrongCount >= maxWrongGuesses;
  const buffer = canvas.toBuffer("image/png");
  return { buffer, isWin, isGameOver };
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}
