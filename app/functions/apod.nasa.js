import axios from "axios";
import "dotenv/config";

export async function getAPODData() {
  const url = `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_KEY}`;

  try {
    const res = await axios.get(url);
    const data = res.data;

    let buffer = null;
    if (data.media_type === "image") {
      const imgRes = await axios.get(data.url, { responseType: "arraybuffer" });
      buffer = Buffer.from(imgRes.data);
    }

    const message = `✨ *${data.title}* (${data.date})

${data.explanation}

🔭 ${data.url}
`;

    return {
      buffer,
      message,
      ...data,
    };
  } catch (error) {
    throw new Error(`Erro ao buscar APOD: ${error.message}`);
  }
}
