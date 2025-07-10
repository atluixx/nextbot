import path from "path";
import fs from "fs";
import axios from "axios";
import { createCanvas, registerFont, loadImage } from "canvas";
import "dotenv/config";

// Constantes visuais
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 900;
const BORDER_RADIUS = 16;

// Fontes
const fontPath = path.resolve("./app/fonts/Shippori.ttf");
registerFont(fontPath, { family: "Shippori Antique Regular" });

// Cache de ícones
const iconCache = new Map();

async function getCachedIcon(iconName) {
  if (iconCache.has(iconName)) return iconCache.get(iconName);
  const iconPath = path.resolve("./app/icons", iconName);
  const icon = await loadImage(iconPath);
  iconCache.set(iconName, icon);
  return icon;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitTextToWidth(
  ctx,
  text,
  maxWidth,
  initialSize = 48,
  minSize = 18,
  fontFamily = "Inter",
  weight = "400"
) {
  let fontSize = initialSize;
  while (fontSize > minSize) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    const measured = ctx.measureText(text).width;
    if (measured <= maxWidth) break;
    fontSize--;
  }
  return fontSize;
}

function wrapText(
  ctx,
  text,
  maxWidth,
  fontSize,
  fontFamily = "Inter",
  maxLines = 2
) {
  ctx.font = `300 ${fontSize}px ${fontFamily}`;
  const words = text.split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const testLine = current ? current + " " + word : word;
    const width = ctx.measureText(testLine).width;
    if (width < maxWidth) {
      current = testLine;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function getWeatherInfo(code, isDay) {
  const icons = {
    0: "sun.svg",
    1: "sun.svg",
    2: "cloud.svg",
    3: "cloud.svg",
    45: "fog.svg",
    48: "fog.svg",
    51: "rain.svg",
    53: "rain.svg",
    55: "rain.svg",
    56: "snow.svg",
    57: "snow.svg",
    61: "rain.svg",
    63: "rain.svg",
    65: "rain.svg",
    66: "snow.svg",
    67: "snow.svg",
    71: "snow.svg",
    73: "snow.svg",
    75: "snow.svg",
    77: "snow.svg",
    80: "rain.svg",
    81: "rain.svg",
    82: "storm.svg",
    85: "snow.svg",
    86: "snow.svg",
    95: "storm.svg",
    96: "storm.svg",
    99: "storm.svg",
  };

  const descriptions = {
    0: "Céu limpo",
    1: "Principalmente limpo",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Nevoeiro",
    48: "Nevoeiro depositante",
    51: "Garoa leve",
    53: "Garoa moderada",
    55: "Garoa densa",
    56: "Garoa congelante leve",
    57: "Garoa congelante densa",
    61: "Chuva leve",
    63: "Chuva moderada",
    65: "Chuva forte",
    66: "Chuva congelante leve",
    67: "Chuva congelante forte",
    71: "Neve leve",
    73: "Neve moderada",
    75: "Neve forte",
    77: "Grãos de neve",
    80: "Pancadas leves",
    81: "Pancadas moderadas",
    82: "Pancadas violentas",
    85: "Pancadas de neve leve",
    86: "Pancadas de neve forte",
    95: "Trovoada leve/moderada",
    96: "Trovoada com granizo leve",
    99: "Trovoada com granizo forte",
  };

  const icon =
    !isDay && (code === 0 || code === 1)
      ? "moon.svg"
      : icons[code] || "sun.svg";
  const description = descriptions[code] || "Desconhecido";

  return { icon, description };
}

function getLocalDate(timezone) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

function drawCityText(ctx, city, country, maxWidth = 300) {
  const lines = [`${city},`, country];
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fff";

  const fontSize = Math.min(
    ...lines.map((line) =>
      fitTextToWidth(ctx, line, maxWidth, 48, 18, "Shippori Antique Regular")
    )
  );

  ctx.font = `${fontSize}px "Shippori Antique Regular"`;
  lines.forEach((line, i) => {
    ctx.fillText(line, 40, 40 + i * (fontSize + 6));
  });
}

export async function generateWeatherImage({
  city = "Sao Paulo",
  country = "Brasil",
  temperature,
  condition,
  sensation,
  wind,
  humidity,
  weatherCode,
  forecast,
  date,
  isDay,
}) {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");

  // Fundo com degradê
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#29306C");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  roundRect(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, BORDER_RADIUS);
  ctx.fill();

  // Cidade e país
  drawCityText(ctx, city, country);

  // Data e hora
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const dateText = `${date.getDate()} de ${
    months[date.getMonth()]
  } de ${date.getFullYear()}`;
  let hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const timeText = `${hours}:${minutes} ${ampm}`;

  ctx.font = "600 32px Inter";
  const dateWidth = ctx.measureText(dateText).width;
  ctx.font = "400 24px Inter";
  const timeWidth = ctx.measureText(timeText).width;
  const maxWidth = Math.max(dateWidth, timeWidth);
  const baseX = CANVAS_WIDTH - maxWidth - 40;

  ctx.font = "600 32px Inter";
  ctx.fillStyle = "#fff";
  ctx.fillText(dateText, baseX + (maxWidth - dateWidth) / 2, 40);
  ctx.font = "400 24px Inter";
  ctx.fillText(timeText, baseX + (maxWidth - timeWidth) / 2, 80);

  // Temperatura
  ctx.font = "bold 240px Inter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(temperature, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 90);

  // Condição + ícone
  ctx.font = '72px "Shippori Antique Regular"';
  const textMetrics = ctx.measureText(condition);
  const iconSize = 60;
  const spacing = 8;
  const totalWidth = textMetrics.width + spacing + iconSize;
  const centerX = CANVAS_WIDTH / 2;
  const yCondition = CANVAS_HEIGHT / 2 + 60;
  const textX = centerX - totalWidth / 2;

  ctx.textAlign = "left";
  ctx.fillText(condition, textX, yCondition);

  const { icon: iconFile } = getWeatherInfo(weatherCode, isDay);
  const iconImage = await getCachedIcon(iconFile);
  ctx.drawImage(
    iconImage,
    textX + textMetrics.width + spacing,
    yCondition - iconSize / 1.4,
    iconSize,
    iconSize
  );

  // Sensação térmica
  ctx.font = '24px "Shippori Antique Regular"';
  ctx.textAlign = "center";
  ctx.fillText(
    `Sensação de ${sensation}`,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 150
  );

  // Box previsão
  const forecastTitleY = CANVAS_HEIGHT - 270;
  ctx.font = '20px "Shippori Antique Regular"';
  ctx.fillText("CLIMA NAS PRÓXIMAS 5 HORAS", CANVAS_WIDTH / 2, forecastTitleY);

  const paddingX = 60;
  const paddingY = 40;
  const boxWidth = 150;
  const boxHeight = 160;
  const startX =
    (CANVAS_WIDTH - (forecast.length * boxWidth + (forecast.length - 1) * 16)) /
    2;
  const startY = forecastTitleY + 50;

  forecast.forEach((item, i) => {
    const x = startX + i * (boxWidth + 16);

    // Caixa branca com sombra
    const boxY = startY;
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = "#ffffff";
    roundRect(ctx, x, boxY, boxWidth, boxHeight, 12);
    ctx.fill();

    // Remover sombra para os textos
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Textos internos
    const centerX = x + boxWidth / 2;
    const paddingTop = 14;

    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    ctx.font = "600 18px Inter";
    ctx.fillText(item.hour, centerX, boxY + paddingTop);

    ctx.font = "600 36px Inter";
    ctx.fillText(item.temp, centerX, boxY + paddingTop + 26);

    const descFontSize = 18;
    const lines = wrapText(ctx, item.desc, boxWidth - 20, descFontSize);
    ctx.font = `300 ${descFontSize}px Inter`;
    lines.forEach((line, idx) => {
      ctx.fillText(line, centerX, boxY + paddingTop + 78 + idx * 22);
    });
  });

  // Vento e Umidade
  const infoBoxX = 10;
  const startInfoY = CANVAS_HEIGHT / 2 - 100;
  const info = [
    { title: "VENTO", value: wind },
    { title: "UMIDADE", value: humidity },
  ];

  info.forEach((item, i) => {
    const y = startInfoY + i * 90;
    ctx.font = "600 22px Inter";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(item.title, infoBoxX + 10, y);

    ctx.font = "300 20px Inter";
    ctx.fillText(item.value, infoBoxX + 10, y + 30);
  });

  return canvas.toBuffer();
}

export async function generateWeatherImageFromCity(
  query = "São Paulo, Brasil"
) {
  const geoURL = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
    query
  )}&key=${process.env.GEO_KEY}`;
  const geo = await axios.get(geoURL);
  const location = geo.data.results[0];
  const components = location.components;
  const city =
    components.city ||
    components.town ||
    components.village ||
    components.municipality ||
    components._normalized_city ||
    query;
  const country = components.country || "";
  const lat = location.geometry.lat;
  const lon = location.geometry.lng;

  const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature,is_day&timezone=auto&forecast_hours=5`;
  const weatherResponse = await axios.get(weatherURL);
  const weatherData = weatherResponse.data;

  const temperature = Math.round(weatherData.current_weather.temperature);
  const weatherCode = weatherData.hourly.weather_code[0];
  const isDay = weatherData.hourly.is_day[0];
  const { description } = getWeatherInfo(weatherCode, isDay);
  const sensation = Math.round(weatherData.hourly.apparent_temperature[0]);
  const wind = `${Math.round(weatherData.hourly.wind_speed_10m[0])} km/h`;
  const humidity = `${Math.round(weatherData.hourly.relative_humidity_2m[0])}%`;

  const forecast = weatherData.hourly.time.slice(0, 5).map((time, index) => {
    const hour = new Date(time).getHours();
    const displayHour = `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;
    const code = weatherData.hourly.weather_code[index];
    const day = weatherData.hourly.is_day[index];
    const { description: desc } = getWeatherInfo(code, day);
    return {
      hour: displayHour,
      temp: `${Math.round(weatherData.hourly.temperature_2m[index])}°`,
      desc,
    };
  });

  const now = getLocalDate(location.annotations.timezone.name || "UTC");

  return await generateWeatherImage({
    city,
    country,
    temperature: `${temperature}°`,
    condition: description,
    sensation: `${sensation}°`,
    wind,
    humidity,
    forecast,
    date: now,
    weatherCode,
    isDay,
  });
}

export default generateWeatherImageFromCity;
