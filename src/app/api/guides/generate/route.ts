import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { generateAchievementGuide } from "@/lib/gemini"
import { searchAchievementGuide } from "@/lib/tavily"
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { appid, apiname, gameName, achievementName, achievementDescription } = body

  console.log("=== Iniciando geração de guia ===")
  console.log("appid:", appid, "apiname:", apiname)

  if (!appid || !apiname || !gameName || !achievementName) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  const { data: existing, error: selectError } = await supabase
    .from("achievement_guides")
    .select("guide_text")
    .eq("appid", String(appid))
    .eq("apiname", apiname)
    .maybeSingle()

  if (selectError) {
    console.log("ERRO NO SUPABASE (select):", selectError.message)
  }

  if (existing) {
    console.log("Guia já existia no cache")
    return NextResponse.json({ guideText: existing.guide_text, cached: true })
  }

  try {
    console.log("Buscando na web com Tavily...")
    const searchContext = await searchAchievementGuide(
      `${gameName} "${achievementName}" achievement guide how to unlock`
    )
    console.log("Tavily retornou resultados")

    console.log("Chamando Gemini para sintetizar...")
    const { text } = await generateAchievementGuide({
      gameName,
      achievementName,
      achievementDescription: achievementDescription ?? "",
      searchContext,
    })
    console.log("Gemini respondeu com sucesso")

    const { error: insertError } = await supabase.from("achievement_guides").insert({
      appid: String(appid),
      apiname,
      game_name: gameName,
      achievement_name: achievementName,
      guide_text: text,
    })

    if (insertError) {
      console.log("ERRO NO SUPABASE (insert):", insertError.message)
    }

    return NextResponse.json({ guideText: text, cached: false })
  } catch (err: any) {
    console.log("ERRO:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}