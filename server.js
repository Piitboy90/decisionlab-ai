import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

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
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { context, difficulty, questionCount } = req.body;

    if (!context || context.trim().length < 5) {
      return res.status(400).json({
        error: "Indica un contexto profesional de al menos 5 caracteres.",
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
      max_tokens: 3000,
      temperature: 0.9,
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
app.post("/api/analyze", async (req, res) => {
  try {
    const { userResponse, situation, customerMessage, question, context, skill } = req.body;

    if (!userResponse || userResponse.trim().length < 15) {
      return res.status(400).json({
        error: "La respuesta es demasiado corta para evaluarla profesionalmente.",
      });
    }

    if (!context) {
      return res.status(400).json({
        error: "Falta el contexto del escenario.",
      });
    }

    const prompt = `Eres un evaluador senior especializado en "${context}". Has formado a más de 5.000 profesionales en este sector. Tu evaluación es RIGUROSA pero CONSTRUCTIVA. No regalas notas ni suavizas críticas.

CONTEXTO DEL ESCENARIO: ${situation}

LO QUE DIJO EL CLIENTE: "${customerMessage}"

PREGUNTA EVALUADA: ${question}

SKILL EVALUADO: ${skill}

RESPUESTA DEL PROFESIONAL: "${userResponse}"

INSTRUCCIONES DE EVALUACIÓN:

1. EVALÚA COMO UN EXPERTO DEL SECTOR. No como un coach genérico.
   - Si es hostelería: piensa como un Director de F&B de un 5 estrellas.
   - Si es ventas: piensa como un Sales Director que cierra deals de 500K€.
   - Si es atención médica: piensa como un médico con experiencia en bedside manner.

2. SÉ CRÍTICO Y RIGUROSO. La gente aprende de feedback honesto.
   - Si la respuesta es mediocre, dilo. Score 4-6.
   - Si es excelente, justifica por qué. Score 8-10.
   - Si es peligrosa (legal/reputacional), score 1-3.

3. DETECTA RED FLAGS REALES:
   - Promesas que la empresa no puede cumplir
   - Frases legalmente peligrosas
   - Tono condescendiente o defensivo
   - Falta de empatía
   - Soluciones que escalan el problema

4. LA "betterAnswer" DEBE SER CREATIVA Y HUMANA:
   - NO uses fórmulas tipo "Entiendo perfectamente su preocupación..."
   - Adapta el tono al sector
   - Incluye lenguaje corporal o tono cuando aplique
   - Que se sienta como algo que diría un PRO del sector

5. "improvements" debe ser ACCIONABLE: 2-3 mejoras CONCRETAS.

DEVUELVE SOLO JSON VÁLIDO (sin markdown, sin texto adicional):

{
  "score": <número entero 1-10>,
  "tone": "<análisis del tono utilizado en 1-2 frases>",
  "risks": "<riesgos detectados. Si no hay, di 'Sin riesgos detectados'>",
  "improvements": "<2-3 mejoras CONCRETAS y accionables>",
  "betterAnswer": "<respuesta modelo creativa, humana, adaptada al sector>"
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
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
app.post("/api/final-summary", async (req, res) => {
  try {
    const { context, results } = req.body;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        error: "No hay resultados para analizar.",
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

// FALLBACK
app.use((req, res) => {
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