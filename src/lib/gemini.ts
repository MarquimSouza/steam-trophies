type GuideRequest = {
  gameName: string
  achievementName: string
  achievementDescription: string
  searchContext: string
}

export async function generateAchievementGuide({
  gameName,
  achievementName,
  achievementDescription,
  searchContext,
}: GuideRequest): Promise<{ text: string }> {
  const apiKey = process.env.GEMINI_API_KEY

  const prompt = `Você é um assistente especializado em guias de conquistas de jogos.
Abaixo estão trechos de páginas da web pesquisadas sobre esta conquista. Use SOMENTE essas informações (não invente nada que não esteja nelas) para escrever um guia curto e prático, em português, de como desbloquear:

Jogo: ${gameName}
Conquista: ${achievementName}
Descrição oficial: ${achievementDescription}

--- CONTEÚDO PESQUISADO NA WEB ---
${searchContext}
--- FIM DO CONTEÚDO ---

Responda em no máximo 5-6 frases, direto ao ponto, com passos práticos. Se o conteúdo pesquisado não for suficiente pra responder com confiança, diga isso claramente em vez de inventar.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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