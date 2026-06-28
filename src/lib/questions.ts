import { Subject, Question } from '@/types'

export const SEED_QUESTIONS: Omit<Question, 'id'>[] = [
  // Math - Grade 3
  { subject: 'math', grade_level: 3, question_text: 'What is 7 × 8?', type: 'typed', options: null, correct_answer: '56', difficulty: 2, source: 'curated' },
  { subject: 'math', grade_level: 3, question_text: 'What is 144 ÷ 12?', type: 'typed', options: null, correct_answer: '12', difficulty: 2, source: 'curated' },
  { subject: 'math', grade_level: 3, question_text: 'Which fraction is larger: 1/2 or 1/3?', type: 'multiple_choice', options: ['1/2', '1/3', 'They are equal', 'Cannot compare'], correct_answer: '1/2', difficulty: 2, source: 'curated' },
  { subject: 'math', grade_level: 3, question_text: 'What is the perimeter of a square with side 5 cm?', type: 'multiple_choice', options: ['10 cm', '15 cm', '20 cm', '25 cm'], correct_answer: '20 cm', difficulty: 2, source: 'curated' },
  // Math - Grade 5
  { subject: 'math', grade_level: 5, question_text: 'What is 25% of 80?', type: 'typed', options: null, correct_answer: '20', difficulty: 3, source: 'curated' },
  { subject: 'math', grade_level: 5, question_text: 'What is the area of a rectangle 6m × 9m?', type: 'typed', options: null, correct_answer: '54', difficulty: 3, source: 'curated' },
  { subject: 'math', grade_level: 5, question_text: 'What is 3/4 + 1/2?', type: 'multiple_choice', options: ['4/6', '5/4', '1 1/4', '1/2'], correct_answer: '5/4', difficulty: 3, source: 'curated' },
  { subject: 'math', grade_level: 5, question_text: 'Which number is prime?', type: 'multiple_choice', options: ['9', '15', '17', '21'], correct_answer: '17', difficulty: 3, source: 'curated' },
  // Math - Grade 8
  { subject: 'math', grade_level: 8, question_text: 'Solve for x: 2x + 6 = 18', type: 'typed', options: null, correct_answer: '6', difficulty: 4, source: 'curated' },
  { subject: 'math', grade_level: 8, question_text: 'What is the square root of 169?', type: 'typed', options: null, correct_answer: '13', difficulty: 4, source: 'curated' },
  { subject: 'math', grade_level: 8, question_text: 'What is the slope of y = 3x - 7?', type: 'multiple_choice', options: ['-7', '3', '7', '-3'], correct_answer: '3', difficulty: 4, source: 'curated' },
  { subject: 'math', grade_level: 8, question_text: 'What is 2³ × 2²?', type: 'multiple_choice', options: ['2⁵', '2⁶', '4⁵', '8'], correct_answer: '2⁵', difficulty: 4, source: 'curated' },
  // Science - Grade 4
  { subject: 'science', grade_level: 4, question_text: 'What planet is closest to the Sun?', type: 'multiple_choice', options: ['Venus', 'Earth', 'Mercury', 'Mars'], correct_answer: 'Mercury', difficulty: 2, source: 'curated' },
  { subject: 'science', grade_level: 4, question_text: 'What gas do plants absorb during photosynthesis?', type: 'multiple_choice', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correct_answer: 'Carbon Dioxide', difficulty: 2, source: 'curated' },
  { subject: 'science', grade_level: 4, question_text: 'How many bones are in the adult human body?', type: 'multiple_choice', options: ['196', '206', '216', '226'], correct_answer: '206', difficulty: 3, source: 'curated' },
  { subject: 'science', grade_level: 4, question_text: 'What is the center of an atom called?', type: 'multiple_choice', options: ['Electron', 'Proton', 'Nucleus', 'Neutron'], correct_answer: 'Nucleus', difficulty: 3, source: 'curated' },
  // Science - Grade 7
  { subject: 'science', grade_level: 7, question_text: 'What is the chemical symbol for water?', type: 'typed', options: null, correct_answer: 'H2O', difficulty: 2, source: 'curated' },
  { subject: 'science', grade_level: 7, question_text: 'What organelle is called the powerhouse of the cell?', type: 'multiple_choice', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Vacuole'], correct_answer: 'Mitochondria', difficulty: 2, source: 'curated' },
  { subject: 'science', grade_level: 7, question_text: 'What force keeps planets in orbit?', type: 'multiple_choice', options: ['Magnetism', 'Friction', 'Gravity', 'Nuclear force'], correct_answer: 'Gravity', difficulty: 2, source: 'curated' },
  { subject: 'science', grade_level: 7, question_text: 'What is the speed of light (approximate)?', type: 'multiple_choice', options: ['300,000 km/s', '150,000 km/s', '3,000 km/s', '30,000 km/s'], correct_answer: '300,000 km/s', difficulty: 3, source: 'curated' },
  // History - Grade 5
  { subject: 'history', grade_level: 5, question_text: 'In what year did the United States declare independence?', type: 'typed', options: null, correct_answer: '1776', difficulty: 2, source: 'curated' },
  { subject: 'history', grade_level: 5, question_text: 'Who was the first President of the United States?', type: 'multiple_choice', options: ['John Adams', 'Thomas Jefferson', 'George Washington', 'Benjamin Franklin'], correct_answer: 'George Washington', difficulty: 1, source: 'curated' },
  { subject: 'history', grade_level: 5, question_text: 'What ocean did Columbus cross to reach the Americas?', type: 'multiple_choice', options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], correct_answer: 'Atlantic', difficulty: 2, source: 'curated' },
  { subject: 'history', grade_level: 5, question_text: 'Which ancient wonder was located in Egypt?', type: 'multiple_choice', options: ['Colosseum', 'Great Pyramid of Giza', 'Parthenon', 'Stonehenge'], correct_answer: 'Great Pyramid of Giza', difficulty: 2, source: 'curated' },
  // History - Grade 8
  { subject: 'history', grade_level: 8, question_text: 'What year did World War II end?', type: 'typed', options: null, correct_answer: '1945', difficulty: 2, source: 'curated' },
  { subject: 'history', grade_level: 8, question_text: 'Which document ended slavery in the US?', type: 'multiple_choice', options: ['Declaration of Independence', 'Emancipation Proclamation', 'Bill of Rights', 'Constitution'], correct_answer: 'Emancipation Proclamation', difficulty: 3, source: 'curated' },
  { subject: 'history', grade_level: 8, question_text: 'What caused the Great Depression?', type: 'multiple_choice', options: ['World War I', 'Stock market crash of 1929', 'Hurricane of 1928', 'Drought in 1930'], correct_answer: 'Stock market crash of 1929', difficulty: 3, source: 'curated' },
  { subject: 'history', grade_level: 8, question_text: 'Who wrote the Declaration of Independence?', type: 'multiple_choice', options: ['George Washington', 'Benjamin Franklin', 'Thomas Jefferson', 'John Adams'], correct_answer: 'Thomas Jefferson', difficulty: 2, source: 'curated' },
  // English - Grade 4
  { subject: 'english', grade_level: 4, question_text: 'What is a synonym for "happy"?', type: 'multiple_choice', options: ['Sad', 'Joyful', 'Angry', 'Tired'], correct_answer: 'Joyful', difficulty: 1, source: 'curated' },
  { subject: 'english', grade_level: 4, question_text: 'Which of these is a noun?', type: 'multiple_choice', options: ['Run', 'Quickly', 'Beautiful', 'Apple'], correct_answer: 'Apple', difficulty: 1, source: 'curated' },
  { subject: 'english', grade_level: 4, question_text: 'What punctuation ends a question?', type: 'multiple_choice', options: ['Period', 'Exclamation mark', 'Question mark', 'Comma'], correct_answer: 'Question mark', difficulty: 1, source: 'curated' },
  { subject: 'english', grade_level: 4, question_text: 'What is the plural of "child"?', type: 'typed', options: null, correct_answer: 'children', difficulty: 2, source: 'curated' },
  // English - Grade 7
  { subject: 'english', grade_level: 7, question_text: 'What literary device is "The wind whispered through the trees"?', type: 'multiple_choice', options: ['Simile', 'Metaphor', 'Personification', 'Alliteration'], correct_answer: 'Personification', difficulty: 3, source: 'curated' },
  { subject: 'english', grade_level: 7, question_text: 'What is the main clause in: "Although it rained, we played outside"?', type: 'multiple_choice', options: ['Although it rained', 'We played outside', 'It rained', 'Although we played'], correct_answer: 'We played outside', difficulty: 3, source: 'curated' },
  { subject: 'english', grade_level: 7, question_text: 'What is an antonym for "ancient"?', type: 'multiple_choice', options: ['Old', 'Modern', 'Historic', 'Vintage'], correct_answer: 'Modern', difficulty: 2, source: 'curated' },
  { subject: 'english', grade_level: 7, question_text: 'Which sentence uses the correct form: "They ____ going to the store"?', type: 'multiple_choice', options: ['is', 'was', 'are', 'be'], correct_answer: 'are', difficulty: 2, source: 'curated' },
]

export function getQuestionsForBattle(subject: Subject, gradeLevel: number, count = 10): Omit<Question, 'id'>[] {
  const pool = SEED_QUESTIONS.filter(
    q => q.subject === subject && q.grade_level === gradeLevel
  )
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
