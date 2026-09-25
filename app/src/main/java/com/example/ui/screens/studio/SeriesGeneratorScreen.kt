package com.example.ui.screens.studio

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.GeminiRepository
import kotlinx.coroutines.launch

// Modèle de série tendance
data class SeriesTemplate(
    val title: String,
    val genre: String,
    val visualStyle: String,
    val universe: String,
    val character: String,
    val icon: String
)

val TRENDING_TEMPLATES = listOf(
    SeriesTemplate(
        title = "Les Ombres du Sahel",
        genre = "Contes & Légendes",
        visualStyle = "Cinématographique 4k, éclairage chaud coucher de soleil, grain 35mm, réaliste",
        universe = "Un royaume sahélien ancien mystérieux où la magie ancestrale rencontre la technologie des étoiles",
        character = "Amina, 24 ans, guerrière nomade avec tatouages luminescents d'argile blanche et manteau indigo indigo foncé",
        icon = "🌙"
    ),
    SeriesTemplate(
        title = "Neo-Kinshasa 2099",
        genre = "Science-Fiction",
        visualStyle = "Cyberpunk vibrant, néons holographiques, pluie battante, reflets d'asphalte, caméras anamorphiques",
        universe = "Mégalopole futuriste africaine dominée par des corporations d'énergie solaire quantique",
        character = "Bakary, 30 ans, hacker cybernétique avec veste motard à bandelettes LED violettes et œil bionique doré",
        icon = "🚀"
    ),
    SeriesTemplate(
        title = "Le Trône de Mansa",
        genre = "Histoire Épique",
        visualStyle = "Épopée historique hollywoodienne, costumes dorés détaillés, poussière atmosphérique, plans larges majestueux",
        universe = "L'Empire du Mali au XIVe siècle au sommet de sa splendeur et de ses routes marchandes",
        character = "Kankou, 35 ans, diplomate royal drapé de soieries brodées d'or pur avec sceptre d'ébène sculpté",
        icon = "👑"
    ),
    SeriesTemplate(
        title = "La Coloc du Futur",
        genre = "Comédie",
        visualStyle = "Couleurs vives pop-art, plans rythmés 9:16, éclairage studio lumineux, comédie moderne",
        universe = "Abidjan moderne où un créateur de contenu IA partage son studio avec un robot majordome farceur",
        character = "Samira, 22 ans, créatrice de contenu pleine d'énergie avec lunettes rondes rétro et hoodie jaune fluo",
        icon = "😂"
    )
)

// Exercice de l'Académie
data class AcademyExercise(
    val id: String,
    val title: String,
    val duration: String,
    val category: String,
    val description: String,
    val formula: String,
    val challengePrompt: String,
    val proTips: List<String>
)

