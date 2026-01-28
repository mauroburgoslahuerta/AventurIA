export default async function handler(req, res) {
    // CORS Handling
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Missing GEMINI_API_KEY in server environment");
        return res.status(500).json({ error: 'Internal Server Error: API Key missing' });
    }

    const { config } = req.body;

    if (!config || !config.topic || !config.audience) {
        return res.status(400).json({ error: 'Missing configuration' });
    }

    try {
        const prompt = `Actúa como un diseñador instruccional experto y profesor. Crea una aventura educativa (quiz game) de ${config.count} preguntas sobre el tema "${config.topic}" adaptada específicamente para la audiencia: "${config.audience}".
  
  Requisitos Pedagógicos:
  1. Adapta el vocabulario y la complejidad a la audiencia ("${config.audience}"), pero mantén un tono natural y fluido, sin ser excesivamente formal.
  2. Las preguntas deben ser educativas y curiosas.
  3. Asegura que los datos sean correctos.
  4. Dificultad seleccionada: ${config.difficulty}. Define la complejidad así:
     - FÁCIL: Nivel "Recordar/Comprender" (Taxonomía de Bloom). Preguntas directas, conceptos básicos, opciones incorrectas obvias.
     - MEDIO: Nivel "Aplicar/Analizar". Requiere relacionar conceptos. Las opciones incorrectas son plausibles ("distractores").
     - DIFÍCIL: Nivel "Evaluar/Crear". Requiere pensamiento lateral, excepciones a la regla o análisis de casos complejos. Muy desafiante.

  Requisitos de Seguridad y Adaptación Visual:
  1. CORRECCIÓN INTELIGENTE: Si el tema o la audiencia tienen erratas o abreviaturas (ej: "Dinasaurios" -> "Dinosaurios", "3 pim" -> "3º Primaria"), CORRÍGELAS silenciosamente e interpreta la intención correcta.
  2. FILTRO ÉTICO (CRÍTICO):
     - Temas FANTÁSTICOS/CREATIVOS (Zombies, Magia...): VÁLIDOS.
     - Temas INADECUADOS (Violencia, insultos, explícito...): NO uses el bloqueo estándar. REFORMULA el tema hacia una vertiente educativa estricta (ej: "Violencia" -> "Resolución de Conflictos y Paz", "Robar" -> "Ética y Leyes", "Drogas" -> "Salud y Neurociencia"). ¡Dale la vuelta educativa!
  3. "visualPrompt": Debe describir una imagen para generar con IA.
     - IMPORTANTE: Define un ESTILO VISUAL adecuado para la audiencia (ej: "ilustración vectorial colorida estilo Pixar" para niños, "fotorealismo cinemático" para adultos).
     - ANTI-SPOILER (CRÍTICO): Si la pregunta requiere identificar algo, describe un PAISAJE o ESCENA GENÉRICA. 
     - PROHIBIDO: NO incluyas visualmente NINGUNA de las opciones de respuesta (ni correcta ni incorrectas). Por ejemplo, si las opciones son animales, NO dibujes ninguno de ellos. Dibuja su hábitat o comida.
     - Asegura que la descripción sea "Safe For Work" y amable.

  Estructura del Juego:
  Formato JSON estricto:
  {
    "correctedTopic": "Tema corregido y bien formateado (ej: 'Dinosaurios' si puso 'dinasaurios')",
    "correctedAudience": "Audiencia corregida y formal (ej: '3º Primaria' si puso '3 pim')",
    "questions": [
      {
        "id": 1,
        "question": "Pregunta...",
        "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "correctIndex": 0,
        "visualPrompt": "Descripción detallada de la imagen INCLUYENDO EL ESTILO VISUAL ADAPTADO...",
        "hint": "Una pista útil...",
        "explanation": "Explicación breve de la respuesta correcta..."
      }
    ]
  }

  CRITICAL TECHNICAL INSTRUCTION: Respond ONLY with valid, raw JSON. Do NOT use markdown code blocks (no \`\`\`json). Do NOT add conversational text before or after the JSON.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Referer': 'http://localhost:3000/'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("No content generated from Gemini");
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                data = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Invalid JSON returned: " + text.substring(0, 100));
            }
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message || 'Error generating content' });
    }
}
