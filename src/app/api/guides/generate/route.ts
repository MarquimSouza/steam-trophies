import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { generateAchievementGuide } from "@/lib/gemini"
import { searchAchievementGuide, searchYoutubeVideo } from "@/lib/tavily"
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { appid, apiname, gameName, achievementName, achievementDescription } = body

  if (!appid || !apiname || !gameName || !achievementName) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from("achievement_guides")
    .select("guide_text, video_url")
    .eq("appid", String(appid))
    .eq("apiname", apiname)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      guideText: existing.guide_text,
      videoUrl: existing.video_url,
      cached: true,
    })
  }

  try {
    const description = achievementDescription ?? ""

    const searchQuery = description
      ? `how to ${achievementName}: ${description} - ${gameName} achievement guide`
      : `how to unlock ${achievementName} - ${gameName} achievement guide`

    // Query de vídeo mais simples e direta — funciona melhor pra achar resultado no YouTube
    const videoQuery = `${gameName} ${achievementName} achievement`

    console.log("Query de vídeo:", videoQuery)

    const [searchContext, videoUrl] = await Promise.all([
      searchAchievementGuide(searchQuery),
      searchYoutubeVideo(videoQuery),
    ])

    console.log("Vídeo encontrado:", videoUrl)

    const { text } = await generateAchievementGuide({
      gameName,
      achievementName,
      achievementDescription: description,
      searchContext,
    })

    await supabase.from("achievement_guides").insert({
      appid: String(appid),
      apiname,
      game_name: gameName,
      achievement_name: achievementName,
      guide_text: text,
      video_url: videoUrl,
    })

    return NextResponse.json({ guideText: text, videoUrl, cached: false })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}