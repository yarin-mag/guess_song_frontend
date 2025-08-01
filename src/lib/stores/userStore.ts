import { writable } from 'svelte/store';

export interface User {
	id: string;
	is_subscribed: boolean;
	guesses_left: number;
	last_guess_date: string | null;
	guesses: Record<string, number>;
	subscription_start_date: string | null;
	subscription_end_date_net: string | null;
	subscription_end_date_gross: string | null;
	agree_to_conditions_and_terms: string | null;
	subscription_id: string | null;
	monthly_payment: number | null;
	payment_history: any[];
}

export const user = writable<User | null>(null);
