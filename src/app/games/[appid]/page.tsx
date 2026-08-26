"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { achievementGuides } from "@/data/guides"
import { getRarityTier } from "@/lib/rarity"

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

  const [savedGuides, setSavedGuides] = useState<Record<string, string>>({})
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

    fetch(`/api/guides?appid=${appid}`)
      .then((res) => res.json())
      .then((json) => setSavedGuides(json))
      .catch(() => setSavedGuides({}))
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
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Carregando conquistas...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          ← Voltar à biblioteca
        </Link>
        <p className="mt-6 text-red-400">Erro: {error}</p>
      </main>
    )
  }

  if (!data) return null

  const staticGuides = achievementGuides[appid] ?? {}
  const progressPercent = Math.round((data.unlockedCount / data.total) * 100)

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link
        href="/"
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1 mb-6"
      >
        ← Voltar à biblioteca
      </Link>

      <h1 className="text-2xl font-bold">{data.gameName}</h1>
      <div className="flex items-center gap-3 mt-2 mb-8">
        <div className="flex-1 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--gold)] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-sm text-[var(--text-secondary)] font-mono whitespace-nowrap">
          {data.unlockedCount}/{data.total}
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {data.achievements.map((a) => {
          const guide =
            staticGuides[a.apiname] ?? savedGuides[a.apiname] ?? dynamicGuides[a.apiname]
          const isGenerating = generating[a.apiname]
          const generateError = generateErrors[a.apiname]
          const rarity = getRarityTier(a.globalPercent)

          return (
            <li
              key={a.apiname}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4"
              style={{
                borderLeft: `3px solid ${rarity.color}`,
                opacity: a.unlocked ? 0.55 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {a.name} {a.unlocked ? "✅" : ""}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                    {a.description}
                  </p>
                </div>
                {a.globalPercent !== null && (
                  <span
                    className="text-xs font-mono whitespace-nowrap px-2 py-1 rounded"
                    style={{ color: rarity.color, backgroundColor: `${rarity.color}1a` }}
                  >
                    {rarity.label} · {a.globalPercent.toFixed(1)}%
                  </span>
                )}
              </div>

              {!a.unlocked && guide && (
                <div className="mt-3 p-3 bg-[var(--bg-base)] rounded-md text-sm leading-relaxed">
                  💡 <strong>Dica:</strong> {guide}
                </div>
              )}

              {!a.unlocked && !guide && (
                <div className="mt-3">
                  <button
                    onClick={() => handleGenerateGuide(a)}
                    disabled={isGenerating}
                    className="text-sm bg-[var(--bg-surface-hover)] hover:bg-[#2a2e38] disabled:opacity-50 transition-colors px-3 py-1.5 rounded-md"
                  >
                    {isGenerating ? "Gerando dica com IA..." : "🔍 Gerar dica"}
                  </button>
                  {generateError && (
                    <p className="text-red-400 text-xs mt-1.5">Erro: {generateError}</p>
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