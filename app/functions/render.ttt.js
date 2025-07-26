// @ts-nocheck

import { createCanvas } from "canvas";
import { writeFile } from "fs/promises";

const STYLE = {
  canvas: { width: 600, height: 600 },
  colors: {
    background: "#1F2937", // gradiente: escuro em cima
    background2: "#111827", // gradiente: mais escuro embaixo
    board: "#2B2B31",
    x: "#FFFFFF",
    o: "#3B82F6",
    grid: "#3D3D46",
  },
  cellSize: 120,

  lineWidth: 4,
};

// 🔹 Função auxiliar para desenhar retângulo com cantos arredondados
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

export async function renderFlatMinimalTicTacToe({
  board = [
    ["X", "", "X"],
    ["", "O", "O"],
    ["O", "", "X"],
  ],
} = {}) {
  const canvas = createCanvas(STYLE.canvas.width, STYLE.canvas.height);
  const ctx = canvas.getContext("2d");

  // 🔹 Fundo com gradiente
  const gradient = ctx.createLinearGradient(0, 0, 0, STYLE.canvas.height);
  gradient.addColorStop(0, STYLE.colors.background);
  gradient.addColorStop(1, STYLE.colors.background2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, STYLE.canvas.width, STYLE.canvas.height);

  // 🔹 Tabuleiro
  const boardSize = STYLE.cellSize * 3;
  const boardOffsetX = (STYLE.canvas.width - boardSize) / 2;
  const boardOffsetY = (STYLE.canvas.height - boardSize) / 2;

  ctx.fillStyle = STYLE.colors.board;
  drawRoundedRect(ctx, boardOffsetX, boardOffsetY, boardSize, boardSize, 12);
  ctx.fill();

  // 🔹 Grade
  ctx.strokeStyle = STYLE.colors.grid;
  ctx.lineWidth = STYLE.lineWidth;

  for (let i = 1; i < 3; i++) {
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(boardOffsetX, boardOffsetY + i * STYLE.cellSize);
    ctx.lineTo(boardOffsetX + boardSize, boardOffsetY + i * STYLE.cellSize);
    ctx.stroke();

    // Vertical
    ctx.beginPath();
    ctx.moveTo(boardOffsetX + i * STYLE.cellSize, boardOffsetY);
    ctx.lineTo(boardOffsetX + i * STYLE.cellSize, boardOffsetY + boardSize);
    ctx.stroke();
  }

  // 🔹 Números das células (1 a 9)
  ctx.font = "bold 36px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let cellNumber = 1;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = boardOffsetX + col * STYLE.cellSize + STYLE.cellSize / 2;
      const cy = boardOffsetY + row * STYLE.cellSize + STYLE.cellSize / 2;
      ctx.fillText(cellNumber.toString(), cx, cy);
      cellNumber++;
    }
  }

  // 🔹 Peças
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const value = board[row][col];
      if (!value) continue;

      const cx = boardOffsetX + col * STYLE.cellSize + STYLE.cellSize / 2;
      const cy = boardOffsetY + row * STYLE.cellSize + STYLE.cellSize / 2;

      if (value === "X") {
        ctx.strokeStyle = STYLE.colors.x;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy - 30);
        ctx.lineTo(cx + 30, cy + 30);
        ctx.moveTo(cx + 30, cy - 30);
        ctx.lineTo(cx - 30, cy + 30);
        ctx.stroke();
      } else if (value === "O") {
        ctx.strokeStyle = STYLE.colors.o;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, 36, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  return canvas.toBuffer("image/png");
}
