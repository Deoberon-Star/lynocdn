export default async function handler(req, res) {
  const { name } = req.query;

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!name) return res.status(400).send("File not found");

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/cdn/${name}`;

  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.redirect(302, rawUrl);
}
