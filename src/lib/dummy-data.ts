/**
 * Dummy data matching the reference image exactly.
 * This will be replaced with Supabase queries in Step 3.
 */

export interface DayTask {
  name: string;
  completed: boolean;
}

export interface DayData {
  dayName: string;
  date: string;
  completionPercent: number;
  tasks: DayTask[];
  done: number;
  left: number;
}

export interface HabitData {
  name: string;
  days: boolean[]; // [mon, tue, wed, thu, fri, sat, sun]
  progress: number;
}

export interface CategoryProgress {
  name: string;
  percent: number;
}

export const weeklyFocus = "Finish assignments";
export const weeklyReward = "Watch a movie";
export const weeklyAffirmation = "One step at a time.";

export const dailyData: DayData[] = [
  {
    dayName: "Monday",
    date: "29.12.2025",
    completionPercent: 100,
    done: 10,
    left: 0,
    tasks: [
      { name: "Gym workout", completed: true },
      { name: "Project analysis", completed: true },
      { name: "Laundry", completed: true },
      { name: "Meet up with friends", completed: true },
      { name: "Create an IG story", completed: true },
      { name: "Research flight deals", completed: true },
      { name: "Therapy session", completed: true },
      { name: "Delivery pickup", completed: true },
      { name: "Kiss my boyfriend", completed: true },
      { name: "Bake a cake", completed: true },
    ],
  },
  {
    dayName: "Tuesday",
    date: "30.12.2025",
    completionPercent: 100,
    done: 10,
    left: 0,
    tasks: [
      { name: "Clean kitchen", completed: true },
      { name: "Piano practice", completed: true },
      { name: "Vaccine appointment", completed: true },
      { name: "Meet up with friends", completed: true },
      { name: "Create an IG story", completed: true },
      { name: "Therapy session", completed: true },
      { name: "Grocery shopping", completed: true },
      { name: "Vacuum the house", completed: true },
      { name: "Delivery pickup", completed: true },
      { name: "Kiss my boyfriend", completed: true },
    ],
  },
  {
    dayName: "Wednesday",
    date: "31.12.2025",
    completionPercent: 100,
    done: 10,
    left: 0,
    tasks: [
      { name: "Meal prep", completed: true },
      { name: "Study for exam", completed: true },
      { name: "Meet up with friends", completed: true },
      { name: "Create an IG story", completed: true },
      { name: "Research flight deals", completed: true },
      { name: "Therapy session", completed: true },
      { name: "Delivery pickup", completed: true },
      { name: "Read industry news", completed: true },
      { name: "Post TikTok video", completed: true },
      { name: "Plan next week", completed: true },
    ],
  },
  {
    dayName: "Thursday",
    date: "01.01.2026",
    completionPercent: 75,
    done: 7,
    left: 3,
    tasks: [
      { name: "Learn SEO basics", completed: true },
      { name: "Bike trip", completed: true },
      { name: "Laundry", completed: true },
      { name: "Meet up with friends", completed: true },
      { name: "Create an IG story", completed: true },
      { name: "Research flight deals", completed: true },
      { name: "Therapy session", completed: true },
      { name: "Delivery pickup", completed: false },
      { name: "Kiss my boyfriend", completed: false },
      { name: "Bake a cake", completed: false },
    ],
  },
  {
    dayName: "Friday",
    date: "02.01.2026",
    completionPercent: 0,
    done: 0,
    left: 10,
    tasks: [
      { name: "Yoga session", completed: false },
      { name: "Content management", completed: false },
      { name: "Read industry news", completed: false },
      { name: "Meet up with friends", completed: false },
      { name: "Create an IG story", completed: false },
      { name: "Research flight deals", completed: false },
      { name: "Therapy session", completed: false },
      { name: "Delivery pickup", completed: false },
      { name: "Kiss my boyfriend", completed: false },
      { name: "Post TikTok video", completed: false },
    ],
  },
  {
    dayName: "Saturday",
    date: "03.01.2026",
    completionPercent: 0,
    done: 0,
    left: 10,
    tasks: [
      { name: "Brunch with friends", completed: false },
      { name: "Grocery shopping", completed: false },
      { name: "Clean my room", completed: false },
      { name: "Watch a movie", completed: false },
      { name: "Skincare routine", completed: false },
      { name: "Plan next week", completed: false },
      { name: "Read a book", completed: false },
      { name: "Take a walk", completed: false },
      { name: "No caffeine", completed: false },
      { name: "Gratitude journal", completed: false },
    ],
  },
  {
    dayName: "Sunday",
    date: "04.01.2026",
    completionPercent: 80,
    done: 8,
    left: 2,
    tasks: [
      { name: "Weekly review", completed: true },
      { name: "Plan content", completed: true },
      { name: "Meal prep", completed: true },
      { name: "Read a book", completed: true },
      { name: "Family time", completed: true },
      { name: "Budget tracking", completed: true },
      { name: "Self care", completed: true },
      { name: "Meditation", completed: true },
      { name: "Plan next week", completed: false },
      { name: "Early sleep", completed: false },
    ],
  },
];

export const overallProgressBars = [100, 100, 100, 75, 0, 0, 80];

export const totalCompleted = 21;
export const totalTasks = 65;
export const overallPercent = 64;

export const categoryProgress: CategoryProgress[] = [
  { name: "Work / School", percent: 70 },
  { name: "Personal", percent: 60 },
  { name: "Health", percent: 80 },
  { name: "Finance", percent: 50 },
  { name: "Social", percent: 65 },
  { name: "Self Care", percent: 75 },
  { name: "Other", percent: 40 },
];

export const habitsData: HabitData[] = [
  { name: "Wake up at 6:30", days: [true, true, true, true, true, true, false], progress: 86 },
  { name: "Drink 2L of water", days: [true, true, true, true, true, true, true], progress: 100 },
  { name: "Cold shower", days: [true, true, false, true, true, false, true], progress: 71 },
  { name: "Gym", days: [true, true, false, true, true, false, true], progress: 71 },
  { name: "Reading 10 pages", days: [true, false, true, false, true, true, false], progress: 57 },
  { name: "Budget tracking", days: [true, false, true, false, true, true, false], progress: 57 },
  { name: "Studying", days: [true, true, false, true, true, false, true], progress: 71 },
  { name: "Stretching", days: [true, false, false, true, false, true, false], progress: 43 },
  { name: "Meditation", days: [true, true, false, false, true, true, false], progress: 57 },
  { name: "No vape", days: [true, true, true, true, true, true, true], progress: 100 },
];
