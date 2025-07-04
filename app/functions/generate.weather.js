import path from "path";
import axios from "axios";
import fs from "fs";
import "dotenv/config";
import { createCanvas, registerFont, loadImage } from "canvas";

const width = 1080;
const height = 900;
const radius = 16;

const shipporiPath = path.resolve("./app/fonts/Shippori.ttf");
registerFont(shipporiPath, { family: "Shippori Antique Regular" });

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

function getWeatherInfo(code, isDay) {
  let description = "Desconhecido";
  let icon = "sun.svg";

  switch (code) {
    case 0:
      description = "Céu limpo";
      icon = "sun.svg";
      break;
    case 1:
      description = "Principalmente limpo";
      icon = "sun.svg";
      break;
    case 2:
      description = "Parcialmente nublado";
      icon = "cloud.svg";
      break;
    case 3:
      description = "Nublado";
      icon = "cloud.svg";
      break;
    case 45:
      description = "Nevoeiro";
      icon = "fog.svg";
      break;
    case 48:
      description = "Nevoeiro depositante";
      icon = "fog.svg";
      break;
    case 51:
      description = "Garoa leve";
      icon = "rain.svg";
      break;
    case 53:
      description = "Garoa moderada";
      icon = "rain.svg";
      break;
    case 55:
      description = "Garoa densa";
      icon = "rain.svg";
      break;
    case 56:
      description = "Garoa congelante leve";
      icon = "snow.svg";
      break;
    case 57:
      description = "Garoa congelante densa";
      icon = "snow.svg";
      break;
    case 61:
      description = "Chuva leve";
      icon = "rain.svg";
      break;
    case 63:
      description = "Chuva moderada";
      icon = "rain.svg";
      break;
    case 65:
      description = "Chuva forte";
      icon = "rain.svg";
      break;
    case 66:
      description = "Chuva congelante leve";
      icon = "snow.svg";
      break;
    case 67:
      description = "Chuva congelante forte";
      icon = "snow.svg";
      break;
    case 71:
      description = "Queda de neve leve";
      icon = "snow.svg";
      break;
    case 73:
      description = "Queda de neve moderada";
      icon = "snow.svg";
      break;
    case 75:
      description = "Queda de neve forte";
      icon = "snow.svg";
      break;
    case 77:
      description = "Grãos de neve";
      icon = "snow.svg";
      break;
    case 80:
      description = "Pancadas de chuva leve";
      icon = "rain.svg";
      break;
    case 81:
      description = "Pancadas de chuva moderada";
      icon = "rain.svg";
      break;
    case 82:
      description = "Pancadas de chuva violenta";
      icon = "storm.svg";
      break;
    case 85:
      description = "Pancadas de neve leve";
      icon = "snow.svg";
      break;
    case 86:
      description = "Pancadas de neve forte";
      icon = "snow.svg";
      break;
    case 95:
      description = "Trovoada leve ou moderada";
      icon = "storm.svg";
      break;
    case 96:
      description = "Trovoada com granizo leve";
      icon = "storm.svg";
      break;
    case 99:
      description = "Trovoada com granizo forte";
      icon = "storm.svg";
      break;
  }

  // Ajuste para ícone noturno se for noite e a condição for céu limpo/parcialmente nublado
  if (!isDay && (code === 0 || code === 1)) {
    icon = "moon.svg"; // Assumindo que você terá um moon.svg
  }

  return { description, icon };
}

function getLocalDate(timezone) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

function drawCityText(ctx, city, country) {
  const lines = [`${city},`, country];
  let fontSize = 48;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fff";
  for (;;) {
    ctx.font = `${fontSize}px "Shippori Antique Regular"`;
    const maxWidth = Math.max(
      ...lines.map((line) => ctx.measureText(line).width)
    );
    if (maxWidth <= 300 || fontSize <= 24) break;
    fontSize -= 1;
  }
  lines.forEach((line, i) => ctx.fillText(line, 40, 40 + i * (fontSize + 4)));
}

