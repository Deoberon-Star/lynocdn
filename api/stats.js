import axios from 'axios';

export default async function handler(req, res) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path = 'cdn';

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Node.js'
        }
      }
    );

    const files = Array.isArray(response.data) 
      ? response.data.filter(f => f.type === 'file')
      : [];
    
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({
      total: files.length,
      totalSize: totalSize,
      files: files.map(f => ({
        name: f.name,
        size: f.size,
        url: f.download_url
      }))
    });

  } catch (error) {
    console.error('Error counting files:', error.message);
    
    // Jika folder tidak ada, return 0
    if (error.response?.status === 404) {
      return res.status(200).json({
        total: 0,
        totalSize: 0,
        files: []
      });
    }
    
    return res.status(500).json({
      total: 0,
      totalSize: 0,
      error: 'Failed to fetch files'
    });
  }
      }
