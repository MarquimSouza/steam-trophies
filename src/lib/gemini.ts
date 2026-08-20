type GuideRequest = {
  gameName: string
  achievementName: string
  achievementDescription: string
}

export async function generateAchievementGuide({
  gameName,
  achievementName,
  achievementDescription,
}: GuideRequest): Promise<{ text: string }> {
  const apiKey = process.env.GEMINI_API_KEY

  const prompt = `Você é um assistente especializado em guias de conquistas de jogos. 
Pesquise na web (incluindo Reddit, fóruns e guias de jogos) e escreva um guia curto e prático, em português, de como desbloquear esta conquista:

Jogo: ${gameName}
Conquista: ${achievementName}
Descrição oficial: ${achievementDescription}

Responda em no máximo 5-6 frases, direto ao ponto, com passos práticos. Não invente informação que não encontrar nas fontes.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    }
  )

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Erro na API do Gemini: ${errBody}`)
  }

  const data = await res.json()
  const text =
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
    "Não foi possível gerar um guia para esta conquista."

  return { text }
}