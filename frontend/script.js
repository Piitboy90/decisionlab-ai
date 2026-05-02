// ═══════════════════════════════════════════════════════════════════════════════
// DecisionLab AI - Frontend Logic
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE_URL = window.location.origin;

const state = {
  currentView: "config",
  context: "",
  difficulty: "Media",
  questionCount: 5,
  questions: [],
  currentQuestionIndex: 0,
  results: [],
};

const $ = (selector) => document.querySelector(selector);

const views = {
  config: $("#view-config"),
  quiz: $("#view-quiz"),
  summary: $("#view-summary"),
};

const configEls = {
  contextInput: $("#contextInput"),
  difficultySelect: $("#difficultySelect"),
  questionCountSelect: $("#questionCountSelect"),
  startBtn: $("#startQuizBtn"),
  loadingMsg: $("#loadingMsg"),
};

const quizEls = {
  progressLabel: $("#progressLabel"),
  progressFill: $("#progressFill"),
  skillBadge: $("#skillBadge"),
  situation: $("#situationText"),
  customerMessage: $("#customerMessageText"),
  question: $("#questionText"),
  textarea: $("#userResponseTextarea"),
  startVoiceBtn: $("#startVoiceBtn"),
  stopVoiceBtn: $("#stopVoiceBtn"),
  voiceStatus: $("#voiceStatus"),
  submitBtn: $("#submitAnswerBtn"),
  loadingMsg: $("#analyzeLoadingMsg"),
};

const summaryEls = {
  averageScore: $("#averageScore"),
  overallLevel: $("#overallLevel"),
  readiness: $("#readiness"),
  strengths: $("#strengthsText"),
  gaps: $("#criticalGapsText"),
  nextSteps: $("#nextStepsText"),
  questionsDetail: $("#questionsDetail"),
  restartBtn: $("#restartBtn"),
};

function showView(viewName) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  views[viewName].classList.remove("hidden");
  state.currentView = viewName;
  window.scrollTo({ top: 0, behavior: "smooth" });
  console.log(`🔄 Vista activa: ${viewName}`);
}

function setLoading(button, loadingMsg, isLoading) {
  button.disabled = isLoading;
  if (isLoading) {
    loadingMsg.classList.remove("hidden");
  } else {
    loadingMsg.classList.add("hidden");
  }
}

function showError(message) {
  alert(`❌ ${message}`);
}

