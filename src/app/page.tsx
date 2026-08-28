"use client"
import { signIn, signOut, useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type Game = {
  appid: number
  name: string
  playtime_forever: number
}

export default function Home() {
  const { data: session } = useSession()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    if (session) {
      setLoading(true)
      fetch("/api/steam/games")
        .then((res) => res.json())
        .then((data) => setGames(data))
        .finally(() => setLoading(false))
    }
  }, [session])

  const visibleGames = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return games
    return games.filter((g) => g.name.toLowerCase().includes(query))
  }, [games, search])

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            Steam Trophies
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Veja o que falta pra platinar seus jogos, e como fazer isso.
          </p>
        </div>
        <button
          onClick={() => signIn("steam")}
          className="bg-[#1b2838] hover:bg-[#2a3f5a] transition-colors text-white px-6 py-3 rounded-lg font-medium"
        >
          Entrar com Steam
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gold)]">Steam Trophies</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Logado como {session.user?.name}
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Sair
        </button>
      </header>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Sua biblioteca
        </h2>
        <span className="text-xs text-[var(--text-secondary)] font-mono">
          {visibleGames.length} jogos
        </span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar jogo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--gold)]"
        />
        <div className="flex bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2 text-sm ${viewMode === "grid" ? "bg-[var(--bg-surface-hover)] text-[var(--gold)]" : "text-[var(--text-secondary)]"}`}
            aria-label="Ver em grade"
          >
            ▦
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2 text-sm ${viewMode === "list" ? "bg-[var(--bg-surface-hover)] text-[var(--gold)]" : "text-[var(--text-secondary)]"}`}
            aria-label="Ver em lista"
          >
            ☰
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-[var(--text-secondary)]">Carregando jogos...</p>
      )}

      {!loading && visibleGames.length === 0 && (
        <p className="text-[var(--text-secondary)] text-sm">
          Nenhum jogo encontrado para "{search}".
        </p>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visibleGames.map((game) => (
            <Link
              key={game.appid}
              href={`/games/${game.appid}`}
              className="group bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-colors rounded-lg overflow-hidden border border-[var(--border-subtle)] flex flex-col"
            >
              <div className="aspect-[2/3] bg-[var(--bg-base)] overflow-hidden">
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium line-clamp-2">{game.name}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleGames.map((game) => (
            <li key={game.appid}>
              <Link
                href={`/games/${game.appid}`}
                className="flex items-center justify-between bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-colors rounded-lg px-4 py-3 border border-[var(--border-subtle)]"
              >
                <span className="font-medium">{game.name}</span>
                <span className="text-[var(--text-secondary)]">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}