import { writable } from 'svelte/store';

export interface Guess {
	guess: string;
	score: number;
	timestamp: string;
}

export const guessHistory = writable<Guess[]>([]);
