import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.set("trust proxy", 1);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://decisionlab-ai-production.up.railway.app,http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origen no permitido: ${origin}`));
  },
}));

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "frontend")));

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones desde esta IP. Espera unos minutos." },
});

function parseJsonResponse(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("La IA no devolvió JSON válido.");
    }
    return JSON.parse(match[0]);
  }
}

// ENDPOINT 1: Generar quiz
app.post("/api/generate-quiz", aiLimiter, async (req, res) => {
  try {
    const { context, difficulty, questionCount } = req.body;

    if (!context || typeof context !== "string" || context.trim().length < 5 || context.length > 500) {
      return res.status(400).json({
        error: "El contexto debe tener entre 5 y 500 caracteres.",
      });
    }

    const totalQuestions = questionCount || 5;
    const level = difficulty || "Media";

    const difficultyMap = {
      "Fácil": "Situaciones cotidianas con un cliente educado y razonable. La respuesta correcta es relativamente directa.",
      "Media": "Situaciones con cierta tensión, ambigüedad o conflicto de intereses. Requiere matices y juicio profesional.",
      "Difícil": "Situaciones de alta presión, clientes hostiles o irracionales, dilemas éticos, riesgos legales o reputacionales. Sin respuesta 'fácil'.",
    };

    const difficultyDescription = difficultyMap[level] || difficultyMap["Media"];

    const prompt = `Eres un consultor senior con 20 años de experiencia diseñando programas de formación corporativa para Fortune 500. Has trabajado con sectores como hostelería, retail, banca, salud y tecnología.

TAREA: Genera ${totalQuestions} situaciones de entrenamiento ALTAMENTE REALISTAS para el contexto: "${context}".

NIVEL DE DIFICULTAD: ${level}
DESCRIPCIÓN: ${difficultyDescription}

REGLAS ESTRICTAS:
1. Cada situación debe sentirse como algo que ocurrió HOY en una empresa real, no un caso de libro de texto.
2. Los "customerMessage" deben sonar como gente real habla: con tics, emociones, prisa, frustración. NO frases corporativas planas.
3. Variar tipos de problemas: quejas, dudas, conflictos, peticiones especiales, errores tuyos, malentendidos.
4. Cada pregunta debe tener una "skill" diferente que se está evaluando (no repetir).
5. EVITA clichés: "Estoy muy molesto", "Quiero hablar con su superior" sin contexto específico.
6. INCLUYE detalles concretos: nombres, productos, fechas, importes, situaciones específicas que dan realismo.

EJEMPLO de "customerMessage" MALO (genérico): "Estoy molesto con el servicio."
EJEMPLO de "customerMessage" BUENO (realista): "Mira, llevo 25 minutos esperando el segundo plato y mi hijo de 4 años está al borde del meltdown. Si no sale en 5 minutos nos vamos sin pagar el primero, ¿vale?"

DEVUELVE SOLO JSON VÁLIDO con esta estructura exacta (sin markdown, sin texto adicional):

{
  "questions": [
    {
      "id": 1,
      "situation": "Contexto detallado de la situación (2-3 frases). Incluye: dónde ocurre, quién está involucrado, qué pasó antes.",
      "customerMessage": "Lo que el cliente dice TEXTUALMENTE. Realista, con personalidad.",
      "question": "¿Qué le respondes / haces ahora mismo?",
      "skill": "Skill específico evaluado",
      "difficulty": "${level}"
    }
  ]
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.85,
    });

    const rawText = response.choices[0].message.content;
    const data = parseJsonResponse(rawText);

    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      return res.status(500).json({
        error: "La IA no devolvió un cuestionario válido. Intenta de nuevo.",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Quiz generation error:", error.message);
    res.status(500).json({
      error: "No se pudo generar el cuestionario. Intenta de nuevo.",
    });
  }
});

// ENDPOINT 2: Analizar respuesta
app.post("/api/analyze", aiLimiter, async (req, res) => {
  try {
    const { userResponse, situation, customerMessage, question, context, skill } = req.body;

    if (!userResponse || typeof userResponse !== "string" || userResponse.trim().length < 15 || userResponse.length > 2000) {
      return res.status(400).json({
        error: "La respuesta debe tener entre 15 y 2000 caracteres.",
      });
    }

    if (!context) {
      return res.status(400).json({
        error: "Falta el contexto del escenario.",
      });
    }

  const prompt = `Eres un evaluador senior especializado en "${context}". Has formado a más de 5.000 profesionales en este sector. Tu evaluación es DEMOLEDORA cuando hace falta y siempre ANCLADA al texto literal del usuario. NUNCA das feedback genérico tipo "sé más empático" o "escucha activamente".

CONTEXTO DEL ESCENARIO:
${situation}

LO QUE DIJO EL CLIENTE/INTERLOCUTOR:
"${customerMessage}"

PREGUNTA EVALUADA:
${question}

SKILL EVALUADO: ${skill}

═══════════════════════════════════════════════════════════════
RESPUESTA TEXTUAL DEL PROFESIONAL EN FORMACIÓN:
"${userResponse}"
═══════════════════════════════════════════════════════════════

REGLAS NO NEGOCIABLES PARA "improvements":

1. CADA punto DEBE empezar con "→" seguido de salto de línea (\\n)
2. CADA punto DEBE citar LITERALMENTE palabras o frases que el usuario USÓ entre comillas
3. CADA punto DEBE explicar POR QUÉ esa frase específica falla (impacto real, riesgo legal, percepción del cliente)
4. CADA punto DEBE proponer la frase EXACTA sustitutiva entre comillas
5. PROHIBIDO usar frases vacías como: "escuchar activamente", "mostrar empatía", "ser más profesional", "ofrecer una solución concreta"
6. SI el usuario dijo algo legalmente peligroso, MENCIONA la normativa exacta (LOPDGDD, LMV, Ley General Defensa Consumidores, etc.)

EJEMPLO DE LO QUE NO DEBES HACER (genérico):
"1. Escuchar activamente al cliente.
2. Mostrar empatía.
3. Ofrecer una solución concreta."

EJEMPLO DE LO QUE SÍ DEBES HACER (específico, anclado, con impacto):

Si el usuario dijo: "eso le pasa por no cuidar de su movil, ha sido muy descuidado"

improvements:
"→ Tu frase 'eso le pasa por no cuidar' es directamente CULPABILIZADORA. Estás humillando al cliente. En España, la Ley General de Defensa de Consumidores obliga al vendedor a tratar la queja con neutralidad. Sustituye por: 'Entiendo tu preocupación, Juan. Vamos a revisar el dispositivo a fondo para entender qué pasó'.

→ Decir 'ha sido muy descuidado' es un JUICIO DE VALOR sin pruebas. Esto puede convertirse en un caso de mala atención que el cliente comparta en RRSS o reseña Google con captura de pantalla. Cambia por: 'Hace solo una semana que lo compraste, vamos a estudiar si esto puede entrar en garantía'.

→ NO has ofrecido ninguna acción concreta. Tu respuesta termina en culpa, no en solución. Cierra siempre con un siguiente paso tangible: 'Voy a tomar nota del incidente, examinar el equipo en taller técnico, y te llamo personalmente mañana antes de las 14h con la respuesta. ¿Te parece bien?'"

INSTRUCCIONES PARA SCORE:
- 1-3: Respuesta peligrosa (legal/reputacional/cliente perdido)
- 4-6: Mediocre, le falta empatía o profundidad
- 7-8: Buena, con margen de mejora
- 9-10: Excelente

LA "betterAnswer" DEBE SER:
- Creativa, humana, adaptada al sector específico
- NO usar fórmulas genéricas
- Específica al cliente y situación, no plantilla
- Incluir un siguiente paso tangible

DEVUELVE SOLO JSON VÁLIDO (sin markdown, sin texto adicional):

{
  "score": <número entero 1-10>,
  "tone": "<análisis del tono utilizado en 1-2 frases, citando palabras del usuario>",
  "risks": "<riesgos detectados citando frase exacta del usuario. Si no hay, di 'Sin riesgos detectados'>",
  "improvements": "<EXACTAMENTE 3 puntos numerados con '→' al inicio de cada uno separados por \\n\\n. Cada punto cita literal del usuario + por qué falla + frase sustitutiva exacta. NUNCA genérico.>",
  "betterAnswer": "<respuesta modelo creativa, humana, adaptada al sector específico>"
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.85,
    });

    const rawText = response.choices[0].message.content;
    const data = parseJsonResponse(rawText);

    if (typeof data.score !== "number" || !data.tone || !data.betterAnswer) {
      return res.status(500).json({
        error: "La IA devolvió una evaluación incompleta. Intenta de nuevo.",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Analysis error:", error.message);
    res.status(500).json({
      error: "No se pudo analizar la respuesta. Intenta de nuevo.",
    });
  }
});

// ENDPOINT 3: Resumen final
app.post("/api/final-summary", aiLimiter, async (req, res) => {
  try {
    const { context, results } = req.body;

    if (!results || !Array.isArray(results) || results.length === 0 || results.length > 20) {
      return res.status(400).json({
        error: "Resultados inválidos (entre 1 y 20).",
      });
    }

    const avgScore = (
      results.reduce((sum, r) => sum + r.score, 0) / results.length
    ).toFixed(1);

    const skillsBreakdown = results.map((r, i) => 
      `Pregunta ${i + 1} (${r.skill}): ${r.score}/10`
    ).join("\n");

    const detailsBreakdown = results.map((r, i) => 
      `--- Pregunta ${i + 1} ---\nSkill: ${r.skill}\nScore: ${r.score}/10\nRiesgos detectados: ${r.risks || 'Sin riesgos'}\n`
    ).join("\n");

    const prompt = `Eres un Director de Formación senior evaluando el desempeño global de un profesional tras un test de simulación en "${context}".

RESULTADOS POR PREGUNTA:
${skillsBreakdown}

NOTA MEDIA: ${avgScore}/10

DETALLES DE EVALUACIONES:
${detailsBreakdown}

TAREA: Genera un informe ejecutivo de cierre.

DEVUELVE SOLO JSON VÁLIDO:

{
  "overallLevel": "<una de: 'Necesita formación intensiva', 'En desarrollo', 'Competente', 'Avanzado', 'Excelencia'>",
  "strengths": "<2-3 fortalezas REALES detectadas>",
  "criticalGaps": "<2-3 áreas críticas donde más necesita mejorar>",
  "nextSteps": "<recomendación concreta de qué practicar a continuación>",
  "professionalReadiness": "<¿está listo para enfrentar este tipo de situaciones? Sé honesto>"
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.6,
    });

    const rawText = response.choices[0].message.content;
    const data = parseJsonResponse(rawText);

    data.averageScore = parseFloat(avgScore);
    data.totalQuestions = results.length;

    res.json(data);
  } catch (error) {
    console.error("❌ Final summary error:", error.message);
    res.status(500).json({
      error: "No se pudo generar el resumen final.",
    });
  }
});

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "✅ Servidor funcionando correctamente",
    version: "2.0.0",
  });
});

// 404 explícito para rutas /api/* que no existen (devuelve JSON, no el HTML)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado." });
});

// SPA fallback solo en GET (Express 5: la sintaxis wildcard requiere nombre)
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor DecisionLab AI v2.0 corriendo en puerto ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   POST /api/generate-quiz`);
  console.log(`   POST /api/analyze`);
  console.log(`   POST /api/final-summary`);
  console.log(`   GET  /api/health`);
});