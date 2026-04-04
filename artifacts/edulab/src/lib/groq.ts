export interface RubricCriteriaAI {
  name: string;
  superior_desc: string;
  alto_desc: string;
  basico_desc: string;
  bajo_desc: string;
}

export interface EvaluationResult {
  grade: number;
  percentage: number;
  feedback: string;
  criteria_scores: Record<string, { score: number; level: string; justification: string }>;
}

async function callGroq(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  jsonMode = false
): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.1,
      max_tokens: 4000,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateRubricWithAI(
  activityName: string,
  activityDescription: string,
  apiKey: string
): Promise<RubricCriteriaAI[]> {
  const messages = [
    {
      role: "system",
      content: `Eres un experto en pedagogía y diseño de rúbricas educativas. Genera rúbricas detalladas y pertinentes. Responde SIEMPRE en JSON válido.`,
    },
    {
      role: "user",
      content: `Genera una rúbrica de evaluación para la siguiente actividad educativa:

Nombre: ${activityName}
Descripción: ${activityDescription}

Crea exactamente 4 criterios de evaluación. Para cada criterio, define 4 niveles de desempeño:
- Superior (4.6 - 5.0): Desempeño sobresaliente y excepcional
- Alto (4.0 - 4.5): Buen desempeño con detalles menores por pulir
- Básico (3.0 - 3.9): Desempeño mínimo aceptable con falencias notables
- Bajo (1.0 - 2.9): Desempeño deficiente, incorrecto o incompleto

Responde con este JSON exacto:
{
  "criteria": [
    {
      "name": "nombre del criterio",
      "superior_desc": "descripción nivel superior",
      "alto_desc": "descripción nivel alto",
      "basico_desc": "descripción nivel básico",
      "bajo_desc": "descripción nivel bajo"
    }
  ]
}

Escribe en español. Las descripciones deben ser específicas y medibles.`,
    },
  ];

  const content = await callGroq(apiKey, messages, true);
  const parsed = JSON.parse(content);
  return parsed.criteria as RubricCriteriaAI[];
}

export async function evaluateSubmissionWithAI(
  studentName: string,
  activityName: string,
  activityDescription: string,
  questions: Array<{ text: string; type: string }>,
  answers: Record<string, string | string[] | number>,
  rubricCriteria: Array<{
    name: string;
    superior_desc: string;
    alto_desc: string;
    basico_desc: string;
    bajo_desc: string;
  }>,
  apiKey: string
): Promise<EvaluationResult> {
  const answersText = questions
    .map((q, i) => {
      const answer = answers[`q_${i}`] ?? answers[i] ?? "Sin respuesta";
      const answerStr = Array.isArray(answer) ? answer.join(", ") : String(answer);
      return `Pregunta ${i + 1}: ${q.text}\nRespuesta del estudiante: "${answerStr}"`;
    })
    .join("\n\n");

  const rubricText = rubricCriteria
    .map(
      (c) =>
        `=== CRITERIO: ${c.name} ===
NIVEL SUPERIOR (4.6-5.0): ${c.superior_desc}
NIVEL ALTO (4.0-4.5): ${c.alto_desc}
NIVEL BÁSICO (3.0-3.9): ${c.basico_desc}
NIVEL BAJO (1.0-2.9): ${c.bajo_desc}`
    )
    .join("\n\n");

  const messages = [
    {
      role: "system",
      content: `Eres un evaluador académico riguroso y honesto. Tu función es evaluar las respuestas de los estudiantes comparándolas ESTRICTAMENTE con los descriptores de cada nivel de la rúbrica proporcionada.

REGLAS DE EVALUACIÓN OBLIGATORIAS:
1. Lee cada respuesta del estudiante cuidadosamente y compárala PALABRA POR PALABRA con los descriptores de cada nivel.
2. Si la respuesta es vaga, incompleta, incorrecta o no cumple los descriptores del nivel Superior o Alto, DEBES asignar el nivel real que corresponde (Básico o Bajo).
3. NO inflés las notas. Si el estudiante no cumple los criterios de un nivel, asígnale el nivel inferior.
4. Si la respuesta está vacía, es "Sin respuesta", o no tiene relación con la pregunta, el criterio debe recibir una nota en el rango BAJO (1.0-2.9).
5. Si la respuesta existe pero es superficial o incompleta, corresponde al nivel BÁSICO (3.0-3.9).
6. Solo asigna ALTO o SUPERIOR si la respuesta realmente cumple los descriptores correspondientes de la rúbrica.
7. La nota final es el promedio simple de todos los criterios.
8. Escribe la retroalimentación en Markdown, en español, de manera constructiva pero honesta.
9. Responde SIEMPRE en JSON válido.`,
    },
    {
      role: "user",
      content: `Evalúa la entrega del estudiante "${studentName}" para la actividad "${activityName}".

## Descripción de la actividad
${activityDescription}

## Respuestas del estudiante
${answersText}

## Rúbrica de evaluación (APLICA ESTRICTAMENTE)
${rubricText}

INSTRUCCIONES FINALES:
- Evalúa cada criterio de la rúbrica comparando las respuestas con los descriptores.
- Si las respuestas no alcanzan el nivel Superior o Alto descritos en la rúbrica, ASIGNA el nivel real (Básico o Bajo).
- La nota final es el PROMEDIO de los puntajes de todos los criterios.
- El porcentaje = ((nota - 1) / 4) * 100 redondeado.

Responde con este JSON exacto:
{
  "grade": 3.2,
  "percentage": 55,
  "criteria_scores": {
    "nombre_criterio_exacto": {
      "score": 3.0,
      "level": "Básico",
      "justification": "La respuesta menciona X pero no cumple Y requerido en el nivel Alto porque..."
    }
  },
  "feedback": "# Retroalimentación\\n\\n## Fortalezas\\n...\\n\\n## Aspectos a mejorar\\n...\\n\\n## Recomendaciones\\n..."
}

En criteria_scores usa el nombre EXACTO del criterio como clave.`,
    },
  ];

  const content = await callGroq(apiKey, messages, true);
  const parsed = JSON.parse(content);

  const criteriaScores = parsed.criteria_scores as Record<string, { score: number; level: string; justification: string }>;
  const scores = Object.values(criteriaScores).map((c) => c.score);
  const avgGrade = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : parsed.grade;
  const percentage = Math.round(((avgGrade - 1) / 4) * 100);

  return {
    grade: avgGrade,
    percentage: Math.max(0, Math.min(100, percentage)),
    feedback: parsed.feedback,
    criteria_scores: criteriaScores,
  };
}
