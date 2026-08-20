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
  }, [appid])

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

  const gameGuides = achievementGuides[appid] ?? {}

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{data.gameName}</h1>
      <p>
        {data.unlockedCount} de {data.total} conquistas
      </p>

      <ul style={{ marginTop: "1.5rem", listStyle: "none", padding: 0 }}>
        {data.achievements.map((a) => {
          const guide = gameGuides[a.apiname]

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
            </li>
          )
        })}
      </ul>
    </main>
  )
}