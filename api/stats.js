import axios from "axios";

export default async function handler(req, res) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const path = "cdn";

    const r = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    const total = Array.isArray(r.data)
      ? r.data.filter(f => f.type === "file").length
      : 0;

    res.setHeader("Cache-Control", "public, max-age=60");
    res.status(200).json({ total });
  } catch (e) {
    res.status(500).json({ total: 0 });
  }
}
