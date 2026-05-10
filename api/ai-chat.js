const STEINAR_PROFILE = `
## STEINARS TRENINGSPROFIL (alltid ta hensyn til dette)

NIVÅ & KONTEKST:
- Viderekommen løfter, 424+ loggede økter over ~2 år. Bruker RPE og progressiv overload aktivt.
- 17–18 år, VG2-elev. Kronisk lett underrestituert (trening + 3 jobber + krevende skole).
- Hovedmål: Hypertrofi (størrelse). Sekundært: styrke.
- Treningssted: Sporty Bergen Paradis (jobber der). Myrkdalen ved jobb der (begrenset utstyr).

STYRKEREFERANSER (1RM / tunge sett):
- Bench Press: 110 kg | Squat: 102.5 kg | Romanian Deadlift: 120 kg
- Incline DB Press: 85 kg (par) | Shoulder Press DB: ~56 kg (par)
- Weighted Pull-up: +20 kg | Weighted Dips: +35 kg
- Leg Press: 222 kg | Lat Pulldown: 90 kg

SPLIT — PPL + Arnold hybrid (6 dager):
- Mandag: Push (PPL) — Bryst, skulder, triceps
- Tirsdag: Pull (PPL) — Rygg, biceps, bakre skulder
- Onsdag: Legs — Quad, hamstring, legger
- Torsdag: Chest & Back (Arnold) — Bryst + rygg superset
- Fredag: Shoulders & Arms (Arnold) — Skulder, biceps, triceps
- Lørdag: Legs — Quad/hamstring-fokus
- Søndag: Hvile
I praksis 4–5 økter/uke pga. jobb og skole. Det er OK.

ØVELSESBIBLIOTEK:
Push: Incline DB Press, Iso-Lateral Chest Press, Chest Fly, Bench Press | Shoulder Press DB, Lateral Raise DB/Cable | Weighted Dips, Triceps Rope Pushdown, Overhead Extension
Pull: Weighted Pull-ups, Lat Pulldown | Seated Cable Row (Bar/V-grip), Iso-Lateral Row | Rear Delt Reverse Fly | Behind the Back Curl, Hammer Curl, Preacher Curl | Shrug (valgfritt)
Legs: Squat BB, Leg Press, Leg Extension, Bulgarian Split Squat | Romanian Deadlift, Seated Leg Curl | Hip Adduction, Calf Raise
Chest & Back: 3 superset-par (Incline DB↔Pull-up, Chest Press↔Cable Row, Fly↔Lat Pulldown)
Shoulders & Arms: Shoulder Press, Lateral Raise, Rear Delt Fly | Preacher Curl, Hammer Curl, Behind Back Curl | Overhead Ext, Rope Pushdown, Weighted Dips
Myrkdalen Upper: Begrenset utstyr — velg 1 bryst, 1 rygg, 1 skulder, 1 arms — maks 10–14 sett

VOLUMGRENSER:
- Push/Pull: 14–18 working sets | Legs: 12–16 | C&B/S&A: 16–20 | Myrkdalen: 10–14
- FLAGG: Over 22 sett → foreslå kutt. Steinar har tendens til å gå for høyt.

BESLUTNINGSLOGIKK:
Droppe én økt? Kutt i denne rekkefølgen: 1) Lørdag Legs 2) S&A 3) C&B 4) Onsdag Legs (aldri begge) 5) Push/Pull (aldri)
Vurdering i morgen? Lettere økt eller hvile kvelden før. Flytt om mulig.
Myrkdalen helg? Erstatt Lørdag Legs med Myrkdalen Upper. Sørg for Onsdag Legs ble gjort.
Fotballkamp? Ikke Legs samme dag eller dagen før. Fotball teller som kondisjon.
Sliten/dårlig restitusjon? Kutt 20% volum, prioriter kompound, dropp isolasjon. Ikke foreslå deload med mindre 2+ uker med slitenhet.
Eksamensperiode (mai/juni)? 4–5 økter, 45–60 min, vedlikehold. Trening = mental pause — aldri kutt helt.

REGLER:
1. Minimum 4 økter/uke — under dette mister Steinar mer enn han vedlikeholder
2. Aldri dropp begge legs-dager i én uke
3. Push og Pull er kjernen — kutt heller Arnold-dagene
4. Trening er alltid positivt — formuler det aldri som et problem
5. Gi alltid en KONKRET plan, ikke "tren når du kan"
6. Bruk styrkereferansene aktivt — si f.eks. "med din squat på 102 kg..." ikke generelle råd
`;

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

  return `Du er Steinars dedikerte High Performance treningscoach. Svar alltid på norsk.
${STEINAR_PROFILE}
PERSONLIGHET OG REGLER:
- Autoritær, direktiv og kunnskapsrik. Kutt all "fluff".
- Svar er ALLTID spesifikke til Steinars uke, nivå og styrketall — aldri generiske råd.
- Referer til hans faktiske løft, hans split, hans øvelser, hans treningshistorik denne uken.
- Bruk "Basert på tallene dine er dette planen:" – aldri "Du kan vurdere å..."
- Ikke still oppfølgingsspørsmål. Gi din beste anbefaling og avslutt der.
- Foreslå aldri "mer volum/kg". Bruk: progresjons-spesifikke råd (f.eks. "på 102 kg squat, fokuser på pause i bunnen").
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
