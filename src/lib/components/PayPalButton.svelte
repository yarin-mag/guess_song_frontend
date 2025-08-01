
<script lang="ts">
  import { onMount } from 'svelte';
  import { loadScript } from '@paypal/paypal-js';
  import { PUBLIC_PAYPAL_CLIENT_ID, PUBLIC_PAYPAL_PLAN_ID } from '$env/static/public';
  import { t } from '$lib/i18n';

  export let userId: string | undefined;

  onMount(async () => {
    try {
      const paypal = await loadScript({
        clientId: PUBLIC_PAYPAL_CLIENT_ID,
        currency: 'USD',
        intent: 'subscription',
        vault: true
      });

      if (paypal) {
        paypal
          .Buttons({
            style: {
              shape: 'pill',
              color: 'blue',
              layout: 'vertical',
              label: 'subscribe'
            },
            createSubscription: function (data, actions) {
              if (!userId) {
                alert('You must be signed in to subscribe.');
                throw new Error('User ID not found');
              }
              return actions.subscription.create({
                plan_id: PUBLIC_PAYPAL_PLAN_ID,
                custom_id: userId // 👈 THIS is what the webhook reads
              });
            },
            onApprove: function (data, actions) {
              alert($t('payPal.success', { values: { id: data.subscriptionID } }));
              // The backend webhook will handle the subscription update.
            },
            onError: function (err) {
              console.error('PayPal error:', err);
              alert($t('payPal.error'));
            }
          })
          .render('#paypal-button-container');
      }
    } catch (error) {
      console.error('Failed to load PayPal SDK:', error);
    }
  });
</script>

<div id="paypal-button-container"></div>
