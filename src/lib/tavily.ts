export async function searchAchievementGuide(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 4,
      include_answer: false,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Erro na API do Tavily: ${errBody}`)
  }

  const data = await res.json()

  const combined = (data.results ?? [])
    .map((r: any) => `Fonte: ${r.url}\n${r.content}`)
    .join("\n\n---\n\n")

  return combined || "Nenhum resultado encontrado."
}