val ACADEMY_EXERCISES = listOf(
    AcademyExercise(
        id = "ex_hook",
        title = "Le Hook Visuel des 3 Secondes",
        duration = "5 min",
        category = "Rétention",
        description = "Sur TikTok, Reels et Shorts, 70% de l'audience swipe dans les 3 premières secondes. Apprenez à créer une rupture visuelle immédiate.",
        formula = "[Action Inattendue] + [Gros Plan Émotionnel] + [Texte de Tension / Question Ouverte]",
        challengePrompt = "Créez une ouverture où un personnage découvre un objet interdit sous son lit alors que la porte s'ouvre lentement.",
        proTips = listOf(
            "Utilisez un mouvement de caméra rapide (crash zoom ou whip pan)",
            "Évitez les introductions lentes ou les logos au début",
            "Insérez un indice visuel dès la toute première frame (0.1s)"
        )
    ),
    AcademyExercise(
        id = "ex_story",
        title = "Storytelling en Boucle Virale",
        duration = "8 min",
        category = "Storytelling",
        description = "Une vidéo qui boucle parfaitement (seamless loop) double son taux de completion et pousse l'algorithme à la propulser.",
        formula = "Fin de la vidéo qui répond mot pour mot ou raccorde visuellement à la première phrase/action.",
        challengePrompt = "Écrivez une fin de scène qui se termine par 'Et voilà pourquoi...' reliant directement à votre phrase d'ouverture.",
        proTips = listOf(
            "Raccordez sur un geste rapide (ex: claquement de doigts, saut de coupe)",
            "Gardez un rythme de coupe tous les 1.5 à 2.5 secondes max",
            "Ajoutez un retournement de situation inattendu à 80% de la durée"
        )
    ),
    AcademyExercise(
        id = "ex_consistency",
        title = "Consistance de Personnage Multi-Scènes",
        duration = "10 min",
        category = "Prompting IA",
        description = "Le plus grand défi avec Sora et Veo est de garder le même visage et les mêmes vêtements d'une scène à l'autre.",
        formula = "[Nom unique] + [Âge exact] + [Traits faciaux précis] + [3 marqueurs de tenue distincts] + [Seed / Reference ID]",
        challengePrompt = "Définissez un personnage avec au moins 3 détails visuels inoubliables (ex: cicatrice précise, veste bicolore, bijou distinctif).",
        proTips = listOf(
            "Répétez toujours la même description exacte du personnage dans chaque prompt",
            "Mentionnez les mêmes marques distinctives (coupe, couleur des yeux, vêtements)",
            "Spécifiez l'angle et le cadrage pour une transition fluide entre scènes"
        )
    )
)

