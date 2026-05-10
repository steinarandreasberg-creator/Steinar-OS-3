const STEINAR_PROFILE = `
STEINARS PROFIL:
- Viderekommen, 424+ loggede økter, 17–18 år, VG2-elev. Kronisk lett underrestituert.
- Mål: Hypertrofi primært, styrke sekundært.
- Sporty Bergen Paradis (hjemmebane). Myrkdalen ved jobb (begrenset utstyr).
- 1RM/tunge sett: Bench 110kg | Squat 102.5kg | RDL 120kg | Incline DB 85kg/par | Shoulder Press 56kg/par | Pull-up +20kg | Dips +35kg | Leg Press 222kg
- Øvelser Push: Incline DB Press, Iso-Lateral Chest Press, Chest Fly, Bench Press, Shoulder Press DB, Lateral Raise, Weighted Dips, Rope Pushdown, Overhead Ext
- Øvelser Pull: Weighted Pull-ups, Lat Pulldown, Cable Row, Iso-Lateral Row, Rear Delt Fly, Behind Back Curl, Hammer Curl, Preacher Curl
- Øvelser Legs: Squat, Leg Press, Leg Extension, Bulgarian Split Squat, RDL, Seated Leg Curl, Hip Adduction, Calf Raise
- Volumgrense: Push/Pull 14–18 sett | Legs 12–16 | C&B/S&A 16–20. Over 22 → flagg.
- Aldri begge legs-dager droppet. Push/Pull er kjernen. 4 økter/uke er minimum.
- Referer til HANS faktiske tall og øvelser — aldri generiske råd.
`;

const BASE_SPLIT = `Mandag: Push | Tirsdag: Pull | Onsdag: Legs | Torsdag: Chest & Back | Fredag: Shoulders & Arms / Long run | Lørdag: Legs | Søndag: Kjerne/Hvile`;

function daysUntilDate(dateStr) {
  const d = new Date(dateStr);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { hevyData, calData } = req.body || {};
  if (!hevyData) return res.status(200).json({ feedback: null });

  const now = new Date();
  const hour = now.getHours();
  const timeStr = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = now.toLocaleDateString('no-NO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lateNight = hour >= 22;

  const { weeklySessions, weeklyVol, muscleGroups, recent, wwo, history } = hevyData;

  const doneThisWeek = Object.entries(wwo || {})
    .map(([d, s]) => `${d}: ${s.type} (${Math.round(s.vol / 1000)}k kg${s.dur ? `, ${s.dur}min` : ''})`)
    .join(', ') || 'ingen';

  const history14 = (history || recent || []).slice(0, 8)
    .map(w => `${w.title} – ${w.date ? new Date(w.date).toLocaleDateString('no-NO') : '–'} (${w.dur || '–'}min)`)
    .join(' | ');

  const nextAssessment = calData?.assessments?.[0];
  const nextDays = nextAssessment ? daysUntilDate(nextAssessment.date) : null;

  const assessmentLines = calData?.assessments?.slice(0, 4)
    .map(a => `${a.subjectKey} om ${daysUntilDate(a.date)} dager`)
    .join(', ') || 'ingen';

  const calInfo = calData?.trainingEvents?.length
    ? calData.trainingEvents.slice(0, 5).map(e => `${e.title} (${e.dateStr})`).join(', ')
    : 'ingen';

  const lastWorkout = recent?.[0]?.title || '–';

  const userMsg = [
    `KLOKKEN: ${timeStr} | ${today}`,
    `SISTE ØKT: ${lastWorkout}`,
    `DENNE UKEN: ${weeklySessions} økt(er) | ${doneThisWeek}`,
    `SISTE 14 DAGER: ${history14 || 'ingen data'}`,
    `MUSKELGRUPPER: ${(muscleGroups || []).map(g => `${g.key} (${g.sets}sett, sist ${g.daysSince == null ? 'ukjent' : g.daysSince === 0 ? 'i dag' : g.daysSince + 'd siden'})`).join(' | ')}`,
    `KOMMENDE VURDERINGER: ${assessmentLines}`,
    `PLANLAGTE TRENINGER: ${calInfo}`,
  ].join('\n');

  const examWarning = nextDays !== null && nextDays <= 5
    ? ` VIKTIG: ${nextAssessment.subjectKey}-eksamen er om ${nextDays} dager – anbefal økt under 60min og unngå failure for å spare mental energi.`
    : '';

  const systemPrompt = `Du er Steinars dedikerte High Performance treningscoach. Autoritær, kortfattet, kunnskapsrik. Svar på norsk. Svar KUN med gyldig JSON.
${STEINAR_PROFILE}
UKESSPLIT (fasit – bruk alltid denne):
${BASE_SPLIT}

COACHING-REGLER:
- Ikke still oppfølgingsspørsmål. Gi anbefalingen direkte.
- Svar er ALLTID spesifikke til Steinars uke og styrketall — referer til hans faktiske løft og øvelser.
- Foreslå aldri "mer volum/kg". Gi progression-spesifikke råd (f.eks. "på din squat 102 kg, prøv pause squat").
- Bruk splitten aktivt. Hvis en muskel ikke er trent pga. splitten, si "I morgen er leg day" – ikke "beina trenger stimulering".
- Tonen er: "Basert på tallene er dette planen:" – aldri "Du kan vurdere å..."
- Korte bulletpoints. Lesbart på 5 sekunder.${examWarning}
${lateNight ? `- Klokken er ${timeStr}. Tittelen skal handle om at det er sent og tid for søvn. Feedback starter med at søvn er det viktigste for morgendagens prestasjoner. Minimale treningsanbefalinger.` : ''}

Svar i dette JSON-formatet:
{
  "title": "Morsom/kreativ tittel maks 8 ord – refererer DIREKTE til øktnavnet «${lastWorkout}» med ordspill eller analogi",
  "feedback": "Én setning om ukens status basert på splitten og tallene. Én konkret setning om hva neste steg er. Direkte – ingen høflighetsfraser.",
  "actions": ["Konkret tiltak 1", "Konkret tiltak 2", "Konkret tiltak 3"],
  "quickQuestions": ["Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8"]
}
Alle 8 quickQuestions: i 1.person (jeg/min/meg), konkrete til ukens treningsdata, variert tema (neste økt, svake punkter, teknikk, restitusjon, prioritering). Null generiske spørsmål.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 700,
        temperature: 0.72,
        response_format: { type: 'json_object' },
      }),
    });
    if (!groqRes.ok) throw new Error(`Groq ${groqRes.status}`);
    const data = await groqRes.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return res.status(200).json({
      title: parsed.title || '',
      feedback: parsed.feedback || '',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      quickQuestions: Array.isArray(parsed.quickQuestions) ? parsed.quickQuestions.slice(0, 8) : [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
