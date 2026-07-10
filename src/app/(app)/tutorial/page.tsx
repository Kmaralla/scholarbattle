'use client'
import { useState } from 'react'
import { Subject } from '@/types'
import { cn } from '@/lib/utils'

const SUBJECTS: { id: Subject; label: string; emoji: string; color: string }[] = [
  { id: 'math',    label: 'Math',    emoji: '🔢', color: 'from-blue-500 to-indigo-500' },
  { id: 'science', label: 'Science', emoji: '🔬', color: 'from-green-500 to-teal-500' },
  { id: 'history', label: 'History', emoji: '📜', color: 'from-amber-500 to-orange-500' },
  { id: 'english', label: 'English', emoji: '📖', color: 'from-pink-500 to-rose-500' },
]

const GRADE_BANDS = [
  { label: 'Elementary', grades: [1, 2, 3, 4, 5], emoji: '🌱' },
  { label: 'Middle School', grades: [6, 7, 8], emoji: '📚' },
  { label: 'High School', grades: [9, 10, 11, 12], emoji: '🎓' },
]

interface Topic {
  title: string
  description: string
  tips: string[]
  videoId: string
  channel: string
}

const TUTORIALS: Record<Subject, Record<string, Topic[]>> = {
  math: {
    '1-5': [
      {
        title: 'Addition & Subtraction',
        description: 'The building blocks of all math. Learn to add and subtract confidently.',
        tips: ['Count on your fingers to start', 'Use a number line for help', 'Practice with real objects like coins'],
        videoId: 'xkTydMBZ_2w',
        channel: 'Khan Academy',
      },
      {
        title: 'Multiplication & Division',
        description: 'Times tables and division are the gateway to advanced math.',
        tips: ['Memorize your times tables up to 12', 'Division is just multiplication backwards', 'Try skip counting to learn multiples'],
        videoId: 'mvOkMYCygps',
        channel: 'Khan Academy',
      },
      {
        title: 'Fractions',
        description: 'Fractions represent parts of a whole. Pizza is your best friend here!',
        tips: ['Numerator = top (how many pieces you have)', 'Denominator = bottom (total pieces)', 'Same denominator = easy to add'],
        videoId: 'n0FZhQ_GkKw',
        channel: 'Math Antics',
      },
    ],
    '6-8': [
      {
        title: 'Pre-Algebra',
        description: 'Variables, expressions and equations — your first step into algebra.',
        tips: ['A variable is just an unknown number', 'Do the same thing to both sides of an equation', 'PEMDAS: Parentheses, Exponents, Multiply, Divide, Add, Subtract'],
        videoId: 'NybHckSEQBI',
        channel: 'Khan Academy',
      },
      {
        title: 'Ratios & Proportions',
        description: 'Compare quantities and solve real-world problems.',
        tips: ['A ratio is a comparison of two numbers', 'Cross-multiply to solve proportions', 'Percentages are ratios out of 100'],
        videoId: 'RQ2nYUBVvqI',
        channel: 'Math Antics',
      },
      {
        title: 'Geometry Basics',
        description: 'Shapes, angles, area and perimeter.',
        tips: ['Area = length × width for rectangles', 'Perimeter = add all sides', 'A triangle\'s angles always add to 180°'],
        videoId: 'IVYGMHJn3Ac',
        channel: 'Khan Academy',
      },
    ],
    '9-12': [
      {
        title: 'Algebra',
        description: 'Solving for x, graphing lines, and quadratic equations.',
        tips: ['Isolate the variable to solve', 'Slope = rise over run (y₂-y₁)/(x₂-x₁)', 'Quadratic formula: x = (-b ± √(b²-4ac)) / 2a'],
        videoId: 'MpZGes6V1QM',
        channel: '3Blue1Brown',
      },
      {
        title: 'Trigonometry',
        description: 'SOH-CAH-TOA and the unit circle.',
        tips: ['SOH: sin = opposite/hypotenuse', 'CAH: cos = adjacent/hypotenuse', 'TOA: tan = opposite/adjacent'],
        videoId: 'yBw67Fb31Cs',
        channel: 'Khan Academy',
      },
      {
        title: 'Statistics & Probability',
        description: 'Data analysis, averages, and chance.',
        tips: ['Mean = sum of all values ÷ count', 'Median = middle value when sorted', 'Mode = most frequent value'],
        videoId: 'uhxtUt_-GyM',
        channel: 'CrashCourse',
      },
    ],
  },
  science: {
    '1-5': [
      {
        title: 'Living Things',
        description: 'What makes something alive? Explore animals, plants, and ecosystems.',
        tips: ['Living things grow, reproduce, and respond to environment', 'Plants make food from sunlight (photosynthesis)', 'Food chains show who eats who'],
        videoId: 'QnQe0xW_JY4',
        channel: 'CrashCourse Kids',
      },
      {
        title: 'Matter & Energy',
        description: 'Everything around you is made of matter. Learn about solids, liquids, and gases.',
        tips: ['Matter has mass and takes up space', 'Solids have fixed shape, gases fill any container', 'Energy can be transferred but never destroyed'],
        videoId: '9HOw_0MSUKE',
        channel: 'CrashCourse Kids',
      },
      {
        title: 'Earth & Space',
        description: 'Our planet, weather, and the solar system.',
        tips: ['Earth has 4 layers: crust, mantle, outer core, inner core', 'Weather is short-term, climate is long-term', 'The sun is the center of our solar system'],
        videoId: 'R41iFZuFbmY',
        channel: 'CrashCourse Kids',
      },
    ],
    '6-8': [
      {
        title: 'Cell Biology',
        description: 'Cells are the basic unit of all life. Learn about plant and animal cells.',
        tips: ['Animal cells have no cell wall', 'Mitochondria = powerhouse of the cell', 'DNA carries genetic information in the nucleus'],
        videoId: 'URUJD5NEXC8',
        channel: 'CrashCourse',
      },
      {
        title: 'Forces & Motion',
        description: "Newton's laws explain how and why things move.",
        tips: ["Newton's 1st Law: objects stay at rest or in motion unless acted upon", 'F = ma (Force = mass × acceleration)', 'Every action has an equal and opposite reaction'],
        videoId: 'kKKM8Y-u7ds',
        channel: 'CrashCourse',
      },
      {
        title: 'The Periodic Table',
        description: 'Elements, atoms, and how they combine to make everything.',
        tips: ['Atomic number = number of protons', 'Elements in the same column have similar properties', 'Metals are on the left, non-metals on the right'],
        videoId: 'o7BTNiI4zNo',
        channel: 'Theodore Gray',
      },
    ],
    '9-12': [
      {
        title: 'Chemistry: Reactions',
        description: 'Balancing equations, acids & bases, and chemical bonds.',
        tips: ['Balance equations by adjusting coefficients, not subscripts', 'pH below 7 = acid, above 7 = base, 7 = neutral', 'Ionic bonds: metal + non-metal. Covalent: non-metal + non-metal'],
        videoId: 'bka20Q9TN6M',
        channel: 'CrashCourse',
      },
      {
        title: 'Physics: Energy & Waves',
        description: 'Kinetic/potential energy, waves, and electromagnetism.',
        tips: ['KE = ½mv² (kinetic energy)', 'PE = mgh (potential energy)', 'Waves transfer energy, not matter'],
        videoId: 'WKQeHiMkLkI',
        channel: 'CrashCourse',
      },
      {
        title: 'Genetics & Evolution',
        description: 'DNA, heredity, natural selection, and adaptation.',
        tips: ['Dominant alleles mask recessive ones', 'Use a Punnett square to predict offspring traits', 'Natural selection = survival of the fittest (most adapted)'],
        videoId: 'CBezq1fFUEA',
        channel: 'CrashCourse',
      },
    ],
  },
  history: {
    '1-5': [
      {
        title: 'Ancient Civilizations',
        description: 'Egypt, Greece, Rome — the empires that shaped the world.',
        tips: ['Egypt built pyramids as tombs for pharaohs', 'Ancient Greece invented democracy', 'Rome built a vast empire across Europe and Africa'],
        videoId: 'Yocja_N5s1I',
        channel: 'CrashCourse',
      },
      {
        title: 'World Explorers',
        description: "Columbus, Magellan, and the Age of Exploration.",
        tips: ['Columbus reached the Americas in 1492', 'Magellan led the first circumnavigation of Earth', 'Exploration brought new trade routes and cultural exchange'],
        videoId: 'mXqoA7-taBU',
        channel: 'CrashCourse',
      },
    ],
    '6-8': [
      {
        title: 'The American Revolution',
        description: 'How the 13 colonies broke free from British rule.',
        tips: ['The Declaration of Independence was signed in 1776', '"No taxation without representation" was a key complaint', 'George Washington led the Continental Army'],
        videoId: 'HlUiSBXQHCw',
        channel: 'CrashCourse',
      },
      {
        title: 'The Civil War',
        description: 'Slavery, states\' rights, and the war that divided America.',
        tips: ['The Civil War lasted from 1861 to 1865', 'Lincoln issued the Emancipation Proclamation in 1863', 'The Union (North) defeated the Confederacy (South)'],
        videoId: 'pkFEF-LtMPg',
        channel: 'CrashCourse',
      },
      {
        title: 'World War I',
        description: 'The war that changed the map of Europe forever.',
        tips: ['WWI started in 1914 after the assassination of Archduke Franz Ferdinand', 'Trench warfare defined the Western Front', 'The Treaty of Versailles ended the war in 1919'],
        videoId: 'Cd2ch4XV84s',
        channel: 'CrashCourse',
      },
    ],
    '9-12': [
      {
        title: 'World War II',
        description: 'The deadliest conflict in human history and its aftermath.',
        tips: ['WWII lasted from 1939 to 1945', 'The Holocaust killed 6 million Jewish people', 'The US entered after Pearl Harbor in 1941'],
        videoId: 'Q78COTwT7nE',
        channel: 'CrashCourse',
      },
      {
        title: 'The Cold War',
        description: 'US vs USSR: democracy vs communism without direct war.',
        tips: ['The Cold War lasted from ~1947 to 1991', 'The Space Race and Arms Race defined the era', 'The Berlin Wall fell in 1989, ending the Cold War'],
        videoId: 'I79TpDe3t2g',
        channel: 'CrashCourse',
      },
      {
        title: 'The Civil Rights Movement',
        description: "America's fight for racial equality in the 1950s–60s.",
        tips: ['Rosa Parks refused to give up her bus seat in 1955', 'MLK\'s "I Have a Dream" speech was in 1963', 'The Civil Rights Act of 1964 banned racial discrimination'],
        videoId: 'rCRKUuRe-3E',
        channel: 'CrashCourse',
      },
    ],
  },
  english: {
    '1-5': [
      {
        title: 'Reading Comprehension',
        description: 'How to understand and analyze what you read.',
        tips: ['Read the questions before the passage', 'Look for the main idea in the first paragraph', 'Use context clues to figure out unknown words'],
        videoId: 'MSYw502dJNY',
        channel: 'CrashCourse',
      },
      {
        title: 'Grammar Basics',
        description: 'Nouns, verbs, adjectives — the building blocks of writing.',
        tips: ['A noun names a person, place, or thing', 'A verb shows action or state of being', 'Adjectives describe nouns'],
        videoId: 'bgO_SfxiZoU',
        channel: 'CrashCourse',
      },
    ],
    '6-8': [
      {
        title: 'Essay Writing',
        description: 'Introduction, body paragraphs, and conclusion.',
        tips: ['Start with a hook — a question, quote, or bold statement', 'Every body paragraph needs a topic sentence', 'Your conclusion should restate the thesis differently'],
        videoId: 'iRfYKxNsN2s',
        channel: 'CrashCourse',
      },
      {
        title: 'Literary Devices',
        description: 'Metaphor, simile, symbolism, foreshadowing, and more.',
        tips: ['Simile uses "like" or "as": brave as a lion', 'Metaphor says one thing IS another: life is a journey', 'Foreshadowing hints at what comes later in the story'],
        videoId: 'bRkLNgBDUc0',
        channel: 'CrashCourse',
      },
      {
        title: 'Vocabulary Building',
        description: 'Expand your word bank with roots, prefixes, and suffixes.',
        tips: ['Learn common Latin/Greek roots (bio=life, geo=earth)', 'Pre = before, post = after, anti = against', 'Reading widely is the fastest way to grow vocabulary'],
        videoId: 'OkBdN-sQRcs',
        channel: 'TED-Ed',
      },
    ],
    '9-12': [
      {
        title: 'Rhetoric & Persuasion',
        description: 'Ethos, pathos, logos — how to argue effectively.',
        tips: ['Ethos = credibility (why should we trust you?)', 'Pathos = emotion (how does it make you feel?)', 'Logos = logic (what are the facts and evidence?)'],
        videoId: 'qOP2V_np2c0',
        channel: 'TED-Ed',
      },
      {
        title: 'Shakespeare',
        description: 'Understanding the language and themes of Shakespeare.',
        tips: ['Thou = you, thy = your, doth = does', 'Read a modern translation alongside the original', 'Focus on plot and character, not every word'],
        videoId: 'MSYw502dJNY',
        channel: 'CrashCourse',
      },
      {
        title: 'Research & Citations',
        description: 'How to find sources and cite them correctly.',
        tips: ['Use .gov, .edu, and reputable .org sites', 'Always evaluate sources for bias', 'MLA and APA are the two most common citation styles'],
        videoId: 'NXRY5GlZP7Y',
        channel: 'CrashCourse',
      },
    ],
  },
}

