"use client"
import { signIn, signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"

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

  if (session) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>Logado como {session.user?.name}</p>
        <button onClick={() => signOut()}>Sair</button>
        <h2 style={{ marginTop: "1.5rem" }}>Sua biblioteca</h2>
        {loading && <p>Carregando jogos...</p>}
        <ul>
          {games.map((game) => (
            <li key={game.appid}>{game.name}</li>
          ))}
        </ul>
      </main>
    )
  }

  return (
    <main style={{ padding: "2rem" }}>
      <button onClick={() => signIn("steam")}>Entrar com Steam</button>
    </main>
  )
}