/**
 * Dagens setning for Steinar OS.
 *
 * Returnerer ÉN setning — { sentence: "..." } — som rendres i Instrument Serif
 * nederst til venstre på new tab-siden. Maks to linjer på skjermen, så den må
 * være kort. Tonen er tørr, med rom for litt humor: «Fem økter. Tolv dager
 * til R1.» Skal alltid forankres i klokkeslett, kalender eller en vurdering —
 * aldri en kjedelig «ingenting planlagt».
 *
 * Klienten kaller dette én gang i døgnet og cacher svaret i localStorage.
 * Inndata kommer fra den cachede Google Calendar-dataen — ikke fra Hevy.
 */

const STEINAR_CONTEXT = `
Steinar er 17–18 år, VG2-elev, tar R1 (matematikk), Fysikk 1 og Biologi 1.
Trener 5–6 ganger i uka (styrke + løping), 424+ loggede økter. Ambisiøs,
kronisk lett underrestituert. R1-eksamen er det som betyr mest akkurat nå.
`;

const SYSTEM_PROMPT = `Du skriver én enkelt setning som møter Steinar når han åpner en ny fane.
Han ser den 50+ ganger om dagen. Den skal aldri kjennes tom eller kjedelig.

${STEINAR_CONTEXT}

Du får klokkeslett, ukedag, hva som står på treningsplanen i dag, hvor mange
økter som er lagt inn denne uka, og kommende vurderinger. Forankre ALLTID
setningen i minst én av disse: tidspunktet på dagen, noe konkret fra
kalenderen, en kommende vurdering, eller en kort anbefaling om resten av
dagen. Er det faktisk ingenting planlagt: ikke bare konstater det — spill i
stedet på klokkeslettet, en kommende vurdering, eller gi en tørr kommentar
om den ledige tiden.
Forbudt (for kjedelig, bruk ALDRI denne typen setning uansett hvor tom
dagen er): "Ingenting planlagt.", "Ingen planer i dag.", "Tom dag.",
"Ingenting i dag.", eller noe som betyr det samme.

REGLER — ufravikelige:
- Svar KUN med gyldig JSON: {"sentence": "..."}
- Maks 60 tegn totalt. Kortere er bedre.
- Kort og tørt, men gjerne med et snev av tørr humor innimellom — aldri
  servilt, aldri som en motivasjonsplakat.
- Ingen utropstegn, ingen emoji, ingen «du kan», ingen spørsmål, ingen
  tiltaleform.
- Bygg på tallene du får. Finn aldri på noe du ikke har data for.
- Gjerne to korte helsetninger i stedet for én lang.
- Skriv tall med bokstaver når det leses bedre («Tolv dager», ikke «12 dager»).
- Norsk bokmål.

Eksempler på riktig treff:
{"sentence": "Fem økter. Tolv dager til R1."}
{"sentence": "Push A i dag. Fysikkprøve på fredag."}
{"sentence": "Ingen økt i dag. Beina takker deg i morgen."}
{"sentence": "Rolig uke. Godt, for R1 er tjue dager unna."}
{"sentence": "Kvelden er ung. Eksamen er det ikke — fem dager."}
{"sentence": "Morgen. Kaffe før Push A, i den rekkefølgen."}
{"sentence": "Sent oppe igjen. Legs venter klokka ni uansett."}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    weekday = '',
    week = null,
    time = '',
    upcoming = [],
    todaySessions = [],
    plannedThisWeek = 0,
  } = req.body || {};

  const assessmentLines = upcoming.length
    ? upcoming.map(a => `${a.title} om ${a.days} dager`).join(', ')
    : 'ingen kjente vurderinger';

  const userMsg = [
    `KLOKKEN: ${time || 'ukjent'}`,
    `I DAG: ${weekday}${week ? `, uke ${week}` : ''}`,
    `PÅ PLANEN I DAG: ${todaySessions.length ? todaySessions.join(', ') : 'ingenting'}`,
    `ØKTER PLANLAGT DENNE UKA: ${plannedThisWeek}`,
    `KOMMENDE VURDERINGER: ${assessmentLines}`,
  ].join('\n');

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 80,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });
    if (!groqRes.ok) throw new Error(`Groq ${groqRes.status}`);

    const data = await groqRes.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    // Modellen sklir av og til ut i et avsnitt. Kutt til første to setninger.
    const sentence = String(parsed.sentence || '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?])\s+/)
      .slice(0, 2)
      .join(' ');

    if (!sentence) return res.status(200).json({ sentence: null });
    return res.status(200).json({ sentence });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
