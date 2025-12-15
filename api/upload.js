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

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    const buffer = Buffer.from(raw, "base64");

    const type = req.headers["content-type"] || "application/octet-stream";
    const ext = mime.extension(type) || "bin";

    const fileName = `${Date.now()}.${ext}`;
    const path = `cdn/${fileName}`;

    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        message: `CDN Upload ${fileName}`,
        content: buffer.toString("base64"),
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

return res.json({
  success: true,
  url: `https://${host}/file/${fileName}`
});

  } catch (e) {
    return res.status(500).json({
      error: e.response?.data || e.message
    });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