function getScoreClass(score) {
  if (score >= 8) return "score-high";
  if (score >= 5) return "score-mid";
  return "score-low";
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA 1: GENERAR QUIZ
// ═══════════════════════════════════════════════════════════════════════════════

configEls.startBtn.addEventListener("click", async () => {
  const context = configEls.contextInput.value.trim();
  
  if (context.length < 5) {
    showError("Por favor, indica un contexto de al menos 5 caracteres.");
    configEls.contextInput.focus();
    return;
  }
  
  state.context = context;
  state.difficulty = configEls.difficultySelect.value;
  state.questionCount = parseInt(configEls.questionCountSelect.value);
  
  setLoading(configEls.startBtn, configEls.loadingMsg, true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: state.context,
        difficulty: state.difficulty,
        questionCount: state.questionCount,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Error al generar el cuestionario.");
    }
    
    state.questions = data.questions;
    state.currentQuestionIndex = 0;
    state.results = [];
    
    console.log(`✅ Quiz generado: ${state.questions.length} preguntas`);
    
    showView("quiz");
    renderCurrentQuestion();
    
  } catch (error) {
    console.error("❌ Error generando quiz:", error);
    showError(error.message);
  } finally {
    setLoading(configEls.startBtn, configEls.loadingMsg, false);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA 2: RENDERIZAR PREGUNTA ACTUAL
// ═══════════════════════════════════════════════════════════════════════════════

function renderCurrentQuestion() {
  const q = state.questions[state.currentQuestionIndex];
  const total = state.questions.length;
  const current = state.currentQuestionIndex + 1;
  
  quizEls.progressLabel.textContent = `Pregunta ${current} de ${total}`;
  quizEls.progressFill.style.width = `${(current / total) * 100}%`;
  quizEls.skillBadge.textContent = q.skill;
  
  quizEls.situation.textContent = q.situation;
  quizEls.customerMessage.textContent = `"${q.customerMessage}"`;
  quizEls.question.textContent = q.question;
  
  quizEls.textarea.value = "";
  quizEls.voiceStatus.textContent = "";
  quizEls.textarea.focus();
  
  console.log(`📋 Pregunta ${current}/${total}: ${q.skill}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA 2: EVALUAR Y CONTINUAR
// ═══════════════════════════════════════════════════════════════════════════════

quizEls.submitBtn.addEventListener("click", async () => {
  const userResponse = quizEls.textarea.value.trim();
  
  if (userResponse.length < 15) {
    showError("Tu respuesta debe tener al menos 15 caracteres.");
    quizEls.textarea.focus();
    return;
  }
  
  const currentQ = state.questions[state.currentQuestionIndex];
  
  setLoading(quizEls.submitBtn, quizEls.loadingMsg, true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userResponse,
        situation: currentQ.situation,
        customerMessage: currentQ.customerMessage,
        question: currentQ.question,
        context: state.context,
        skill: currentQ.skill,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Error al analizar la respuesta.");
    }
    
    state.results.push({
      ...data,
      skill: currentQ.skill,
      situation: currentQ.situation,
      userAnswer: userResponse,
      questionNumber: state.currentQuestionIndex + 1,
    });
    
    console.log(`✅ Pregunta ${state.currentQuestionIndex + 1} evaluada. Score: ${data.score}/10`);
    
    state.currentQuestionIndex++;
    
    if (state.currentQuestionIndex < state.questions.length) {
      renderCurrentQuestion();
    } else {
      await generateFinalSummary();
    }
    
  } catch (error) {
    console.error("❌ Error analizando:", error);
    showError(error.message);
  } finally {
    setLoading(quizEls.submitBtn, quizEls.loadingMsg, false);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA 3: GENERAR RESUMEN FINAL
// ═══════════════════════════════════════════════════════════════════════════════

async function generateFinalSummary() {
  setLoading(quizEls.submitBtn, quizEls.loadingMsg, true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/final-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: state.context,
        results: state.results,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Error al generar el resumen.");
    }
    
    renderSummary(data);
    showView("summary");
    
    console.log("✅ Resumen final generado");
    
  } catch (error) {
    console.error("❌ Error en resumen final:", error);
    showError(error.message);
  } finally {
    setLoading(quizEls.submitBtn, quizEls.loadingMsg, false);
  }
}

function renderSummary(summary) {
  summaryEls.averageScore.textContent = summary.averageScore;
  summaryEls.overallLevel.textContent = summary.overallLevel;
  summaryEls.readiness.textContent = summary.professionalReadiness;
  summaryEls.strengths.textContent = summary.strengths;
  summaryEls.gaps.textContent = summary.criticalGaps;
  summaryEls.nextSteps.textContent = summary.nextSteps;
  
  summaryEls.questionsDetail.innerHTML = state.results
    .map((r, i) => {
      // Convierte el string de improvements en HTML con saltos de línea
      const improvementsHtml = r.improvements
        .split('→')
        .filter(point => point.trim().length > 0)
        .map(point => `<li>${point.trim()}</li>`)
        .join('');
      
      return `
        <div class="question-detail">
          <div class="question-detail-header">
            <strong>Pregunta ${i + 1}: ${r.skill}</strong>
            <span class="question-score ${getScoreClass(r.score)}">${r.score}/10</span>
          </div>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 12px;">
            <em>${r.situation}</em>
          </p>
          <p style="margin-bottom: 12px;"><strong>Tu respuesta:</strong> ${r.userAnswer}</p>
          <div style="margin-bottom: 12px;">
            <strong style="display: block; margin-bottom: 8px;">Mejoras sugeridas:</strong>
            <ul class="improvements-list">${improvementsHtml}</ul>
          </div>
          <p style="color: var(--color-success); font-size: 0.9rem; margin-top: 12px; padding: 12px; background: var(--color-success-light); border-radius: var(--radius-md);"><strong>Respuesta modelo:</strong> ${r.betterAnswer}</p>
        </div>
      `;
    })
    .join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA 3: REINICIAR
// ═══════════════════════════════════════════════════════════════════════════════

summaryEls.restartBtn.addEventListener("click", () => {
  state.context = "";
  state.questions = [];
  state.currentQuestionIndex = 0;
  state.results = [];
  
  configEls.contextInput.value = "";
  configEls.difficultySelect.value = "Media";
  configEls.questionCountSelect.value = "5";
  
  showView("config");
  configEls.contextInput.focus();
  
  console.log("🔄 Reset completo");
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECONOCIMIENTO DE VOZ
// ═══════════════════════════════════════════════════════════════════════════════

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (!SpeechRecognition) {
  quizEls.startVoiceBtn.disabled = true;
  quizEls.startVoiceBtn.textContent = "🚫 Voz no disponible";
  quizEls.voiceStatus.textContent = "Tu navegador no soporta dictado por voz.";
} else {
  recognition = new SpeechRecognition();
  recognition.lang = "es-ES";
  recognition.continuous = true;
  recognition.interimResults = true;
  
  recognition.onstart = () => {
    quizEls.voiceStatus.textContent = "🔴 Escuchando...";
    quizEls.voiceStatus.style.color = "#EF4444";
    quizEls.startVoiceBtn.classList.add("hidden");
    quizEls.stopVoiceBtn.classList.remove("hidden");
  };
  
  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }
    
    if (finalTranscript) {
      quizEls.textarea.value += finalTranscript;
    }
    
    if (interimTranscript) {
      quizEls.voiceStatus.textContent = `🟡 ${interimTranscript}`;
      quizEls.voiceStatus.style.color = "#F59E0B";
    }
  };
  
  recognition.onerror = (event) => {
    quizEls.voiceStatus.textContent = `❌ Error: ${event.error}`;
    quizEls.voiceStatus.style.color = "#EF4444";
    quizEls.startVoiceBtn.classList.remove("hidden");
    quizEls.stopVoiceBtn.classList.add("hidden");
  };
  
  recognition.onend = () => {
    quizEls.voiceStatus.textContent = "✅ Dictado finalizado";
    quizEls.voiceStatus.style.color = "#10B981";
    quizEls.startVoiceBtn.classList.remove("hidden");
    quizEls.stopVoiceBtn.classList.add("hidden");
  };
  
  quizEls.startVoiceBtn.addEventListener("click", () => {
    try {
      recognition.start();
    } catch (e) {
      console.log("Reconocimiento ya activo");
    }
  });
  
  quizEls.stopVoiceBtn.addEventListener("click", () => {
    recognition.stop();
  });
}

console.log("✅ DecisionLab AI - Frontend cargado");
console.log(`🚀 API Base URL: ${API_BASE_URL}`);
configEls.contextInput.focus();