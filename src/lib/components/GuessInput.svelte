<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';

  export let guess: string;

  const dispatch = createEventDispatcher();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      dispatch('submit');
    }
  }
</script>

<div class="relative w-full rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
  <input
    id="guess"
    type="text"
    placeholder=" "
    bind:value={guess}
    on:keydown={handleKeydown}
    class="peer w-full bg-gray-900 border-none rounded-none px-4 pt-6 pb-2 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <label
    for="guess"
    class="absolute left-4 top-2.5 text-gray-400 text-sm transition-all duration-200
           peer-focus:text-blue-400 peer-focus:-top-2 peer-focus:text-xs
           peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400"
  >
    {$t('guessInput.placeholder')}
  </label>
</div>