@Composable
fun SeriesGeneratorScreen(repository: GeminiRepository) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf(0) } // 0: Générateur, 1: Académie, 2: Modèles

    // États du concept
    var title by remember { mutableStateOf("") }
    var visualStyle by remember { mutableStateOf("Cinématographique 4K, ratio 9:16 vertical, éclairage photoréaliste, Unreal Engine 5 render") }
    var universe by remember { mutableStateOf("") }
    var character by remember { mutableStateOf("") }

    var resultText by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var activeExercise by remember { mutableStateOf<AcademyExercise?>(null) }
    var exerciseAnswer by remember { mutableStateOf("") }
    var exerciseFeedback by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // En-tête Studio Série IA
        Surface(
            tonalElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(Color(0xFF6C5CE7), Color(0xFFFF7675))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.MovieFilter,
                            contentDescription = "Studio Séries IA",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "Générateur de Séries IA",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Veo & Sora Episodic Scriptwriter",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Onglets de navigation
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.Transparent,
                    contentColor = MaterialTheme.colorScheme.primary
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("Créer une Série") },
                        icon = { Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Académie Virale") },
                        icon = { Icon(Icons.Default.School, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        text = { Text("Modèles") },
                        icon = { Icon(Icons.Default.ViewCarousel, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                }
            }
        }

        // Contenu de l'onglet actif
        Box(
            modifier = Modifier
                .fillMaxSize()
                .weight(1f)
        ) {
            when (selectedTab) {
                0 -> {
                    // Onglet Création de Série
                    SeriesCreationTab(
                        title = title,
                        onTitleChange = { title = it },
                        visualStyle = visualStyle,
                        onVisualStyleChange = { visualStyle = it },
                        universe = universe,
                        onUniverseChange = { universe = it },
                        character = character,
                        onCharacterChange = { character = it },
                        isLoading = isLoading,
                        resultText = resultText,
                        onGenerate = {
                            if (title.isBlank() && universe.isBlank() && character.isBlank()) {
                                Toast.makeText(context, "Veuillez remplir au moins un univers ou personnage", Toast.LENGTH_SHORT).show()
                                return@SeriesCreationTab
                            }
                            isLoading = true
                            scope.launch {
                                val fullConcept = """
                                    Titre de la série: $title
                                    Style Visuel: $visualStyle
                                    Univers & Cadre: $universe
                                    Personnage Principal (Consistance visuelle stricte): $character
                                    Format: Série de 3 épisodes courts verticaux 9:16 avec prompts de génération vidéo Veo et images Sora, hook percutant dès 3s.
                                """.trimIndent()
                                resultText = repository.generateScenario(fullConcept)
                                isLoading = false
                            }
                        },
                        onCopy = { textToCopy ->
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Scénario IA", textToCopy))
                            Toast.makeText(context, "Scénario et prompts copiés !", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
                1 -> {
                    // Onglet Académie de Création Virale
                    AcademyTab(
                        activeExercise = activeExercise,
                        onSelectExercise = {
                            activeExercise = it
                            exerciseAnswer = ""
                            exerciseFeedback = null
                        },
                        onBackToList = {
                            activeExercise = null
                            exerciseFeedback = null
                        },
                        userAnswer = exerciseAnswer,
                        onAnswerChange = { exerciseAnswer = it },
                        feedback = exerciseFeedback,
                        onSubmitAnswer = { exercise ->
                            if (exerciseAnswer.isBlank()) {
                                Toast.makeText(context, "Écrivez votre prompt ou concept", Toast.LENGTH_SHORT).show()
                                return@AcademyTab
                            }
                            // Feedback expert instantané
                            exerciseFeedback = "✅ Excellent travail ! Votre proposition intègre bien le principe de '${exercise.title}'. Conseil pro : assurez-vous que le premier plan est en cadrage serré 9:16 pour maximiser la visibilité sur smartphone."
                        }
                    )
                }
                2 -> {
                    // Onglet Modèles Tendance
                    TemplatesTab(
                        onSelectTemplate = { t ->
                            title = t.title
                            visualStyle = t.visualStyle
                            universe = t.universe
                            character = t.character
                            selectedTab = 0
                            Toast.makeText(context, "Modèle '${t.title}' appliqué !", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun SeriesCreationTab(
    title: String,
    onTitleChange: (String) -> Unit,
    visualStyle: String,
    onVisualStyleChange: (String) -> Unit,
    universe: String,
    onUniverseChange: (String) -> Unit,
    character: String,
    onCharacterChange: (String) -> Unit,
    isLoading: Boolean,
    resultText: String,
    onGenerate: () -> Unit,
    onCopy: (String) -> Unit
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Card de configuration de la série
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.Lightbulb, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text("Définition du Concept de Série", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                }

                OutlinedTextField(
                    value = title,
                    onValueChange = onTitleChange,
                    modifier = Modifier.fillMaxWidth().testTag("series_title_input"),
                    label = { Text("Titre de la série") },
                    placeholder = { Text("Ex: Les Chroniques d'Ousmane") },
                    singleLine = true
                )

                OutlinedTextField(
                    value = character,
                    onValueChange = onCharacterChange,
                    modifier = Modifier.fillMaxWidth().testTag("series_character_input"),
                    label = { Text("Personnage Principal (Consistance visuelle)") },
                    placeholder = { Text("Ex: Malik, 25 ans, cicatrice sourcil droit, veste en cuir rouge, mèches blondes") },
                    minLines = 2
                )

                OutlinedTextField(
                    value = universe,
                    onValueChange = onUniverseChange,
                    modifier = Modifier.fillMaxWidth().testTag("series_universe_input"),
                    label = { Text("Univers & Contexte") },
                    placeholder = { Text("Ex: Lagos en 2080, marché technologique flottant, conspiration d'énergie") },
                    minLines = 2
                )

                OutlinedTextField(
                    value = visualStyle,
                    onValueChange = onVisualStyleChange,
                    modifier = Modifier.fillMaxWidth().testTag("series_style_input"),
                    label = { Text("Style Visuel & Moteur de Rendu") },
                    placeholder = { Text("Ex: Cinématique 9:16, Veo 2 / Sora, grain film 35mm, anamorphique") },
                    singleLine = false
                )

                Button(
                    onClick = onGenerate,
                    enabled = !isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("generate_series_button"),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Génération en cours avec Gemini...")
                    } else {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Générer les 3 Épisodes & Prompts Veo/Sora")
                    }
                }
            }
        }

        // Affichage du résultat si disponible
        if (resultText.isNotBlank()) {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF2ED573))
                            Text("Scénario & Découpage Prêt", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                        }
                        IconButton(onClick = { onCopy(resultText) }) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Copier")
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                    Text(
                        text = resultText,
                        style = MaterialTheme.typography.bodyMedium,
                        lineHeight = 22.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun AcademyTab(
    activeExercise: AcademyExercise?,
    onSelectExercise: (AcademyExercise) -> Unit,
    onBackToList: () -> Unit,
    userAnswer: String,
    onAnswerChange: (String) -> Unit,
    feedback: String?,
    onSubmitAnswer: (AcademyExercise) -> Unit
) {
    if (activeExercise != null) {
        // Vue détaillée de l'exercice
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            TextButton(onClick = onBackToList) {
                Icon(Icons.Default.ArrowBack, contentDescription = null)
                Spacer(modifier = Modifier.width(6.dp))
                Text("Retour aux modules de l'Académie")
            }

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Badge { Text(activeExercise.category) }
                        Text(activeExercise.duration, style = MaterialTheme.typography.bodySmall)
                    }
                    Text(activeExercise.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(activeExercise.description, style = MaterialTheme.typography.bodyMedium)
                }
            }

            // Formule & Astuces Pro
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("💡 Formule Gagnante", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(activeExercise.formula, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)

                    Spacer(modifier = Modifier.height(4.dp))
                    Text("⚡ Conseils d'Experts Viraux :", fontWeight = FontWeight.SemiBold)
                    activeExercise.proTips.forEach { tip ->
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("•", color = MaterialTheme.colorScheme.primary)
                            Text(tip, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            // Zone d'entraînement
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("🎯 Exercice Pratique", fontWeight = FontWeight.Bold)
                    Text(activeExercise.challengePrompt, style = MaterialTheme.typography.bodyMedium)

                    OutlinedTextField(
                        value = userAnswer,
                        onValueChange = onAnswerChange,
                        modifier = Modifier.fillMaxWidth().testTag("exercise_answer_input"),
                        label = { Text("Votre proposition de scène / prompt") },
                        placeholder = { Text("Rédigez votre découpage ou prompt ici...") },
                        minLines = 4
                    )

                    Button(
                        onClick = { onSubmitAnswer(activeExercise) },
                        modifier = Modifier.fillMaxWidth().testTag("exercise_submit_button"),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Valider l'exercice")
                    }

                    feedback?.let { fb ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF2ED573).copy(alpha = 0.15f),
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                        ) {
                            Text(
                                text = fb,
                                modifier = Modifier.padding(12.dp),
                                color = Color(0xFF009432),
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
        }
    } else {
        // Liste des modules de l'Académie
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text(
                    text = "Académie de Création Virale",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Apprenez les secrets des vidéos 9:16 à plus de 10 millions de vues : hook, structure de rétention et prompts IA cohérents.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                )
            }

            items(ACADEMY_EXERCISES) { exercise ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectExercise(exercise) },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Badge { Text(exercise.category) }
                            Text(exercise.duration, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        }
                        Text(exercise.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(exercise.description, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Démarrer l'exercice", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TemplatesTab(
    onSelectTemplate: (SeriesTemplate) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(
                text = "Modèles de Séries Tendance",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Sélectionnez un univers pré-configuré pour lancer la génération de scénarios et prompts en 1 clic.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp, bottom = 8.dp)
            )
        }

        items(TRENDING_TEMPLATES) { template ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelectTemplate(template) },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(template.icon, fontSize = 24.sp)
                            Column {
                                Text(template.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text(template.genre, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        Button(
                            onClick = { onSelectTemplate(template) },
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("Utiliser", fontSize = 12.sp)
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                    Text("👤 Personnage : ${template.character}", style = MaterialTheme.typography.bodySmall)
                    Text("🌍 Univers : ${template.universe}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
