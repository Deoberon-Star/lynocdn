import axios from 'axios';

export default async function handler(req, res) {
  const { name } = req.query;

  if (!name) {
    return res.status(400).send('File not found');
  }

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/cdn/${name}`;

  try {
    // Ambil file dari GitHub
    const response = await axios.get(rawUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Node.js'
      }
    });

    // Tentukan Content-Type berdasarkan ekstensi file
    const ext = name.split('.').pop().toLowerCase();
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp4: 'video/mp4',
      webm: 'video/webm',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
      js: 'application/javascript',
      css: 'text/css',
      html: 'text/html'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Set header dan kirim file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);
    
    return res.send(response.data);
  } catch (error) {
    console.error('Error fetching file:', error.message);
    return res.status(500).send('Error loading file');
  }
}
