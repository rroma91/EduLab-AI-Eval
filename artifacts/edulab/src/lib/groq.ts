export interface RubricCriteriaAI {
  name: string;
  superior_desc: string;
  alto_desc: string;
  basico_desc: string;
  bajo_desc: string;
  weight: number;
}

export interface EvaluationResult {
  grade: number;
  percentage: number;
  feedback: string;
  criteria_scores: Record<string, { score: number; justification: string }>;
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
      temperature: 0.3,
      max_tokens: 3000,
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
- Superior (4.6 - 5.0): Desempeño sobresaliente
- Alto (4.0 - 4.5): Buen desempeño
- Básico (3.0 - 3.9): Desempeño mínimo aceptable
- Bajo (1.0 - 2.9): Desempeño deficiente

Responde con este JSON exacto:
{
  "criteria": [
    {
      "name": "nombre del criterio",
      "superior_desc": "descripción nivel superior",
      "alto_desc": "descripción nivel alto",
      "basico_desc": "descripción nivel básico",
      "bajo_desc": "descripción nivel bajo",
      "weight": 25
    }
  ]
}

Los pesos deben sumar 100. Escribe en español.`,
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
    weight: number;
  }>,
  apiKey: string
): Promise<EvaluationResult> {
  const answersText = questions
    .map((q, i) => {
      const answer = answers[`q_${i}`] ?? answers[i] ?? "Sin respuesta";
      return `Pregunta ${i + 1}: ${q.text}\nRespuesta: ${Array.isArray(answer) ? answer.join(", ") : answer}`;
    })
    .join("\n\n");

  const rubricText = rubricCriteria
    .map(
      (c) =>
        `Criterio: ${c.name} (Peso: ${c.weight}%)
- Superior (4.6-5.0): ${c.superior_desc}
- Alto (4.0-4.5): ${c.alto_desc}
- Básico (3.0-3.9): ${c.basico_desc}
- Bajo (1.0-2.9): ${c.bajo_desc}`
    )
    .join("\n\n");

  const messages = [
    {
      role: "system",
      content: `Actúa como un docente experto. Evalúa las respuestas del estudiante comparándolas con la descripción de cada nivel de la rúbrica proporcionada. Asigna un puntaje numérico de 1.0 a 5.0. La retroalimentación debe ser motivadora, constructiva y estar escrita en formato Markdown. Responde SIEMPRE en JSON válido.`,
    },
    {
      role: "user",
      content: `Evalúa la entrega del estudiante "${studentName}" para la actividad "${activityName}".

## Descripción de la actividad
${activityDescription}

## Respuestas del estudiante
${answersText}

## Rúbrica de evaluación
${rubricText}

Responde con este JSON exacto:
{
  "grade": 4.2,
  "percentage": 84,
  "criteria_scores": {
    "nombre_criterio": {
      "score": 4.2,
      "justification": "justificación breve"
    }
  },
  "feedback": "# Retroalimentación\\n\\n## Lo que hizo bien\\n...\\n\\n## Lo que debe mejorar\\n...\\n\\n## Recomendaciones\\n..."
}

La nota (grade) debe ser de 1.0 a 5.0, el porcentaje de 0 a 100. El feedback debe ser motivador y en Markdown.`,
    },
  ];

  const content = await callGroq(apiKey, messages, true);
  const parsed = JSON.parse(content);
  return parsed as EvaluationResult;
}
