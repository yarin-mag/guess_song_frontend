import { env } from '$env/dynamic/public';
import { get } from 'svelte/store';
import { clerkStore } from '../../hooks.client';
import { user, type User } from '$lib/stores/userStore';

const API_URL = env.PUBLIC_API_URL;

async function getToken() {
	const session = get(clerkStore).session;
	await session?.reload(); // Ensure fresh token
	const token = await session?.getToken({ template: 'default' });
	return token;
}

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
	for (let i = 0; i < retries; i++) {
		try {
			return await fn();
		} catch (error) {
			if (i < retries - 1) {
				console.error(`Attempt ${i + 1} failed. Retrying in ${delay / 1000} seconds...`);
				await new Promise((res) => setTimeout(res, delay));
			} else {
				console.error(`All ${retries} attempts failed.`);
				throw error;
			}
		}
	}
	throw new Error('Should not be reached');
}

export async function fetchClip(): Promise<string> {
	const res = await fetch(`${API_URL}/songs/daily`);
	const data = await res.json();
	return data.clip_url;
}

export function fetchClipWithRetry(retries = 3, delay = 1000): Promise<string> {
	return retry(fetchClip, retries, delay);
}

export async function fetchUser(): Promise<User | null> {
	const token = await getToken();
	if (!token) {
		user.set(null);
		return null;
	}
	const res = await fetch(`${API_URL}/users`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}
	});
	if (!res.ok) {
		user.set(null);
		return null;
	}
	const data = await res.json();
	user.set(data);
	return data;
}

export function fetchUserWithRetry(retries = 3, delay = 1000): Promise<User | null> {
	return retry(fetchUser, retries, delay);
}

export async function submitGuess(guess: string): Promise<{ score: number; message: string }> {
	const token = await getToken();

	if (!token) {
		throw new Error('User is not authenticated');
	}

	const response = await fetch(`${API_URL}/guesses`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ guess })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || `Server responded with status ${response.status}`);
	}

	return await response.json();
}

export async function fetchGuessHistory(): Promise<any[]> {
	const token = await getToken();

	if (!token) {
		return [];
	}

	const response = await fetch(`${API_URL}/guesses/history`, {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		console.error('Failed to fetch guess history');
		return [];
	}

	return await response.json();
}

export function fetchGuessHistoryWithRetry(retries = 3, delay = 20000): Promise<any[]> {
	return retry(fetchGuessHistory, retries, delay);
}

export async function cancelSubscription(): Promise<void> {
	const token = await getToken();

	if (!token) {
		throw new Error('User is not authenticated');
	}

	const response = await fetch(`${API_URL}/users/cancel-subscription`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || `Failed to cancel subscription`);
	}

	await fetchUserWithRetry();
}

export function cancelSubscriptionWithRetry(retries = 3, delay = 1000): Promise<void> {
	return retry(cancelSubscription, retries, delay);
}

export async function agreeToTermsAndConditions(): Promise<User | null> {
	const token = await getToken();
	if (!token) {
		throw new Error('User is not authenticated');
	}

	const response = await fetch(`${API_URL}/users/agree-to-terms-and-conditions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to agree to terms and conditions');
	}

	const updatedUser = await response.json();
	user.set(updatedUser);
	return updatedUser;
}

export function agreeToTermsAndConditionsWithRetry(retries = 3, delay = 1000): Promise<User | null> {
	return retry(agreeToTermsAndConditions, retries, delay);
}
