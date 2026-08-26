"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { achievementGuides } from "@/data/guides"

type Achievement = {
  apiname: string
  name: string
  description: string
  unlocked: boolean
  unlockTime: number
  globalPercent: number | null
}

type AchievementsResponse = {
  gameName: string
  total: number
  unlockedCount: number
  achievements: Achievement[]
}

export default function GameAchievementsPage() {
  const params = useParams()
  const appid = params.appid as string
  const [data, setData] = useState<AchievementsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Guias já salvos no Supabase, buscados ao carregar a página
  const [savedGuides, setSavedGuides] = useState<Record<string, string>>({})
  // Guias gerados nesta sessão (recém-criados, ainda não recarregados do banco)
  const [dynamicGuides, setDynamicGuides] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [generateErrors, setGenerateErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setLoading(true)
    fetch(`/api/steam/achievements/${appid}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error ?? "Erro desconhecido")
        }
        setData(json)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    // Busca em paralelo os guias já salvos no banco pra esse jogo
    fetch(`/api/guides?appid=${appid}`)
      .then((res) => res.json())
      .then((json) => setSavedGuides(json))
      .catch(() => {
        // Se falhar, não é crítico — só não mostra os guias já salvos de cara
        setSavedGuides({})
      })
  }, [appid])

  async function handleGenerateGuide(a: Achievement) {
    setGenerating((prev) => ({ ...prev, [a.apiname]: true }))
    setGenerateErrors((prev) => ({ ...prev, [a.apiname]: "" }))

    try {
      const res = await fetch("/api/guides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appid,
          apiname: a.apiname,
          gameName: data?.gameName,
          achievementName: a.name,
          achievementDescription: a.description,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao gerar guia")
      }

      setDynamicGuides((prev) => ({ ...prev, [a.apiname]: json.guideText }))
    } catch (err: any) {
      setGenerateErrors((prev) => ({ ...prev, [a.apiname]: err.message }))
    } finally {
      setGenerating((prev) => ({ ...prev, [a.apiname]: false }))
    }
  }

  if (loading) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>Carregando conquistas...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>Erro: {error}</p>
      </main>
    )
  }

  if (!data) return null

  const staticGuides = achievementGuides[appid] ?? {}

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{data.gameName}</h1>
      <p>
        {data.unlockedCount} de {data.total} conquistas
      </p>

      <ul style={{ marginTop: "1.5rem", listStyle: "none", padding: 0 }}>
        {data.achievements.map((a) => {
          // Prioridade: guia curado manualmente > já salvo no banco > gerado nesta sessão
          const guide =
            staticGuides[a.apiname] ?? savedGuides[a.apiname] ?? dynamicGuides[a.apiname]
          const isGenerating = generating[a.apiname]
          const generateError = generateErrors[a.apiname]

          return (
            <li
              key={a.apiname}
              style={{
                marginBottom: "1rem",
                opacity: a.unlocked ? 0.6 : 1,
                borderBottom: "1px solid #333",
                paddingBottom: "0.75rem",
              }}
            >
              <strong>
                {a.name} {a.unlocked ? "✅" : ""}
              </strong>
              <br />
              <span style={{ fontSize: "0.9rem", color: "#888" }}>
                {a.description}
              </span>
              <br />
              {a.globalPercent !== null && (
                <span style={{ fontSize: "0.8rem" }}>
                  {a.globalPercent.toFixed(1)}% dos jogadores desbloquearam
                </span>
              )}

              {!a.unlocked && guide && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.75rem",
                    background: "#1a1a1a",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    lineHeight: "1.4",
                  }}
                >
                  💡 <strong>Dica:</strong> {guide}
                </div>
              )}

              {!a.unlocked && !guide && (
                <div style={{ marginTop: "0.5rem" }}>
                  <button
                    onClick={() => handleGenerateGuide(a)}
                    disabled={isGenerating}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {isGenerating ? "Gerando dica com IA..." : "🔍 Gerar dica"}
                  </button>
                  {generateError && (
                    <p style={{ color: "salmon", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                      Erro: {generateError}
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </main>
  )
}