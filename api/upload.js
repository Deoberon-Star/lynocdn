import axios from 'axios';
import mime from 'mime-types';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    // Validasi environment variables
    if (!token || !owner || !repo) {
      return res.status(500).json({ error: 'Missing GitHub configuration' });
    }

    // Parse form data untuk mendapatkan file
    const contentType = req.headers['content-type'];
    let buffer, originalName;

    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle multipart form data
      const formData = await req.formData();
      const file = formData.get('file');
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      buffer = Buffer.from(await file.arrayBuffer());
      originalName = file.name;
    } else {
      // Handle raw binary data
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      buffer = Buffer.concat(chunks);
      originalName = req.headers['x-filename'] || 'upload.bin';
    }

    // Validasi ukuran file (max 25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (buffer.length > maxSize) {
      return res.status(413).json({ error: 'File too large (max 25MB)' });
    }

    // Generate nama file unik
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = originalName.includes('.') 
      ? originalName.split('.').pop() 
      : mime.extension(req.headers['content-type'] || 'bin') || 'bin';
    
    const fileName = `${timestamp}_${random}.${ext}`;
    const path = `cdn/${fileName}`;

    // Upload ke GitHub
    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        message: `Upload: ${fileName}`,
        content: buffer.toString('base64'),
        branch: branch
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        }
      }
    );

    // Return URL yang menunjuk ke proxy domain kamu
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    
    return res.status(200).json({
      success: true,
      url: `${protocol}://${host}/api/file/${fileName}`,
      fileName: fileName,
      size: buffer.length
    });

  } catch (error) {
    console.error('Upload error:', error.message);
    
    const errorMessage = error.response?.data?.message 
      || error.message 
      || 'Upload failed';
    
    return res.status(500).json({
      error: errorMessage,
      details: error.response?.data
    });
  }
}

export const config = {
  api: {
    bodyParser: false, // Nonaktifkan body parser default untuk handle file binary
    sizeLimit: '25mb' // Batas ukuran file
  }
};
