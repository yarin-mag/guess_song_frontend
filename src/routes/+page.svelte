<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import AudioPlayer from '$lib/components/AudioPlayer.svelte';
  import GuessInput from '$lib/components/GuessInput.svelte';
  import SubmitButton from '$lib/components/SubmitButton.svelte';
  import PayPalButton from '$lib/components/PayPalButton.svelte';
  import TermsAndConditionsModal from '$lib/components/TermsAndConditionsModal.svelte';
  import { fetchTodayAndYesterdaySongsWithRetry, fetchGuessHistoryWithRetry, fetchUserWithRetry, submitGuess, fetchWinnerSongWithRetry } from '$lib/utils/api';
  import { getGuessHistory, saveGuess, remainingGuesses, clearDailyHistory, getTodayKey, getLocalUser, clearLocalData, getWinnerSong, saveWinnerSong } from '$lib/utils/localDataFuncs';
  import { clerkStore } from '../hooks.client';
  import { t } from '$lib/i18n';
  import { browser } from '$app/environment';
  import { isTermsModalOpen } from '$lib/stores/modalStore';
  import { user as userStore } from '$lib/stores/userStore';
  import winningSong from '$lib/stores/songStore';
  import { get } from 'svelte/store';
  import { debounce } from '$lib/utils/debounce';

  let dailySongs: { today: { clip_url: string; credit_clip?: string } | null; yesterday: { title: string; artist: string; clip_url: string; } | null; } = { today: null, yesterday: null };
  let guess = '';
  let result: any = null;
  let guesses: { guess: string; correct: boolean; score?: number }[] = [];
  let showSubscribeModal = false;
  let userFetchInFlight: Promise<any> | null = null;
  let creditUrl: string | null = null; // This will still be used for today's correct guess credit_url
  let title: string | null = null;
  let artist: string | null = null;

  let guessHistoryPromise: Promise<any[]> | null = null;
  let fetchWinnerSongPromise: Promise<any> | null = null;

  async function ensureUserLoaded() {
  if (!browser || get(userStore) || userFetchInFlight) return;

    userFetchInFlight = (async () => {
      try {
        const apiUser = await fetchUserWithRetry();
        if (apiUser) {
          localStorage.setItem(getTodayKey('user_history_'), JSON.stringify(apiUser));
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

  async function ensureTryingToFetchWinnerSong() {
    if (!browser || fetchWinnerSongPromise !== null) return;

    const localWinnerSong = getWinnerSong();
    if (localWinnerSong) {
      fetchWinnerSongPromise = Promise.resolve(localWinnerSong);
      return;
    }

    fetchWinnerSongPromise = (async () => {
      try {
        const apiWinnerSong = await fetchWinnerSongWithRetry();
        if (apiWinnerSong) {
          saveWinnerSong(apiWinnerSong.title, apiWinnerSong.artist, apiWinnerSong.credit_url);
        }
        return apiWinnerSong;
      } catch (error) {
        console.error('Failed to fetch winner song from API:', error);
        return null;
      }
    })();
  }

  clerkStore.subscribe(async ({ session }) => {
    const clerkUser = session?.user;
    if (clerkUser && browser && !get(userStore)) {
      await ensureUserLoaded();
      await ensureGuessHistoryLoaded();
      await ensureTryingToFetchWinnerSong();
    } else if (!clerkUser && browser) {
      clearLocalData();
      guesses = getGuessHistory();
      guessHistoryPromise = null;
    }
  });

  onMount(async () => {
    const song = get(winningSong);
    if (song) {
      creditUrl = song.credit_url;
      title = song.title;
      artist = song.artist;
    }
    dailySongs = await fetchTodayAndYesterdaySongsWithRetry();
    const { session } = get(clerkStore);
    if (session?.user && browser) {
      await ensureUserLoaded();
      await ensureGuessHistoryLoaded();
      await ensureTryingToFetchWinnerSong();
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

  $: if (fetchWinnerSongPromise) {
    fetchWinnerSongPromise.then((resolvedWinnerSong) => {
      creditUrl = resolvedWinnerSong.credit_url;
      title = resolvedWinnerSong.title;
      artist = resolvedWinnerSong.artist;
    }).catch((e) => {
      console.error('Error resolving fetchWinnerSongPromise:', e);
      const _winningSong = getWinnerSong();
      creditUrl = _winningSong?.credit_url || '';
      title = _winningSong?.title || '';
      artist = _winningSong?.artist || '';
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
        const song = {
          title: message.title,
          artist: message.artist,
          credit_url: message.credit_url,
        }
        winningSong.set(song);
        creditUrl = message.credit_url;
        title = message.title;
        artist = message.artist;
        title && artist && creditUrl && saveWinnerSong(title, artist, creditUrl);
      }
      saveGuess(guess, correct, message.score);
      guesses = getGuessHistory();
      result = message;
      guess = '';
    } catch (error: any) {
      console.error('Error submitting guess:', error);
      result = { message: error.message || $t('page.errors.unknown'), is_correct: false };
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
    <AudioPlayer clipUrl={dailySongs.today?.clip_url} />
    <GuessInput bind:guess on:submit={handleSubmit} />
    <SubmitButton onClick={handleSubmit} />

    {#if creditUrl}
      <div class="text-center p-4 bg-green-500/20 rounded-lg">
        <p>{title} {$t('page.by')} {artist}</p>
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
        <p class="text-red-500">{$t('page.errors.history', { message: error.message })}</p>
      {/await}
    {/if}

    {#if guesses.length}
      <div class="mt-4 space-y-2">
        <h2 class="text-lg font-semibold">{$t('page.guessesTodayCount')} {guesses.length} '/'</h2>
        <ul class="text-sm space-y-1">
          {#each guesses as g, i}
            <li class="flex justify-between items-center px-3 py-1 rounded bg-gray-900 border border-gray-700">
              <span>{i + 1}. {g.guess}</span>
              <span class="flex items-center space-x-2">
                <span class={g.correct ? 'text-green-400' : 'text-red-500'}>
                  {g.correct || g.score === 1000 ? '✅' : '❌'}
                </span>
                <span class="text-xs text-gray-400">({g.score || $t('page.notAvailable')})</span>
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  {#if dailySongs.yesterday}
    <div class="bg-[#0f172a] rounded-2xl shadow-lg p-6 w-full max-w-md space-y-4 border border-gray-700 mt-8">
      <h2 class="text-xl font-bold text-center text-gray-300">{$t('page.yesterdaySolution')}</h2>
      <p class="text-center text-lg">
        <span class="font-semibold">{dailySongs.yesterday.title}</span>
        {$t('page.by')}
        <span class="font-semibold">{dailySongs.yesterday.artist}</span>
      </p>
      {#if dailySongs.yesterday.credit_clip}
        <a href={dailySongs.yesterday.credit_clip} target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline block text-center">
          {$t('page.watchOnYouTube')}
        </a>
      {/if}
    </div>
  {/if}

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