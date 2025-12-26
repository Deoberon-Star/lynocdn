import axios from "axios";

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
        message: "❌ URL TikTok tidak ditemukan"
      });
    }

    if (!url.includes("tiktok.com") && !url.includes("vt.tiktok.com")) {
      return res.status(400).json({
        success: false,
        error: "Invalid URL",
        message: "❌ URL harus dari TikTok"
      });
    }

    console.log(`🔄 Memulai proses download untuk: ${url}`);

    // ====================
    // BAGIAN SCRAPE TIKTOK
    // ====================
    
    const baseUrl = 'https://ttsave.app/download';
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://ttsave.app',
      'Referer': 'https://ttsave.app/id'
    };

    const requestData = {
      query: url,
      language_id: '2'
    };

    const response = await axios.post(baseUrl, requestData, {
      headers: headers,
      timeout: 30000
    });

    // Parse HTML response
    const html = response.data;

    // Extract data dari HTML
    const result = parseTikTokData(html);

    // Jika tidak ada hasil
    if (!result['no-watermark'] && !result['watermark']) {
      return res.status(404).json({
        success: false,
        error: "No media found",
        message: "❌ Tidak ditemukan video TikTok untuk diunduh"
      });
    }

    // Siapkan data untuk response
    const data = {
      video_id: result.video_id || null,
      title: result.title || "TikTok Video",
      thumbnail: result.cover || result.thumbnail || null,
      author: result.author || null,
      duration: result.duration || null,
      formats: []
    };

    // Tambahkan format video tanpa watermark jika ada
    if (result['no-watermark']) {
      data.formats.push({
        quality: "No Watermark",
        url: result['no-watermark'],
        format: "mp4",
        type: "video",
        size: result['no-watermark-size'] || null,
        resolution: result['no-watermark-resolution'] || "HD"
      });
    }

    // Tambahkan format video dengan watermark jika ada
    if (result['watermark']) {
      data.formats.push({
        quality: "With Watermark",
        url: result['watermark'],
        format: "mp4",
        type: "video",
        size: result['watermark-size'] || null,
        resolution: result['watermark-resolution'] || "HD"
      });
    }

    // Tambahkan format audio jika ada
    if (result['audio']) {
      data.formats.push({
        quality: "Audio Only",
        url: result['audio'],
        format: "mp3",
        type: "audio",
        size: result['audio-size'] || null,
        resolution: null
      });
    }

    // Tambahkan thumbnail sebagai format gambar jika ada
    if (result['cover']) {
      data.formats.push({
        quality: "Cover Image",
        url: result['cover'],
        format: "jpg",
        type: "image",
        size: null,
        resolution: null
      });
    }

    // Tambahkan profile picture jika ada
    if (result['profile']) {
      data.formats.push({
        quality: "Profile Picture",
        url: result['profile'],
        format: "jpg",
        type: "image",
        size: null,
        resolution: null
      });
    }

    // Response sukses
    return res.json({
      success: true,
      data: data,
      metadata: {
        video_count: (result['no-watermark'] ? 1 : 0) + (result['watermark'] ? 1 : 0),
        audio_count: result['audio'] ? 1 : 0,
        image_count: (result['cover'] ? 1 : 0) + (result['profile'] ? 1 : 0),
        url: url,
        source: "TikTok"
      },
      message: `╰╼ ┈─ ⠁◌ ˚ TIKTOK DOWNLOADER ⠹ !\n\n• Video: ${data.title}\n• Format: ${data.formats.length} tersedia\n• Quality: HD Available\n\n     ׄ ֵ ━━━━━━━━━━━━━━━ ֵ ׄׄ\n    ˚ Download siap!`
    });

  } catch (error) {
    console.error("Error scraping TikTok:", error.response?.data || error.message);
    
    // Handle error spesifik
    let errorMessage = "❌ Gagal mengambil data TikTok";
    let statusCode = 500;

    if (error.code === 'ECONNABORTED') {
      errorMessage = "❌ Timeout: Server tidak merespon";
    } else if (error.response?.status === 404) {
      errorMessage = "❌ Video tidak ditemukan";
      statusCode = 404;
    } else if (error.message.includes("ENOTFOUND")) {
      errorMessage = "❌ Server TikTok tidak dapat diakses";
    }

    return res.status(statusCode).json({
      success: false,
      error: error.response?.data?.message || error.message,
      message: errorMessage
    });
  }
}

