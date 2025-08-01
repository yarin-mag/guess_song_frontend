<style>
  @import '../app.css';

  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
  }

  * {
    box-sizing: border-box;
  }

  main {
    min-height: 100vh;
    width: 100vw;
    overflow: auto; /* Only main should scroll if needed */
  }
</style>

<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import TermsAndConditionsModal from '$lib/components/TermsAndConditionsModal.svelte';
  import { clerkStore } from '../hooks.client';
  import { onMount } from 'svelte';
  import { t, locale, locales, loadTranslations } from '$lib/i18n';
  import type { LayoutData } from './$types';
  import { ClerkProvider } from 'svelte-clerk';
  import { derived, get } from 'svelte/store';
  import { enUS, heIL } from '@clerk/localizations';
  import { cancelSubscription as cancelSubAPI } from '$lib/utils/api';
	import { browser } from '$app/environment';
  import { user as userStore } from '$lib/stores/userStore';
  import { isTermsModalOpen } from '$lib/stores/modalStore';
  import Footer from '$lib/components/Footer.svelte';

  export let data: LayoutData;

  let loadingTranslations = true;
  let user = null;
  let client = null;
  let showSubscriptionModal = false;
  let previousSessionId: string | null = null;

  $: if (browser && get(locale)) {
    loadTranslations(get(locale))?.then(() => {
      loadingTranslations = false;
    });
  }
  async function cancelSubscription() {
    try {
      if(!user) {
        return;
      }
      
      await cancelSubAPI();

      alert("Subscription cancelled.");
      showSubscriptionModal = false;
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      alert(error.message || "Something went wrong while cancelling your subscription.");
    }
  }

  clerkStore.subscribe(async (value) => {
  const currentSession = value.session;
  user = currentSession?.user ?? null;
  client = value.client;

  const currentSessionId = currentSession?.id ?? null;

  if (previousSessionId && !currentSessionId) {
      console.log("[Clerk] User signed out — cleaning up...");

      userStore.set(null);
      isTermsModalOpen.set(false);
      localStorage.clear();
      window.location.href = '/';
    }

    previousSessionId = currentSessionId;
  });

  $: if (browser && client && user && typeof window !== 'undefined') {
    const userButtonNode = document.getElementById('user-button');
    if (userButtonNode) {
      client.mountUserButton(userButtonNode);
    }
  }

  async function handleLanguageChange(e) {
	const lang = e.target.value;
	localStorage.setItem('lang', lang);
	locale.set(lang);
	await loadTranslations(lang);
}

  const clerkLocalization = derived(locale, ($locale) => {
    switch ($locale) {
      case 'he':
        return heIL;
      case 'en':
      default:
        return enUS;
    }
  });
</script>

<header class="flex justify-between items-center p-4 bg-gray-800 text-white">
  <a href="/" class="text-2xl font-bold">{$t('layout.title')}</a>
  <div class="flex items-center">
    <select on:change={handleLanguageChange} bind:value={$locale} class="bg-gray-700 text-white rounded p-1 mr-4">
      {#each $locales as l}
        <option value={l}>{l}</option>
      {/each}
    </select>
    {#if user}
      <button
        class="bg-gray-700 text-white rounded px-3 py-1 ml-2 hover:bg-gray-600"
        on:click={() => showSubscriptionModal = true}
      >
        {$t('layout.subscription')}
      </button>
    {/if}
    {#if user}
      <div id="user-button"></div>
    {:else}
      <a href="/sign-in" class="mr-4">{$t('layout.signIn')}</a>
      <a href="/sign-up">{$t('layout.signUp')}</a>
    {/if}
  </div>
</header>

<main class="w-full h-[100vh] bg-gradient-to-br from-[#1e1b4b] via-[#1e293b] to-black text-white">
  <ClerkProvider localization={clerkLocalization}>
    <slot />
  </ClerkProvider>
</main>
<Footer />

{#if showSubscriptionModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-xl text-black w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">{$t('modal.subscription.title')}</h2>
      {#if user?.publicMetadata?.is_subscribed}
        <p>{$t('modal.subscription.active')}</p>
        <button
          on:click={cancelSubscription}
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          {$t('modal.subscription.cancel')}
        </button>
      {:else}
        <p>{$t('modal.subscription.inactive')}</p>
      {/if}
      <button
        on:click={() => showSubscriptionModal = false}
        class="mt-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
      >
        {$t('modal.subscription.close')}
      </button>
    </div>
  </div>
{/if}
