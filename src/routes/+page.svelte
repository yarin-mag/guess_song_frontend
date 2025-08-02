<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import AudioPlayer from '$lib/components/AudioPlayer.svelte';
  import GuessInput from '$lib/components/GuessInput.svelte';
  import SubmitButton from '$lib/components/SubmitButton.svelte';
  import PayPalButton from '$lib/components/PayPalButton.svelte';
  import TermsAndConditionsModal from '$lib/components/TermsAndConditionsModal.svelte';
  import { fetchClipWithRetry, fetchGuessHistoryWithRetry, fetchUserWithRetry, submitGuess } from '$lib/utils/api';
  import { getGuessHistory, saveGuess, remainingGuesses, clearDailyHistory, getTodayKey, getLocalUser, clearLocalData } from '$lib/utils/localDataFuncs';
  import { clerkStore } from '../hooks.client';
  import { t } from '$lib/i18n';
  import { browser } from '$app/environment';
  import { isTermsModalOpen } from '$lib/stores/modalStore';
  import { user as userStore } from '$lib/stores/userStore';
  import { get } from 'svelte/store';
  import { debounce } from '$lib/utils/debounce';

  let clipUrl = '';
  let guess = '';
  let result: any = null;
  let guesses: { guess: string; correct: boolean; score?: number }[] = [];
  let showSubscribeModal = false;
  let userFetchInFlight: Promise<any> | null = null;
  let creditUrl: string | null = null;

  let guessHistoryPromise: Promise<any[]> | null = null;

  async function ensureUserLoaded() {
  if (!browser || get(userStore) || userFetchInFlight) return;

    userFetchInFlight = (async () => {
      try {
        const apiUser = await fetchUserWithRetry();
        if (apiUser) {
          localStorage.setItem(getTodayKey('user_history_'), JSON.stringify(apiUser));
          // user.set(apiUser);
        }
      } catch (error) {
        console.error('Failed to fetch user from API:', error);
      } finally {
        userFetchInFlight = null;
      }
    })();
  }

  async function ensureGuessHistoryLoaded() {
    if (!browser || guessHistoryPromise !== null) return;
    clearDailyHistory();
    guessHistoryPromise = (async () => {
      try {
        const apiGuesses = await fetchGuessHistoryWithRetry();
        localStorage.setItem(getTodayKey('guess_history_'), JSON.stringify(apiGuesses));
        return apiGuesses;
      } catch (error) {
        console.error('Failed to fetch guess history from API:', error);
        return getGuessHistory();
      }
    })();
  }

  clerkStore.subscribe(async ({ session }) => {
    const clerkUser = session?.user;
    if (clerkUser && browser && !get(userStore)) {
      await ensureUserLoaded();
      await ensureGuessHistoryLoaded();
    } else if (!clerkUser && browser) {
      clearLocalData();
      guesses = getGuessHistory();
      guessHistoryPromise = null;
    }
  });

  onMount(async () => {
    clipUrl = await fetchClipWithRetry();
    const { session } = get(clerkStore);
    if (session?.user && browser) {
      await ensureUserLoaded();
      await ensureGuessHistoryLoaded();
    } else {
      guesses = getGuessHistory();
    }
  });

  $: if (guessHistoryPromise) {
    guessHistoryPromise.then((resolvedGuesses) => {
      guesses = resolvedGuesses;
    }).catch((e) => {
      console.error('Error resolving guessHistoryPromise:', e);
      guesses = getGuessHistory();
    });
  }

  $: if ($userStore) {
    isTermsModalOpen.set($userStore.agree_to_conditions_and_terms == null);
  }

  const handleSubmit = debounce(async () => {
    if (!get(userStore)) {
      goto('/sign-in');
      return;
    }

    if (!guess.trim()) {
      result = $t('page.errors.emptyGuess');
      return;
    }

    if (remainingGuesses() <= 0) {
      showSubscribeModal = true;
      result = $t('page.errors.dailyLimit');
      return;
    }

    try {
      const message = await submitGuess(guess);
      const correct = message?.is_correct;

      if (message.credit_url) {
        creditUrl = message.credit_url;
      }

      saveGuess(guess, correct, message.score);
      guesses = getGuessHistory();
      result = message;
      guess = '';
    } catch (error: any) {
      console.error('Error submitting guess:', error);
      result = { message: error.message || 'An unknown error occurred.', is_correct: false };
    }
  }, 500);
</script>

<div class="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#1e293b] to-black text-white space-y-8">
  <div class="text-center space-y-2">
    <h1 class="text-4xl font-extrabold tracking-tight">{$t('page.title')}</h1>
    <p class="text-lg text-gray-300 italic">{$t('page.subtitle')}</p>
  </div>

  <div class="bg-[#0f172a] rounded-2xl shadow-lg p-6 w-full max-w-md space-y-6 border border-gray-700">
    {#if $userStore?.firstName}
      <p class="text-sm text-green-400">👤 {$userStore.firstName}, {$t('page.signedIn')}</p>
    {/if}
    <AudioPlayer {clipUrl} />
    <GuessInput bind:guess on:submit={handleSubmit} />
    <SubmitButton onClick={handleSubmit} />

    {#if creditUrl}
      <div class="text-center p-4 bg-green-500/20 rounded-lg">
        <p>{$t('page.correctGuess')}</p>
        <a href={creditUrl} target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">
          {$t('page.watchOnYouTube')}
        </a>
      </div>
    {/if}

    {#if guessHistoryPromise}
      {#await guessHistoryPromise}
        <p>{$t('page.loadingHistory')}</p>
      {:then}
      {:catch error}
        <p class="text-red-500">Error loading history: {error.message}</p>
      {/await}
    {/if}

    {#if guesses.length}
      <div class="mt-4 space-y-2">
        <h2 class="text-lg font-semibold">{$t('page.guessesToday')} {guesses.length}/5</h2>
        <ul class="text-sm space-y-1">
          {#each guesses as g, i}
            <li class="flex justify-between items-center px-3 py-1 rounded bg-gray-900 border border-gray-700">
              <span>{i + 1}. {g.guess}</span>
              <span class="flex items-center space-x-2">
                <span class={g.correct ? 'text-green-400' : 'text-red-500'}>
                  {g.correct ? '✅' : '❌'}
                </span>
                <span class="text-xs text-gray-400">({g.score || 'N/A'})</span>
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  {#if showSubscribeModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl text-center text-black">
        <h2 class="text-2xl font-bold mb-4">{$t('page.subscribe.title')}</h2>
        <p class="mb-4">{$t('page.subscribe.subtitle')}</p>
        <PayPalButton userId={$userStore?.id} />
        <button
          on:click={() => (showSubscribeModal = false)}
          class="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          {$t('page.subscribe.close')}
        </button>
      </div>
    </div>
  {/if}
</div>

{#if $isTermsModalOpen}
  <TermsAndConditionsModal />
{/if}