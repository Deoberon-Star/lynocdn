import axios from 'axios';

export default async function handler(req, res) {
  const { name } = req.query;

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!name) return res.status(400).send("File not found");

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/cdn/${name}`;

  try {
    // Ambil file dari GitHub
    const response = await axios.get(rawUrl, {
      responseType: 'arraybuffer' // Untuk file binary
    });

    // Set header yang sesuai
    const contentType = getContentType(name);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Jika file adalah gambar/text, tambahkan header untuk embed
    if (contentType.startsWith('image/') || contentType.startsWith('text/')) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${name}"`);
    }

    // Kirim file sebagai response
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).send('Error loading file');
  }
}

// Helper function untuk menentukan Content-Type
function getContentType(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'zip': 'application/zip'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}
