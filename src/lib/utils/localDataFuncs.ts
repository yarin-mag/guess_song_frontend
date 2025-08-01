export type UserEntry = { 
    id: string;
    is_subscribed: boolean;
    guesses_left: number;
    last_guess_date: Date | number | undefined;
    guesses: any;
    subscription_start_date: Date | number | undefined;
    subscription_end_date_net: Date | number | undefined;
    subscription_end_date_gross: Date | number | undefined;
    agree_to_conditions_and_terms: Date | number | undefined;
    subscription_id: string;
    monthly_payment: number;
    payment_history: Array<any>;
};

export type GuessEntry = {
    guess: string;
    correct: boolean;
    score: number;
};

const MAX_GUESSES_PER_DAY = 5;

// Moved to be exportable
export const getTodayKey = (prefix: string) => {
    const today = new Date().toISOString().split('T')[0];
    return `${prefix}${today}`;
};

export function getLocalUser(): UserEntry {
    const raw = localStorage.getItem(getTodayKey('user_history_'));
    return raw ? JSON.parse(raw) : [];
}

export function getGuessHistory(): GuessEntry[] {
    const raw = localStorage.getItem(getTodayKey('guess_history_'));
    return raw ? JSON.parse(raw) : [];
}

export function saveGuess(guess: string, correct: boolean, score: number): void {
    const history = getGuessHistory();
    if (history.length >= MAX_GUESSES_PER_DAY) return;
    const newEntry = { guess, correct, score };
    localStorage.setItem(getTodayKey('guess_history_'), JSON.stringify([...history, newEntry]));
}

export function remainingGuesses(): number {
    return MAX_GUESSES_PER_DAY - getGuessHistory().length;
}

export function clearLocalData(): void {
    localStorage.clear();
}

export function clearDailyHistory(): void {
    const storedDateKey = localStorage.getItem('last_cleared_date_key');
    const currentDayKey = getTodayKey('guess_history_');

    if (storedDateKey !== currentDayKey) {
        // It's a new day, clear history
        localStorage.removeItem(storedDateKey || getTodayKey('guess_history_')); // Clear the previous day's or current day's if first run
        localStorage.setItem('last_cleared_date_key', currentDayKey); // Store the current day key
        console.log("Local guess history cleared for a new day.");
    }
}