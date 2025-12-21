import axios from "axios";
import mime from "mime-types";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";

    if (!token || !owner || !repo) {
      return res.status(500).json({ error: "Missing GitHub ENV" });
    }

    // ====================
    // BAGIAN PROSES GAMBAR
    // ====================
    
    // Baca raw request body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    
    let imageBuffer;
    let contentType = req.headers["content-type"] || "image/jpeg";
    
    // Cek apakah input berupa JSON atau base64 langsung
    if (req.headers["content-type"]?.includes("application/json")) {
      try {
        const parsed = JSON.parse(raw);
        
        // Format 1: Data URI (data:image/jpeg;base64,...)
        if (parsed.image && parsed.image.startsWith('data:image')) {
          const base64Data = parsed.image.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
          contentType = parsed.image.split(';')[0].split(':')[1];
        }
        // Format 2: Base64 plain
        else if (parsed.image) {
          imageBuffer = Buffer.from(parsed.image, 'base64');
        }
        else {
          return res.status(400).json({ error: "Format gambar tidak valid" });
        }
      } catch {
        return res.status(400).json({ error: "JSON tidak valid" });
      }
    } else {
      // Jika bukan JSON, asumsi binary/base64 langsung
      imageBuffer = Buffer.from(raw, 'base64');
    }
    
    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ error: "Gambar tidak ditemukan" });
    }

    // ====================
    // BAGIAN ENHANCEMENT AI (SAMA PERSIS DENGAN BOT)
    // ====================
    
    console.log("🔄 Memulai proses enhancement...");
    
    // Konversi ke base64 dengan format data URI
    const imgBase64 = imageBuffer.toString('base64');
    const dataURI = `data:image/jpeg;base64,${imgBase64}`;
    
    // Langkah 1: Buat task enhancement (SAMA DENGAN BOT)
    const createResponse = await axios.post(
      'https://aienhancer.ai/api/v1/r/image-enhance/create',
      {
        model: 3, // Model yang sama dengan bot
        image: dataURI,
        settings: 'kRpBbpnRCD2nL2RxnnuoMo7MBc0zHndTDkWMl9aW+Gw=' // Settings yang sama
      },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'Content-Type': 'application/json',
          origin: 'https://aienhancer.ai',
          referer: 'https://aienhancer.ai/ai-image-upscaler'
        }
      }
    );

    const taskId = createResponse.data.data.id;
    console.log(`✅ Task created: ${taskId}`);

    // Tunggu sebentar sebelum polling (opsional)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Langkah 2: Ambil hasil enhancement (SAMA DENGAN BOT)
    const resultResponse = await axios.post(
      'https://aienhancer.ai/api/v1/r/image-enhance/result',
      {
        task_id: taskId
      },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'Content-Type': 'application/json',
          origin: 'https://aienhancer.ai',
          referer: 'https://aienhancer.ai/ai-image-upscaler'
        }
      }
    );

    const enhancedImageUrl = resultResponse.data.data.output;
    console.log(`✅ Enhanced image URL: ${enhancedImageUrl}`);

    // Download gambar hasil enhancement
    const enhancedResponse = await axios.get(enhancedImageUrl, {
      responseType: 'arraybuffer'
    });
    
    const enhancedBuffer = Buffer.from(enhancedResponse.data);

    // ====================
    // BAGIAN UPLOAD KE GITHUB
    // ====================
    
    const ext = mime.extension(contentType) || "jpg";
    const fileName = `${Date.now()}_enhanced.${ext}`;
    const path = `cdn/${fileName}`;

    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        message: `CDN Upload - Enhanced Image ${fileName}`,
        content: enhancedBuffer.toString('base64'),
        branch
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    const host = req.headers["x-forwarded-host"] || req.headers.host;

    // Response dengan format mirip bot
    return res.json({
      success: true,
      url: `https://${host}/file/${fileName}`,
      enhancement: {
        task_id: taskId,
        process: "Success",
        result: "HD Quality",
        service: "AIEnhancer.ai"
      },
      message: `╰╼ ┈─ ⠁◌ ˚ IMAGE UPSCALE ⠹ !\n\n• Task ID: ${taskId}\n• Process: Success\n• Result: HD Quality\n\n     ׄ ֵ ━━━━━━━━━━━━━━━ ֵ ׄׄ\n    ˚ Request completed successfully!`
    });

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    
    // Format error seperti di bot
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message,
      message: "❌ Enhancement gagal"
    });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