// Fungsi untuk parse data TikTok dari HTML
function parseTikTokData(html) {
  const result = {
    'no-watermark': null,
    'watermark': null,
    'audio': null,
    'profile': null,
    'cover': null,
    'video_id': null,
    'title': null,
    'author': null,
    'duration': null,
    'thumbnail': null,
    'no-watermark-size': null,
    'watermark-size': null,
    'audio-size': null,
    'no-watermark-resolution': null,
    'watermark-resolution': null
  };

  try {
    // Extract video ID
    const videoIdMatch = html.match(/id="unique-id" type="hidden" value="([^"]*)"/);
    if (videoIdMatch) {
      result.video_id = videoIdMatch[1];
    }

    // Extract title
    const titleMatch = html.match(/<h4[^>]*>([^<]+)<\/h4>/);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }

    // Extract author
    const authorMatch = html.match(/class="text-sm"[^>]*>([^<]+)<\/p>/);
    if (authorMatch) {
      result.author = authorMatch[1].trim();
    }

    // Extract duration
    const durationMatch = html.match(/(\d+:\d+)/);
    if (durationMatch) {
      result.duration = durationMatch[1];
    }

    // Extract no-watermark video
    const noWatermarkMatch = html.match(/href="([^"]*)"[^>]*type="no-watermark"/);
    if (noWatermarkMatch) {
      result['no-watermark'] = noWatermarkMatch[1].replace(/&amp;/g, '&');
      
      // Coba extract size untuk no-watermark
      const sizeMatch = html.match(/no-watermark"[^>]*>\s*([^<]+)\s*Download/);
      if (sizeMatch && sizeMatch[1].includes('MB')) {
        result['no-watermark-size'] = sizeMatch[1].trim();
      }
    }

    // Extract watermark video
    const watermarkMatch = html.match(/href="([^"]*)"[^>]*type="watermark"/);
    if (watermarkMatch) {
      result['watermark'] = watermarkMatch[1].replace(/&amp;/g, '&');
      
      // Coba extract size untuk watermark
      const sizeMatch = html.match(/watermark"[^>]*>\s*([^<]+)\s*Download/);
      if (sizeMatch && sizeMatch[1].includes('MB')) {
        result['watermark-size'] = sizeMatch[1].trim();
      }
    }

    // Extract audio
    const audioMatch = html.match(/href="([^"]*)"[^>]*type="audio"/);
    if (audioMatch) {
      result['audio'] = audioMatch[1].replace(/&amp;/g, '&');
      
      // Coba extract size untuk audio
      const sizeMatch = html.match(/audio"[^>]*>\s*([^<]+)\s*Download/);
      if (sizeMatch && sizeMatch[1].includes('MB')) {
        result['audio-size'] = sizeMatch[1].trim();
      }
    }

    // Extract profile picture
    const profileMatch = html.match(/href="([^"]*)"[^>]*type="profile"/);
    if (profileMatch) {
      result['profile'] = profileMatch[1].replace(/&amp;/g, '&');
    }

    // Extract video cover
    const coverMatch = html.match(/href="([^"]*)"[^>]*type="cover"/);
    if (coverMatch) {
      result['cover'] = coverMatch[1].replace(/&amp;/g, '&');
      result.thumbnail = result['cover'];
    }

    // Extract thumbnail dari image tag
    const thumbnailMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*cover[^"]*"/);
    if (thumbnailMatch && !result.thumbnail) {
      result.thumbnail = thumbnailMatch[1];
    }

    // Cari resolusi dari teks
    const resolutionMatch = html.match(/(\d+p|HD|SD)/i);
    if (resolutionMatch) {
      result['no-watermark-resolution'] = resolutionMatch[1];
      result['watermark-resolution'] = resolutionMatch[1];
    }

  } catch (error) {
    console.error("Error parsing TikTok data:", error);
  }

  return result;
}

// Config untuk body parser
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

// Function helper untuk mendapatkan link spesifik
async function getTikTokSpecificLink(tiktokUrl, type = 'no-watermark') {
  try {
    const baseUrl = 'https://ttsave.app/download';
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const requestData = {
      query: tiktokUrl,
      language_id: '2'
    };

    const response = await axios.post(baseUrl, requestData, {
      headers: headers
    });

    const links = parseTikTokData(response.data);
    
    if (!links[type]) {
      throw new Error(`Link untuk type '${type}' tidak ditemukan`);
    }
    
    return links[type];
  } catch (error) {
    throw error;
  }
}

// Export function tambahan untuk penggunaan lain
export { getTikTokSpecificLink };
