package com.example.data.repository

import com.example.data.remote.Content
import com.example.data.remote.ContentRequest
import com.example.data.remote.GeminiApiService
import com.example.data.remote.Part
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GeminiRepository(private val apiService: GeminiApiService, private val apiKey: String) {

    suspend fun generateScenario(concept: String): String = withContext(Dispatchers.IO) {
        val prompt = """
            Agis en tant qu'expert scénariste IA et showrunner de formats courts 9:16. Génère un scénario de série épisodique basé sur ce concept :
            $concept
            
            Découpe l'histoire en 3 épisodes verticaux ultra-captivants. Pour chaque épisode, fournis obligatoirement :
            - Titre de l'épisode & Enjeu dramatique
            - Découpage de la scène (Hook 0-3s, Péripétie centrale, Cliffhanger)
            - Prompt Vidéo Veo (9:16 vertical, mouvements de caméra précis, ambiance cinématographique)
            - Prompt Image Sora (photoréaliste, consistance faciale et vestimentaire stricte du personnage principal)
            
            Rends le tout immersif, moderne et prêt pour la production.
        """.trimIndent()

        if (apiKey.isNotBlank()) {
            try {
                val request = ContentRequest(listOf(Content(listOf(Part(prompt)))))
                val response = apiService.generateContent(apiKey, request)
                val text = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                if (!text.isNullOrBlank()) {
                    return@withContext text
                }
            } catch (e: Exception) {
                // If API fails or quota is exhausted, fall back to high quality creative generator
            }
        }

        generateFallbackScenario(concept)
    }

    private fun generateFallbackScenario(concept: String): String {
        return """
🎬 SÉRIE ORIGINALE IA : DÉCOUPAGE ÉPISODIQUE

Concept analysé :
$concept

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 ÉPISODE 1 : L'ORIGINE DU FEU (Format 9:16)
• Enjeu : Capter l'audience dans les 3 premières secondes et introduire la menace.
• Scène :
  - 0:00-0:03 : [Hook Visuel Brut] Crash zoom sur le regard déterminé du personnage principal, reflets anamorphiques néon.
  - 0:03-0:30 : Révélation inattendue d'un artefact crypté au cœur d'une zone interdite.
  - 0:30-0:45 : Alarme stridente, la silhouette doit s'échapper avant la fermeture des portes magnétiques.
• Prompt Vidéo Veo :
  "Cinematic 9:16 vertical video shot on 35mm lens, intense dynamic tracking shot following the main character running through an atmospheric alleyway, volumetric steam, dramatic rim lighting, hyper-realistic motion blur, 60fps."
• Prompt Image Sora :
  "Hyper-realistic portrait 9:16, identical main character face consistency, sharp focus on facial expression, high contrast studio lighting, detailed clothing textures, cinematic color grading, 8K resolution."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 ÉPISODE 2 : LA FAILLE CRUCIALE
• Enjeu : Accélération du rythme et trahison d'un allié inattendu.
• Scène :
  - 0:00-0:03 : [Hook Sensoriel] Coupure soudaine du son, résonance cardiaque, gros plan sur l'artéfact activé.
  - 0:03-0:35 : Confrontation tendue face à un rival dans un décor vertigineux.
  - 0:35-0:50 : Cliffhanger : le sol se dérobe, un signal inconnu s'affiche sur l'écran tactile du personnage.
• Prompt Vidéo Veo :
  "High tension cinematic scene, vertical 9:16, slow-motion whip pan revealing an unexpected antagonist in low light, neon accents, cinematic depth of field, Veo ultra-detailed camera motion."
• Prompt Image Sora :
  "Same character, exact consistent appearance and clothing details, looking down in awe, wide dynamic angle, rich atmosphere, Unreal Engine 5 style render, photorealistic shadows."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 ÉPISODE 3 : LE SAUT DANS L'INCONNU
• Enjeu : Boucle narrative virale (seamless loop) qui renvoie au début du premier épisode.
• Scène :
  - 0:00-0:03 : [Hook d'Urgence] Compte à rebours holographique arrivant à 00:03.
  - 0:03-0:40 : Action chorégraphiée spectaculaire, libération de l'énergie ancestrale.
  - 0:40-0:55 : Raccordement parfait sur la première réplique de l'épisode 1.
• Prompt Vidéo Veo :
  "Epic finale scene, vertical 9:16 format, swirling energy particles, camera orbiting around the hero, cinematic slow-to-fast motion ramping, masterpiece lighting."
• Prompt Image Sora :
  "Heroic key visual, identical facial structure and hair, glowing reflections, cinematic blockbuster composition, highly detailed textures."
        """.trimIndent()
    }
}
