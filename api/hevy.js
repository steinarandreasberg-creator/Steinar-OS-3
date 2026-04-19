export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.HEVY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'HEVY_API_KEY not configured' });

  const { page = 1, pageSize = 10 } = req.query;

  try {
    const response = await fetch(
      `https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=${pageSize}`,
      { headers: { 'api-key': apiKey, 'accept': 'application/json' } }
    );
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
