const BASE_SPLIT = `Mandag: Push | Tirsdag: Pull | Onsdag: Legs | Torsdag: Chest & Back | Fredag: Shoulders & Arms / Long run | Lørdag: Legs | Søndag: Kjerne/Hvile`;

function daysUntilDate(dateStr) {
  const d = new Date(dateStr);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

function buildSystemPrompt(hevyData, calData) {
  const now = new Date();
  const hour = now.getHours();
  const timeStr = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayStr = now.toLocaleDateString('no-NO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lateNight = hour >= 22;

  const { weeklySessions, weeklyVol, muscleGroups, recent, wwo, history } = hevyData;

  const weekDone = Object.entries(wwo || {})
    .map(([d, s]) => `  ${d}: ${s.type}, ${Math.round(s.vol / 1000)}k kg${s.dur ? `, ${s.dur}min` : ''}`)
    .join('\n') || '  (ingen registrerte)';

  const muscleLines = (muscleGroups || [])
    .map(g => `  ${g.key}: ${g.sets} sett siste 10d — sist ${g.daysSince == null ? 'ukjent' : g.daysSince === 0 ? 'i dag' : `${g.daysSince}d siden`}`)
    .join('\n');

  const historyLines = (history || recent || []).slice(0, 8)
    .map(r => `  ${r.title} — ${r.date ? new Date(r.date).toLocaleDateString('no-NO') : '–'}, ${r.dur ? r.dur + 'min' : '–'}, ${Math.round(r.vol / 1000)}k kg`)
    .join('\n');

  const assessmentLines = calData?.assessments?.slice(0, 4)
    .map(a => `  ${a.subjectKey} om ${daysUntilDate(a.date)} dager (${a.date})`)
    .join('\n') || '  (ingen)';

  const nextAssessment = calData?.assessments?.[0];
  const nextDays = nextAssessment ? daysUntilDate(nextAssessment.date) : null;
  const examWarning = nextDays !== null && nextDays <= 5
    ? `\nEKSAMENS-REGEL: ${nextAssessment.subjectKey}-eksamen er om ${nextDays} dager. Anbefal økt under 60min og unngå trening til failure for å bevare mental energi.`
    : '';

  const calLines = calData?.trainingEvents?.length
    ? calData.trainingEvents.slice(0, 5).map(e => `  ${e.title}: ${e.dateStr}`).join('\n')
    : '  (ingen tilkoblet)';

  const lateNightWarning = lateNight
    ? `\nSEINT-REGEL: Klokken er ${timeStr}. START ALLTID svaret med en klar beskjed om at skjermen bør av og at søvn er det viktigste for morgendagens prestasjon. Deretter kan du svare kortfattet på spørsmålet.`
    : '';

  return `Du er Steinars High Performance treningscoach. Svar alltid på norsk.

PERSONLIGHET OG REGLER:
- Autoritær, direktiv og kunnskapsrik. Kutt all "fluff".
- Bruk "Basert på tallene dine er dette planen:" – aldri "Du kan vurdere å..."
- Ikke still oppfølgingsspørsmål. Gi din beste anbefaling og avslutt der.
- Foreslå aldri "mer volum/kg". Bruk: tyngre vekter, bedre teknikk, riktigere hvile.
- Korte bulletpoints. Svar under 150 ord med mindre brukeren eksplisitt ber om mer.${lateNightWarning}${examWarning}

UKESSPLIT (fasit):
${BASE_SPLIT}
Bruk splitten aktivt. Hvis en muskel ikke er trent, sjekk om det er pga. splitten og si f.eks. "I morgen er leg day" fremfor "beina trenger stimulering".

I DAG: ${timeStr} | ${todayStr}

GJENNOMFØRTE ØKTER DENNE UKEN:
${weekDone}

SISTE 14 DAGER:
${historyLines || '  (ingen data)'}

MUSKELGRUPPER (siste 10 dager):
${muscleLines}

PLANLAGTE TRENINGER:
${calLines}

KOMMENDE VURDERINGER:
${assessmentLines}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { messages, hevyData, calData } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages påkrevd' });
  }

  const systemPrompt = hevyData
    ? buildSystemPrompt(hevyData, calData)
    : 'Du er en High Performance treningscoach. Svar på norsk. Direkte, ingen fluff, korte bulletpoints.';

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 512,
        temperature: 0.65,
      }),
    });
    if (!groqRes.ok) {
      const txt = await groqRes.text();
      throw new Error(`Groq ${groqRes.status}: ${txt}`);
    }
    const data = await groqRes.json();
    return res.status(200).json({ reply: data.choices[0].message.content });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
