/**
 * Undercover — word pairs database.
 *
 * 100 pairs across Easy / Medium / Difficult.
 * Each pair has wordA and wordB — the game randomizes which is Civilian
 * and which is Undercover at the start of each round.
 *
 * Do NOT store civilian/undercover assignments here.
 */

import type { WordPair } from "./types";

export const WORD_PAIRS: WordPair[] = [
  // ─── Easy ─────────────────────────────────────────────────────────────────
  { id: "easy-001", wordA: "Apple",      wordB: "Pear",        difficulty: "easy", category: "Food" },
  { id: "easy-002", wordA: "Dog",        wordB: "Wolf",        difficulty: "easy", category: "Animals" },
  { id: "easy-003", wordA: "Cat",        wordB: "Tiger",       difficulty: "easy", category: "Animals" },
  { id: "easy-004", wordA: "Coffee",     wordB: "Tea",         difficulty: "easy", category: "Drinks" },
  { id: "easy-005", wordA: "Pizza",      wordB: "Burger",      difficulty: "easy", category: "Food" },
  { id: "easy-006", wordA: "Beach",      wordB: "Pool",        difficulty: "easy", category: "Places" },
  { id: "easy-007", wordA: "Summer",     wordB: "Winter",      difficulty: "easy", category: "Seasons" },
  { id: "easy-008", wordA: "Sun",        wordB: "Moon",        difficulty: "easy", category: "Nature" },
  { id: "easy-009", wordA: "Fire",       wordB: "Ice",         difficulty: "easy", category: "Elements" },
  { id: "easy-010", wordA: "Car",        wordB: "Bus",         difficulty: "easy", category: "Transport" },
  { id: "easy-011", wordA: "Train",      wordB: "Metro",       difficulty: "easy", category: "Transport" },
  { id: "easy-012", wordA: "Bicycle",    wordB: "Motorcycle",  difficulty: "easy", category: "Transport" },
  { id: "easy-013", wordA: "School",     wordB: "College",     difficulty: "easy", category: "Education" },
  { id: "easy-014", wordA: "Teacher",    wordB: "Professor",   difficulty: "easy", category: "Jobs" },
  { id: "easy-015", wordA: "Doctor",     wordB: "Nurse",       difficulty: "easy", category: "Jobs" },
  { id: "easy-016", wordA: "Police",     wordB: "Security",    difficulty: "easy", category: "Jobs" },
  { id: "easy-017", wordA: "King",       wordB: "Queen",       difficulty: "easy", category: "Royalty" },
  { id: "easy-018", wordA: "Prince",     wordB: "Princess",    difficulty: "easy", category: "Royalty" },
  { id: "easy-019", wordA: "Cake",       wordB: "Cupcake",     difficulty: "easy", category: "Food" },
  { id: "easy-020", wordA: "Chocolate",  wordB: "Candy",       difficulty: "easy", category: "Food" },
  { id: "easy-021", wordA: "Ice Cream",  wordB: "Gelato",      difficulty: "easy", category: "Food" },
  { id: "easy-022", wordA: "Burger",     wordB: "Sandwich",    difficulty: "easy", category: "Food" },
  { id: "easy-023", wordA: "Fries",      wordB: "Chips",       difficulty: "easy", category: "Food" },
  { id: "easy-024", wordA: "Rice",       wordB: "Pasta",       difficulty: "easy", category: "Food" },
  { id: "easy-025", wordA: "Football",   wordB: "Basketball",  difficulty: "easy", category: "Sports" },
  { id: "easy-026", wordA: "Cricket",    wordB: "Baseball",    difficulty: "easy", category: "Sports" },
  { id: "easy-027", wordA: "Tennis",     wordB: "Badminton",   difficulty: "easy", category: "Sports" },
  { id: "easy-028", wordA: "Swimming",   wordB: "Diving",      difficulty: "easy", category: "Sports" },
  { id: "easy-029", wordA: "Running",    wordB: "Jogging",     difficulty: "easy", category: "Sports" },
  { id: "easy-030", wordA: "Movie",      wordB: "Series",      difficulty: "easy", category: "Entertainment" },
  { id: "easy-031", wordA: "Actor",      wordB: "Singer",      difficulty: "easy", category: "Entertainment" },
  { id: "easy-032", wordA: "Guitar",     wordB: "Piano",       difficulty: "easy", category: "Music" },
  { id: "easy-033", wordA: "Book",       wordB: "Magazine",    difficulty: "easy", category: "Media" },
  { id: "easy-034", wordA: "Pen",        wordB: "Pencil",      difficulty: "easy", category: "Stationery" },

  // ─── Medium ───────────────────────────────────────────────────────────────
  { id: "med-001",  wordA: "Airport",    wordB: "Railway Station", difficulty: "medium", category: "Transport" },
  { id: "med-002",  wordA: "Hotel",      wordB: "Hostel",      difficulty: "medium", category: "Places" },
  { id: "med-003",  wordA: "Mountain",   wordB: "Hill",        difficulty: "medium", category: "Nature" },
  { id: "med-004",  wordA: "Forest",     wordB: "Jungle",      difficulty: "medium", category: "Nature" },
  { id: "med-005",  wordA: "River",      wordB: "Lake",        difficulty: "medium", category: "Nature" },
  { id: "med-006",  wordA: "Ocean",      wordB: "Sea",         difficulty: "medium", category: "Nature" },
  { id: "med-007",  wordA: "Desert",     wordB: "Savanna",     difficulty: "medium", category: "Nature" },
  { id: "med-008",  wordA: "Island",     wordB: "Peninsula",   difficulty: "medium", category: "Geography" },
  { id: "med-009",  wordA: "Rain",       wordB: "Snow",        difficulty: "medium", category: "Weather" },
  { id: "med-010",  wordA: "Thunder",    wordB: "Lightning",   difficulty: "medium", category: "Weather" },
  { id: "med-011",  wordA: "Cloud",      wordB: "Fog",         difficulty: "medium", category: "Weather" },
  { id: "med-012",  wordA: "Wind",       wordB: "Breeze",      difficulty: "medium", category: "Weather" },
  { id: "med-013",  wordA: "Morning",    wordB: "Evening",     difficulty: "medium", category: "Time" },
  { id: "med-014",  wordA: "Sunrise",    wordB: "Sunset",      difficulty: "medium", category: "Time" },
  { id: "med-015",  wordA: "Birthday",   wordB: "Anniversary", difficulty: "medium", category: "Events" },
  { id: "med-016",  wordA: "Wedding",    wordB: "Engagement",  difficulty: "medium", category: "Events" },
  { id: "med-017",  wordA: "Party",      wordB: "Festival",    difficulty: "medium", category: "Events" },
  { id: "med-018",  wordA: "Concert",    wordB: "Theatre",     difficulty: "medium", category: "Entertainment" },
  { id: "med-019",  wordA: "Museum",     wordB: "Gallery",     difficulty: "medium", category: "Culture" },
  { id: "med-020",  wordA: "Library",    wordB: "Bookstore",   difficulty: "medium", category: "Culture" },
  { id: "med-021",  wordA: "Restaurant", wordB: "Café",        difficulty: "medium", category: "Places" },
  { id: "med-022",  wordA: "Kitchen",    wordB: "Dining Room", difficulty: "medium", category: "Home" },
  { id: "med-023",  wordA: "Bedroom",    wordB: "Living Room", difficulty: "medium", category: "Home" },
  { id: "med-024",  wordA: "Sofa",       wordB: "Bed",         difficulty: "medium", category: "Furniture" },
  { id: "med-025",  wordA: "Pillow",     wordB: "Blanket",     difficulty: "medium", category: "Home" },
  { id: "med-026",  wordA: "Mirror",     wordB: "Window",      difficulty: "medium", category: "Home" },
  { id: "med-027",  wordA: "Door",       wordB: "Gate",        difficulty: "medium", category: "Home" },
  { id: "med-028",  wordA: "Elevator",   wordB: "Escalator",   difficulty: "medium", category: "Building" },
  { id: "med-029",  wordA: "Stairs",     wordB: "Ladder",      difficulty: "medium", category: "Building" },
  { id: "med-030",  wordA: "Phone",      wordB: "Tablet",      difficulty: "medium", category: "Technology" },
  { id: "med-031",  wordA: "Laptop",     wordB: "Computer",    difficulty: "medium", category: "Technology" },
  { id: "med-032",  wordA: "Camera",     wordB: "Binoculars",  difficulty: "medium", category: "Technology" },
  { id: "med-033",  wordA: "Television", wordB: "Projector",   difficulty: "medium", category: "Technology" },
  { id: "med-034",  wordA: "Headphones", wordB: "Earphones",   difficulty: "medium", category: "Technology" },

  // ─── Difficult ────────────────────────────────────────────────────────────
  { id: "dif-001",  wordA: "Detective",  wordB: "Spy",         difficulty: "difficult", category: "Roles" },
  { id: "dif-002",  wordA: "Pirate",     wordB: "Sailor",      difficulty: "difficult", category: "Roles" },
  { id: "dif-003",  wordA: "Astronaut",  wordB: "Pilot",       difficulty: "difficult", category: "Roles" },
  { id: "dif-004",  wordA: "Scientist",  wordB: "Inventor",    difficulty: "difficult", category: "Roles" },
  { id: "dif-005",  wordA: "Chef",       wordB: "Baker",       difficulty: "difficult", category: "Roles" },
  { id: "dif-006",  wordA: "Farmer",     wordB: "Gardener",    difficulty: "difficult", category: "Roles" },
  { id: "dif-007",  wordA: "Artist",     wordB: "Designer",    difficulty: "difficult", category: "Roles" },
  { id: "dif-008",  wordA: "Writer",     wordB: "Journalist",  difficulty: "difficult", category: "Roles" },
  { id: "dif-009",  wordA: "Lawyer",     wordB: "Judge",       difficulty: "difficult", category: "Roles" },
  { id: "dif-010",  wordA: "Soldier",    wordB: "Police Officer", difficulty: "difficult", category: "Roles" },
  { id: "dif-011",  wordA: "Prison",     wordB: "Hospital",    difficulty: "difficult", category: "Buildings" },
  { id: "dif-012",  wordA: "Bank",       wordB: "Casino",      difficulty: "difficult", category: "Buildings" },
  { id: "dif-013",  wordA: "School",     wordB: "Prison",      difficulty: "difficult", category: "Buildings" },
  { id: "dif-014",  wordA: "Office",     wordB: "Classroom",   difficulty: "difficult", category: "Buildings" },
  { id: "dif-015",  wordA: "Palace",     wordB: "Mansion",     difficulty: "difficult", category: "Buildings" },
  { id: "dif-016",  wordA: "Castle",     wordB: "Fort",        difficulty: "difficult", category: "Buildings" },
  { id: "dif-017",  wordA: "Crown",      wordB: "Trophy",      difficulty: "difficult", category: "Objects" },
  { id: "dif-018",  wordA: "Sword",      wordB: "Knife",       difficulty: "difficult", category: "Objects" },
  { id: "dif-019",  wordA: "Shield",     wordB: "Helmet",      difficulty: "difficult", category: "Objects" },
  { id: "dif-020",  wordA: "Map",        wordB: "Compass",     difficulty: "difficult", category: "Objects" },
  { id: "dif-021",  wordA: "Key",        wordB: "Password",    difficulty: "difficult", category: "Concepts" },
  { id: "dif-022",  wordA: "Secret",     wordB: "Mystery",     difficulty: "difficult", category: "Concepts" },
  { id: "dif-023",  wordA: "Dream",      wordB: "Memory",      difficulty: "difficult", category: "Concepts" },
  { id: "dif-024",  wordA: "Shadow",     wordB: "Reflection",  difficulty: "difficult", category: "Concepts" },
  { id: "dif-025",  wordA: "Magic",      wordB: "Illusion",    difficulty: "difficult", category: "Concepts" },
  { id: "dif-026",  wordA: "Luck",       wordB: "Chance",      difficulty: "difficult", category: "Concepts" },
  { id: "dif-027",  wordA: "Fear",       wordB: "Anxiety",     difficulty: "difficult", category: "Emotions" },
  { id: "dif-028",  wordA: "Love",       wordB: "Friendship",  difficulty: "difficult", category: "Emotions" },
  { id: "dif-029",  wordA: "Joke",       wordB: "Lie",         difficulty: "difficult", category: "Concepts" },
  { id: "dif-030",  wordA: "Question",   wordB: "Riddle",      difficulty: "difficult", category: "Concepts" },
  { id: "dif-031",  wordA: "Rumour",     wordB: "Gossip",      difficulty: "difficult", category: "Concepts" },
  { id: "dif-032",  wordA: "Trap",       wordB: "Ambush",      difficulty: "difficult", category: "Concepts" },
];

/**
 * Get word pairs filtered by difficulty.
 */
export function getPairsByDifficulty(difficulty: "easy" | "medium" | "difficult"): WordPair[] {
  return WORD_PAIRS.filter((p) => p.difficulty === difficulty);
}
