"use client"
import { signIn, signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
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

  useEffect(() => {
    if (session) {
      setLoading(true)
      fetch("/api/steam/games")
        .then((res) => res.json())
        .then((data) => setGames(data))
        .finally(() => setLoading(false))
    }
  }, [session])

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
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
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

      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
        Sua biblioteca
      </h2>

      {loading && (
        <p className="text-[var(--text-secondary)]">Carregando jogos...</p>
      )}

      <ul className="flex flex-col gap-2">
        {games.map((game) => (
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
    </main>
  )
}