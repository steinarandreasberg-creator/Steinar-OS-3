export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = '' } = req.query;
  if (!q.trim()) return res.status(200).json([]);

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}&hl=no`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SteinarOS/1.0)' }
    });
    const data = await response.json();
    // Google returns [query, [suggestion1, suggestion2, ...], ...]
    const suggestions = Array.isArray(data[1]) ? data[1].slice(0, 8) : [];
    return res.status(200).json(suggestions);
  } catch {
    return res.status(200).json([]);
  }
}
