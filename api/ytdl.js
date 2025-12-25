import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";

export default async function handler(req, res) {
  try {
    // Hanya terima metode POST
    if (req.method !== "POST") {
      return res.status(405).json({ 
        success: false,
        error: "Method not allowed",
        message: "❌ Hanya metode POST yang diizinkan" 
      });
    }

    // Parse body request
    const { url } = req.body;
    
    // Validasi URL
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL required",
        message: "❌ URL YouTube tidak ditemukan"
      });
    }

    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      return res.status(400).json({
        success: false,
        error: "Invalid URL",
        message: "❌ URL harus dari YouTube"
      });
    }

    console.log(`🔄 Memulai proses download untuk: ${url}`);

    // ====================
    // BAGIAN SCRAPE YOUTUBE
    // ====================
    
    const postData = qs.stringify({
      url: url
    });

    const { data: html } = await axios.post(
      "https://www.mediamister.com/get_youtube_video",
      postData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Accept": "*/*",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.mediamister.com/youtube-video-downloader"
        },
        timeout: 30000
      }
    );

    // Parse HTML dengan Cheerio
    const $ = cheerio.load(html);

    // Ambil thumbnail
    const thumbnail = $(".yt_thumb img").attr("src") || null;
    
    // Ambil judul
    const title = $("h2").first().text().trim();

    // Ambil video formats
    const videos = [];
    $(".yt_format")
      .first()
      .find("a.download-button")
      .each((_, el) => {
        const a = $(el);
        const href = a.attr("href");
        const text = a.text().replace(/\s+/g, " ").trim();
        
        videos.push({
          quality: text,
          url: href,
          format: href?.includes("mime=video/webm") ? "webm" : "mp4",
          size: extractSize(text),
          resolution: extractResolution(text)
        });
      });

    // Ambil audio formats
    const audios = [];
    $(".yt_format")
      .last()
      .find("a.download-button.audio")
      .each((_, el) => {
        const a = $(el);
        const href = a.attr("href");
        const text = a.text().replace(/\s+/g, " ").trim();
        
        audios.push({
          quality: text,
          url: href,
          format: href?.includes("mime=audio/webm") ? "webm" : "m4a",
          size: extractSize(text)
        });
      });

    // Jika tidak ada hasil
    if (videos.length === 0 && audios.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No media found",
        message: "❌ Tidak ditemukan video/audio untuk diunduh"
      });
    }

    // Response sukses
    return res.json({
      success: true,
      data: {
        title,
        thumbnail,
        videos,
        audios,
        source: "MediaMister"
      },
      metadata: {
        video_count: videos.length,
        audio_count: audios.length,
        url: url
      },
      message: `╰╼ ┈─ ⠁◌ ˚ YOUTUBE DOWNLOADER ⠹ !\n\n• Judul: ${title}\n• Video: ${videos.length} kualitas\n• Audio: ${audios.length} kualitas\n\n     ׄ ֵ ━━━━━━━━━━━━━━━ ֵ ׄׄ\n    ˚ Download siap!`
    });

  } catch (error) {
    console.error("Error scraping YouTube:", error.response?.data || error.message);
    
    // Handle error spesifik
    let errorMessage = "❌ Gagal mengambil data YouTube";
    let statusCode = 500;

    if (error.code === 'ECONNABORTED') {
      errorMessage = "❌ Timeout: Server tidak merespon";
    } else if (error.response?.status === 404) {
      errorMessage = "❌ Video tidak ditemukan";
      statusCode = 404;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.response?.data?.message || error.message,
      message: errorMessage
    });
  }
}

// Fungsi helper untuk ekstrak size dari teks
function extractSize(text) {
  const match = text.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

// Fungsi helper untuk ekstrak resolusi
function extractResolution(text) {
  const resolutionMatch = text.match(/(\d+p)/);
  return resolutionMatch ? resolutionMatch[1] : null;
}

// Config untuk body parser
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
