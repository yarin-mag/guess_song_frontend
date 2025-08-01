import { loadTranslations } from '$lib/i18n';
import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';
import { user } from '$lib/stores/userStore';
import { guessHistory } from '$lib/stores/guessHistoryStore';
import { isTermsModalOpen } from '$lib/stores/modalStore';
import { fetchGuessHistoryWithRetry, fetchUserWithRetry } from '$lib/utils/api';

export const load = async (event: Parameters<LayoutLoad>[0]) => {
	const {
		url: { pathname }
	} = event;
	let lang = 'en';
	if (browser) {
		lang = localStorage.getItem('lang') || 'en';
		try {
			const [userData, guessHistoryData] = await Promise.all([
				fetchUserWithRetry(),
				fetchGuessHistoryWithRetry()
			]);
			user.set(userData);
			guessHistory.set(guessHistoryData);

			// if (userData && userData.agree_to_conditions_and_terms === null) {
			// 	isTermsModalOpen.set(true);
			// } else {
			// 	isTermsModalOpen.set(false);
			// }
		} catch (error) {
			console.error('Failed to fetch data:', error);
		}
	}
	await loadTranslations(lang, pathname);

	return {
		locale: lang
	};
};