export async function generateWeatherImage({
  city = "Cidade",
  country = "País",
  temperature = "30°",
  condition = "Nublado",
  sensation = "30°",
  wind = "6 km/h",
  humidity = "90%",
  weatherCode,
  forecast = [],
  date = new Date(),
  isDay = true,
}) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Fundo degradê
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#29306C");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  roundRect(ctx, 0, 0, width, height, radius);
  ctx.fill();

  drawCityText(ctx, city, country);

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
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const timeText = `${hours}:${minutes} ${ampm}`;

  ctx.font = "600 32px Inter";
  const dateWidth = ctx.measureText(dateText).width;
  ctx.font = "400 24px Inter";
  const timeWidth = ctx.measureText(timeText).width;
  const maxWidth = Math.max(dateWidth, timeWidth);
  const baseX = width - maxWidth - 40;

  ctx.font = "600 32px Inter";
  ctx.fillStyle = "#fff";
  ctx.fillText(dateText, baseX + (maxWidth - dateWidth) / 2, 40);
  ctx.font = "400 24px Inter";
  ctx.fillText(timeText, baseX + (maxWidth - timeWidth) / 2, 80);

  ctx.font = "bold 240px Inter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(temperature, width / 2, height / 2 - 90);

  ctx.font = '72px "Shippori Antique Regular"';
  const textMetrics = ctx.measureText(condition);
  const iconSize = 60;
  const spacing = 8;
  const totalWidth = textMetrics.width + spacing + iconSize;
  const centerX = width / 2;
  const yCondition = height / 2 + 60;
  const textX = centerX - totalWidth / 2;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(condition, textX, yCondition);

  try {
    const { icon: currentIcon } = getWeatherInfo(weatherCode, isDay);
    const svgIconPath = path.resolve("./app/icons/" + currentIcon);
    const image = await loadImage(svgIconPath);
    const iconX = textX + textMetrics.width + spacing;
    const iconY =
      yCondition -
      (textMetrics.actualBoundingBoxAscent || 0) -
      iconSize / 2 +
      (textMetrics.actualBoundingBoxAscent || 0);
    ctx.drawImage(image, iconX + 15, iconY - 23, iconSize, iconSize);
  } catch (err) {
    console.error("Erro ao carregar ícone:", err.message);
  }

  ctx.font = '24px "Shippori Antique Regular"';
  ctx.textAlign = "center";
  ctx.fillText(`Sensação de ${sensation}`, width / 2, height / 2 + 90);

  const avisoText = "CLIMA NAS PRÓXIMAS 5 HORAS";
  ctx.font = '20px "Shippori Antique Regular"';
  ctx.textBaseline = "bottom";
  ctx.textAlign = "center";
  const avisoX = width / 2;
  const avisoTextY = height - 270;
  ctx.fillStyle = "#fff";
  ctx.fillText(avisoText, avisoX, avisoTextY);

  const paddingX = 60;
  const paddingY = 40;
  const avisoWidth = ctx.measureText(avisoText).width;
  const rectWidth = avisoWidth + paddingX * 5;
  const rectHeight = 220;
  const rectX = avisoX - rectWidth / 2;
  const rectY = avisoTextY + 20;

  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = -1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  roundRect(ctx, rectX, rectY, rectWidth, rectHeight, 20);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const innerPaddingX = 40;
  const boxSpacing = 16;
  const availableWidth = rectWidth - innerPaddingX * 2;
  const boxWidth =
    (availableWidth - (forecast.length - 1) * boxSpacing) / forecast.length;
  const boxHeight = 160;
  const boxesStartX = rectX + innerPaddingX;
  const boxesY = rectY + rectHeight - boxHeight - paddingY;

  forecast.forEach((item, i) => {
    const x = boxesStartX + i * (boxWidth + boxSpacing);
    const centerX = x + boxWidth / 2;
    const paddingInside = 20;

    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    ctx.font = "600 18px Inter";
    ctx.fillText(item.hour, centerX, boxesY + paddingInside);

    ctx.font = "600 36px Inter";
    ctx.fillText(item.temp, centerX, boxesY + paddingInside + 30);

    ctx.font = "300 20px Inter";
    const words = item.desc.split(" ");
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const test = current ? current + " " + word : word;
      const width = ctx.measureText(test).width;
      if (width < boxWidth - 10) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);

    lines.forEach((line, idx) => {
      ctx.fillText(line, centerX, boxesY + paddingInside + 80 + idx * 22);
    });
  });

  const leftPadding = 10;
  const infoBoxX = leftPadding;
  const titleFontSize = 22;
  const valueFontSize = 20;
  const gapBetweenBlocks = 40;
  const paddingTopBottom = 10;
  const blockHeight = titleFontSize + paddingTopBottom + valueFontSize;
  const totalInfoHeight = 2 * blockHeight + gapBetweenBlocks;
  const startY = (height - totalInfoHeight) / 2;

  const infoTexts = [
    { title: "VENTO", value: wind },
    { title: "UMIDADE", value: humidity },
  ];

  infoTexts.forEach((item, idx) => {
    const y = startY + idx * (blockHeight + gapBetweenBlocks);
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${titleFontSize}px Inter`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(item.title, infoBoxX + 10, y);

    ctx.font = `300 ${valueFontSize}px Inter`;
    ctx.fillText(
      item.value,
      infoBoxX + 10,
      y + titleFontSize + paddingTopBottom
    );
  });

  return canvas.toBuffer();
}

export async function generateWeatherImageFromCity(
  query = "Sao Paulo, Brasil"
) {
  // Buscar coordenadas com OpenCage
  const geoURL = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
    query
  )}&key=${process.env.GEO_KEY}`;
  console.log("[DEBUG] Geo URL:", geoURL);
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

  // Buscar dados do clima via Open-Meteo API
  const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature,is_day&timezone=auto&forecast_hours=5`;
  console.log("[DEBUG] Weather URL:", weatherURL);
  const weatherResponse = await axios.get(weatherURL);
  const weatherData = weatherResponse.data;

  const temperature = Math.round(weatherData.current_weather.temperature);
  const weatherCode = weatherData.hourly.weather_code[0]; // Pega o weather_code da primeira hora
  const isDay = weatherData.hourly.is_day[0]; // Pega o is_day da primeira hora
  const conditionInfo = getWeatherInfo(weatherCode, isDay);
  const condition = conditionInfo.description;
  const sensation = Math.round(weatherData.hourly.apparent_temperature[0]); // Pega a sensação térmica da primeira hora
  const wind = Math.round(weatherData.hourly.wind_speed_10m[0]); // km/h
  const humidity = Math.round(weatherData.hourly.relative_humidity_2m[0]); // Pega a umidade da primeira hora

  console.log("[DEBUG] Current Weather Code:", weatherCode); // Adicionado para depuração

  // Extrair previsão horária para as próximas 5 horas
  const forecast = weatherData.hourly.time.slice(0, 5).map((time, index) => {
    const date = new Date(time);
    const hour = date.getHours();
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    const forecastWeatherCode = weatherData.hourly.weather_code[index];
    const forecastIsDay = weatherData.hourly.is_day[index];
    const { description: forecastDesc } = getWeatherInfo(
      forecastWeatherCode,
      forecastIsDay
    );

    return {
      hour: `${displayHour} ${ampm}`,
      temp: `${Math.round(weatherData.hourly.temperature_2m[index])}°`,
      desc: forecastDesc,
    };
  });

  const timezone = location.annotations.timezone.name || "UTC";
  const now = getLocalDate(timezone);

  return await generateWeatherImage({
    city,
    country,
    temperature: `${temperature}°`,
    condition,
    sensation: `${sensation}°`,
    wind: `${wind} km/h`,
    humidity: `${humidity}%`,
    forecast,
    date: now,
    weatherCode,
    isDay,
  });
}

export default generateWeatherImageFromCity;
