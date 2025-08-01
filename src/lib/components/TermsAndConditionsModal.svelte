<script lang="ts">
	import { isTermsModalOpen } from '$lib/stores/modalStore';
	import { agreeToTermsAndConditionsWithRetry } from '$lib/utils/api';
	import { user } from '$lib/stores/userStore';
	import { locale, locales, loadTranslations, t } from '$lib/i18n';

	let isLoading = false;

	async function handleAgree() {
		isLoading = true;
		try {
			const updatedUser = await agreeToTermsAndConditionsWithRetry();
			if (updatedUser) {
				user.set(updatedUser);
				isTermsModalOpen.set(false);
			}
		} catch (error) {
			console.error('Failed to agree to terms and conditions:', error);
		} finally {
			isLoading = false;
		}
	}

	async function handleLanguageChange(e: Event) {
		const lang = (e.target as HTMLSelectElement).value;
		localStorage.setItem('lang', lang);
		locale.set(lang);
		await loadTranslations(lang);
	}
</script>

{#if $isTermsModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div class="rounded-lg bg-white p-8 shadow-xl max-w-md text-black space-y-4">
		<!-- Language Switcher -->
		<div class="flex items-center justify-end space-x-2">
			<label for="lang" class="text-sm font-medium text-gray-600">🌐:</label>
			<select id="lang" on:change={handleLanguageChange} bind:value={$locale} class="appearance-none bg-gray-200 text-black px-2 py-1 rounded pr-6 w-15">
			{#each $locales as l}
				<option value={l}>{l}</option>
			{/each}
			</select>
		</div>
			<h2 class="text-xl font-bold">{$t('termsModal.title')}</h2>
			<p>{$t('termsModal.paragraph1')}</p>
			<p>{$t('termsModal.paragraph2')}</p>
			<p>{$t('termsModal.paragraph3')}</p>
			<div class="mt-6 flex justify-end">
				<button
					on:click={handleAgree}
					disabled={isLoading}
					class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
				>
					{isLoading ? $t('termsModal.loading') : $t('termsModal.agree')}
				</button>
			</div>
		</div>
	</div>
{/if}
