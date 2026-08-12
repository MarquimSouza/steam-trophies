"use client"
import { signIn, signOut, useSession } from "next-auth/react"

export default function Home() {
  const { data: session } = useSession()

  if (session) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>Logado como {session.user?.name}</p>
        <button onClick={() => signOut()}>Sair</button>
      </main>
    )
  }

  return (
    <main style={{ padding: "2rem" }}>
      <button onClick={() => signIn("steam")}>Entrar com Steam</button>
    </main>
  )
}