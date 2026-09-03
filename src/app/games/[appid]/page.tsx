"use client"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { achievementGuides } from "@/data/guides"
import { getRarityTier } from "@/lib/rarity"
import { ThemeToggle } from "@/components/ThemeToggle"

type GuideData = { text: string; videoUrl: string | null }

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

  const [savedGuides, setSavedGuides] = useState<Record<string, GuideData>>({})
  const [dynamicGuides, setDynamicGuides] = useState<Record<string, GuideData>>({})
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [generateErrors, setGenerateErrors] = useState<Record<string, string>>({})

  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

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

      setDynamicGuides((prev) => ({
        ...prev,
        [a.apiname]: { text: json.guideText, videoUrl: json.videoUrl },
      }))
    } catch (err: any) {
      setGenerateErrors((prev) => ({ ...prev, [a.apiname]: err.message }))
    } finally {
      setGenerating((prev) => ({ ...prev, [a.apiname]: false }))
    }
  }

  const visibleAchievements = useMemo(() => {
    if (!data) return []

    const query = search.trim().toLowerCase()
    const filtered = query
      ? data.achievements.filter(
          (a) =>
            a.name.toLowerCase().includes(query) ||
            a.description.toLowerCase().includes(query)
        )
      : data.achievements

    const pending = filtered.filter((a) => !a.unlocked)
    const unlocked = filtered.filter((a) => a.unlocked)

    return [...pending, ...unlocked]
  }, [data, search])

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
    <main className="min-h-screen">
      <div className="sticky top-0 z-10 bg-[var(--bg-base)]/95 backdrop-blur border-b border-[var(--border-subtle)]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1"
          >
            ← Voltar à biblioteca
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold">{data.gameName}</h1>
        <div className="flex items-center gap-3 mt-2 mb-6">
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

        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar conquista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--gold)]"
          />
          <div className="flex bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm ${viewMode === "list" ? "bg-[var(--bg-surface-hover)] text-[var(--gold)]" : "text-[var(--text-secondary)]"}`}
              aria-label="Ver em lista"
            >
              ☰
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 text-sm ${viewMode === "grid" ? "bg-[var(--bg-surface-hover)] text-[var(--gold)]" : "text-[var(--text-secondary)]"}`}
              aria-label="Ver em grade"
            >
              ▦
            </button>
          </div>
        </div>

        {visibleAchievements.length === 0 && (
          <p className="text-[var(--text-secondary)] text-sm">
            Nenhuma conquista encontrada para "{search}".
          </p>
        )}

        <ul
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
              : "flex flex-col gap-3"
          }
        >
          {visibleAchievements.map((a) => {
            const staticGuideText = staticGuides[a.apiname]
            const isStatic = !!staticGuideText
            const guide: GuideData | undefined = isStatic
              ? { text: staticGuideText, videoUrl: null }
              : savedGuides[a.apiname] ?? dynamicGuides[a.apiname]

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
                    💡 <strong>Dica:</strong> {guide.text}
                    {guide.videoUrl && (
                      <div className="mt-2">
                        <a 
                          href={guide.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--gold)] hover:underline text-sm inline-flex items-center gap-1"
                        >
                          ▶ Ver vídeo no YouTube
                        </a>
                      </div>
                    )}

                    {/* Botão de regenerar comentado — era só para testes iniciais
                    {!isStatic && (
                      <div className="mt-2">
                        <button
                          onClick={() => handleRegenerateGuide(a)}
                          disabled={isGenerating}
                          className="text-xs text-[var(--text-secondary)] hover:text-[var(--gold)] disabled:opacity-50 transition-colors"
                        >
                          {isGenerating ? "Regenerando..." : "🔄 Regenerar dica"}
                        </button>
                      </div>
                    )}
                    */}
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
      </div>
    </main>
  )
}