function getGradeBand(grade: number): string {
  if (grade <= 5) return '1-5'
  if (grade <= 8) return '6-8'
  return '9-12'
}

export default function TutorialPage() {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)

  const gradeBand = selectedGrade ? getGradeBand(selectedGrade) : null
  const topics = selectedSubject && gradeBand ? TUTORIALS[selectedSubject][gradeBand] : null

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
      <div>
        <h1 className="text-xl font-black text-white">📚 Tutorial</h1>
        <p className="text-white/40 text-sm mt-0.5">Pick your grade and subject to get started</p>
      </div>

      {/* Grade picker */}
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-white/40">Select Your Grade</p>
        <div className="space-y-2">
          {GRADE_BANDS.map(band => (
            <div key={band.label}>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5 px-1">{band.emoji} {band.label}</p>
              <div className="flex flex-wrap gap-2">
                {band.grades.map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={cn(
                      'w-12 h-10 rounded-xl text-sm font-black transition-all',
                      selectedGrade === g
                        ? 'bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-500/30'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subject picker */}
      {selectedGrade && (
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-white/40">Select a Subject</p>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSubject(s.id)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-2xl border transition-all text-left',
                  selectedSubject === s.id
                    ? `bg-gradient-to-r ${s.color} border-transparent text-white shadow-lg`
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <span className="text-2xl">{s.emoji}</span>
                <span className="font-black text-sm">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topics */}
      {topics && (
        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/40">
            Grade {selectedGrade} · {SUBJECTS.find(s => s.id === selectedSubject)?.label} Topics
          </p>
          {topics.map((topic, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Topic header */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-black text-white text-base">{topic.title}</h2>
                  <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">{topic.channel}</span>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{topic.description}</p>

                {/* Tips */}
                <div className="space-y-1.5 pt-1">
                  {topic.tips.map((tip, ti) => (
                    <div key={ti} className="flex items-start gap-2">
                      <span className="text-indigo-400 font-black text-xs mt-0.5 flex-shrink-0">→</span>
                      <p className="text-xs text-white/70 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video */}
              <div className="border-t border-white/10">
                {expandedVideo === `${i}` ? (
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${topic.videoId}?autoplay=1&rel=0`}
                      title={topic.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setExpandedVideo(`${i}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition"
                  >
                    <span className="text-red-500">▶</span> Watch Video
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty prompt */}
      {!selectedGrade && (
        <div className="text-center py-12 text-white/20">
          <p className="text-5xl mb-3">🎓</p>
          <p className="font-semibold">Pick a grade above to get started</p>
        </div>
      )}
    </div>
  )
}
