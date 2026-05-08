# 🎯 DecisionLab AI

> **Simulador de formación profesional con IA para empresas B2B**  
> Entrena respuestas reales ante situaciones de cliente, ventas, gestión de conflictos y reputación corporativa.

![Status](https://img.shields.io/badge/status-MVP%20funcional-success)
![Tech](https://img.shields.io/badge/stack-Node.js%20%7C%20Express%20%7C%20OpenAI-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎬 Demo

> **🚀 [Ver demo en producción](https://decisionlab-ai.up.railway.app)** *(añadir tras deploy)*

![DecisionLab AI Screenshot](docs/screenshot.png)

---

## 💡 Problema que resuelve

La formación corporativa tradicional es **teórica, abstracta y poco práctica**. Los empleados aprenden de manuales que no se parecen a las situaciones reales que enfrentan cada día: clientes enfadados, dilemas éticos, presión de venta, errores que escalan.

**Coste real del problema:**
- Una mala respuesta de un comercial inmobiliario puede acarrear sanciones LMV
- Un camarero defensivo ante una alergia mal gestionada genera demanda potencial
- Un asesor financiero que promete rentabilidades viola normativa CNMV

**DecisionLab AI** simula situaciones realistas, evalúa con criterio experto del sector, y propone mejoras anclados al texto literal del usuario. **Es un gimnasio mental para profesionales B2B.**

---

## ✨ Características principales

| Característica | Descripción |
|---|---|
| 🎭 **Simulaciones realistas** | La IA genera escenarios B2B basados en patrones reales del sector indicado |
| 📊 **Evaluación rigurosa** | Análisis profesional con score 1-10, detección de red flags legales/reputacionales |
| 🎯 **Mejoras accionables** | Feedback anclado al texto literal del usuario: cita exacta + por qué falla + cómo reformular |
| 🎙️ **Dictado por voz** | Web Speech API con feedback visual en tiempo real |
| 📈 **Informe ejecutivo final** | Análisis agregado tras 5-10 preguntas: fortalezas, gaps críticos, readiness profesional |
| 🌐 **Multi-sector** | Hostelería, ventas, banca, salud, retail, atención al cliente |
| ⚡ **Multi-pregunta** | Quizzes de 5 o 10 situaciones, escalable |

---

## 🛠️ Tech Stack y decisiones

### Backend
- **Node.js + Express 5** → API REST simple, eficiente
- **OpenAI SDK 6.35** → `gpt-4o-mini` (generación) + `gpt-4o` (análisis crítico)
- **dotenv** → Gestión segura de API keys
- **CORS + express.static** → Sirve frontend y API desde un solo servidor

### Frontend
- **HTML5 semántico** → `<main>`, `<section>`, accesible
- **CSS Custom Properties** → Sistema de diseño con variables, dark mode B2B
- **JavaScript Vanilla (sin frameworks)** → SPA con state management manual
- **Web Speech API** → Reconocimiento de voz nativo del navegador

### ¿Por qué Vanilla y no React?

**Decisión consciente:**
- Es un MVP, no necesita virtual DOM
- Bundle 0kb vs ~40kb React
- Demuestro fundamentos sin depender de frameworks
- Más portable y rápido

---

## 🏗️ Arquitectura

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Navegador      │ ──────> │  Express Server  │ ──────> │   OpenAI API     │
│   (Frontend)     │ <────── │   (Backend)      │ <────── │  (gpt-4o-mini /  │
│                  │         │                  │         │     gpt-4o)      │
└──────────────────┘         └──────────────────┘         └──────────────────┘
│                            │
│                            │
3 Vistas SPA                3 Endpoints REST

Configuración            - POST /api/generate-quiz
Quiz multi-step          - POST /api/analyze
Resumen ejecutivo        - POST /api/final-summary

### Estructura del proyecto

decisionlab-ai/
├── frontend/
│   ├── index.html        # SPA con 3 vistas
│   ├── style.css         # Design system B2B con CSS variables
│   └── script.js         # State management + lógica vanilla JS
├── backend/
│   ├── server.js         # Express + endpoints + prompts
│   ├── package.json      # Dependencias backend
│   └── package-lock.json
├── .env                  # Variables de entorno (NO subir a git)
├── .gitignore
└── README.md

---

## 🔌 API Endpoints

### `POST /api/generate-quiz`
Genera N situaciones realistas adaptadas al contexto.

**Request:**
```json
{
  "context": "Camarero en restaurante de Madrid",
  "difficulty": "Media",
  "questionCount": 5
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": 1,
      "situation": "Estás en un restaurante a las 21:30...",
      "customerMessage": "Mira, llevo 25 minutos esperando...",
      "question": "¿Qué le respondes / haces ahora?",
      "skill": "Gestión de quejas con menores presentes",
      "difficulty": "Media"
    }
  ]
}
```

### `POST /api/analyze`
Análisis profundo de una respuesta individual.

**Request:**
```json
{
  "userResponse": "Le diría que tenga paciencia...",
  "situation": "...",
  "customerMessage": "...",
  "question": "...",
  "context": "Camarero en restaurante",
  "skill": "Gestión de quejas"
}
```

**Response:**
```json
{
  "score": 5,
  "tone": "Defensivo y poco empático",
  "risks": "Tu frase 'tenga paciencia' minimiza la frustración del cliente",
  "improvements": "1. Tu frase X falla porque Y. Reformula: Z. 2. ...",
  "betterAnswer": "Veo que llevas 25 minutos esperando y tu hijo está al límite..."
}
```

### `POST /api/final-summary`
Informe ejecutivo agregado tras completar el quiz.

**Response:**
```json
{
  "overallLevel": "En desarrollo",
  "averageScore": 6.4,
  "strengths": "Buena escucha activa en escenarios calmados...",
  "criticalGaps": "Bajo control bajo presión emocional...",
  "nextSteps": "Practicar gestión de menores y quejas escaladas",
  "professionalReadiness": "Aún no listo para turnos en hora punta"
}
```

---

## 🚀 Cómo ejecutar en local

### Prerequisitos
- Node.js 20+
- API key de OpenAI con créditos

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/Piitboy90/decisionlab-ai.git
cd decisionlab-ai

# 2. Instalar dependencias del backend
cd backend
npm install
cd ..

# 3. Configurar variables de entorno
echo "OPENAI_API_KEY=sk-proj-xxxxx" > .env
echo "PORT=3000" >> .env

# 4. Arrancar servidor
cd backend
npm start
```

Abre `http://localhost:3000` en el navegador.

---

## 🔐 Variables de entorno

Crea un archivo `.env` en la **raíz del proyecto**:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
PORT=3000
```

⚠️ **Nunca subas el `.env` a GitHub.** Está en `.gitignore` por defecto.

---

## 🧠 Decisiones de Prompt Engineering

### 1. Modelos diferenciados por tarea

| Endpoint | Modelo | Por qué |
|---|---|---|
| `/generate-quiz` | `gpt-4o-mini` | Tarea creativa con plantilla clara, 10x más barato |
| `/analyze` | `gpt-4o` | Razonamiento profundo y detección de matices legales |
| `/final-summary` | `gpt-4o` | Síntesis ejecutiva precisa |

### 2. Temperature ajustada

- **0.9** en quiz → variedad creativa de situaciones
- **0.85** en análisis → balance entre rigor y respuestas humanas
- **0.6** en resumen → informe preciso, no creativo

### 3. Anchoring + Counter-example en feedback

El prompt fuerza a la IA a:
- **Citar literalmente** las palabras del usuario
- Mostrar **antes/después** concreto
- Detectar **contexto legal** del sector cuando aplica
- Dar la **frase sustitutiva exacta**, no consejos abstractos

**Antes (genérico):** *"Sé más empático con el cliente."*  
**Ahora (anclado):** *"Tu frase 'tenga paciencia' minimiza la frustración. Sustituye por: 'Veo que llevas 25 minutos esperando, eso no es aceptable. Voy a la cocina ahora mismo'."*

### 4. Persona dinámica del evaluador

El sistema cambia la "persona" de la IA según el sector:
- Hostelería → Director de F&B 5 estrellas
- Inmobiliaria → Broker senior con conocimiento LMV
- Banca → Asesor con conocimiento MiFID II / CNMV
- Salud → Médico con experiencia en bedside manner

Esto hace que el feedback sea **técnicamente preciso al sector**, no genérico.

---

## 📚 Lecciones aprendidas (Postmortem técnico)

Construir DecisionLab AI fue un proceso iterativo. Estos son los errores reales que cometí y aprendí a no repetir:

### 1. Estructura de carpetas tardía
**Error:** En la primera versión, mezclé frontend y backend en la raíz. Tuve que reorganizar a media construcción.  
**Aprendizaje:** **Definir estructura ANTES de la primera línea de código.** Cinco minutos de planning ahorran horas de refactor.

### 2. URLs hardcodeadas en frontend
**Error:** Hardcodeé `localhost:3000` en el código del frontend. Al deployar, todo se rompió.  
**Aprendizaje:** Usar `window.location.origin` para auto-detectar el host. El mismo código funciona en local y producción.

### 3. Caracteres unicode invisibles
**Error:** Al copiar/pegar URLs entre apps, se colaron caracteres cirílicos (`і` vs `i`) que rompían fetch sin error visible.  
**Aprendizaje:** **Validar siempre los strings críticos.** Cuando algo "debería funcionar y no funciona", revisar caracteres invisibles.

### 4. Olvido del `"type": "module"` en package.json
**Error:** `npm init` no añade `"type": "module"`. Sin esa línea, los `import` modernos fallan con error críptico.  
**Aprendizaje:** Editar `package.json` inmediatamente después de `npm init`.

### 5. Live Server vs servidor Node
**Error:** Confundí `localhost:5500` (Live Server de VS Code) con `localhost:3000` (mi servidor). Pasé tiempo debuggeando un fetch que llamaba al servidor equivocado.  
**Aprendizaje:** Cuando trabajo con backend Node, **apago Live Server** para evitar confusión.

### 6. Modelo equivocado para análisis crítico
**Error:** Empecé usando `gpt-4o-mini` para todo. Los análisis salían superficiales.  
**Aprendizaje:** **Diferenciar modelos por tarea.** El "mini" es bueno para creatividad con plantilla; el "4o completo" es necesario para razonamiento crítico. La diferencia de coste se justifica en B2B.

### 7. Prompts genéricos producen feedback genérico
**Error:** El primer prompt decía "da feedback constructivo". La IA generaba consejos vacíos tipo "sé más empático".  
**Aprendizaje:** **El prompt debe forzar especificidad.** Anclar a citas literales, mostrar antes/después, detectar contexto legal. Esto eleva la calidad del output ~10x.

### 8. Saber parar también es senior
**Error en otro proyecto previo (ClaroMayor):** Construí 3 semanas sin validar. Al testear con usuarios reales descubrí que el target rechazaba el formato.  
**Aprendizaje aplicado aquí:** Definí kill criteria al inicio. Validé el patrón de simulación antes de invertir en multi-pregunta.

---

## 🗺️ Roadmap futuro

### v2.0 (próximos 30 días)
- [ ] Persistencia: guardar resultados de quizzes en base de datos
- [ ] Autenticación de usuarios (signup/login)
- [ ] Histórico de evaluaciones por usuario
- [ ] Dashboard de progreso individual

### v3.0 (mid-term)
- [ ] Modo multi-jugador (sesiones de equipo)
- [ ] Comparativas anonimizadas con peers del mismo sector
- [ ] Exportación de informes a PDF
- [ ] Integración con LMS corporativos (SCORM)

### v4.0 (B2B enterprise)
- [ ] Custom branding por cliente
- [ ] API para integraciones HR (Workday, BambooHR)
- [ ] Analytics de equipo para managers
- [ ] Voz bidireccional (TTS para escenarios inmersivos)

---

## 👤 Autor

**Peter Siteng Tumpap**  
Profesional de hostelería en transición a AI Implementation Specialist.  
12+ años de experiencia operativa en hoteles de Madrid (Jefe de Sector).  
Aprendiendo a construir productos de IA aplicados a sectores que conozco a fondo.

- 🌐 LinkedIn: [Tu LinkedIn]
- 📧 Contact: petersiteng_90@hotmail.com
- 💻 GitHub: [@Piitboy90](https://github.com/Piitboy90)

---

## 📜 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

## 🙏 Reconocimientos

- **OpenAI** por la API que hace posible esto
- **Express** y la comunidad Node.js
- **Anthropic Claude** como mentor de aprendizaje durante el desarrollo
- Mi pareja y mis hijos por la paciencia durante las sesiones nocturnas de código

---

⭐ Si te ha gustado el proyecto, dale una estrella en GitHub.
