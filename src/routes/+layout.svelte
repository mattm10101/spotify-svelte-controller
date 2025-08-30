<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { userSession } from '$lib/store';

  onMount(() => {
    // This runs once when the component mounts on the client.
    // It checks if the user is already logged in from a previous session.
    supabase.auth.getSession().then(({ data }) => {
      userSession.set(data.session);
    });

    // This sets up a listener. Whenever the user logs in or out,
    // Supabase sends an event, and we update our store.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      userSession.set(session);
    });

    // Cleanup the listener when the component is destroyed
    return () => {
      subscription.unsubscribe();
    };
  });
</script>

<slot />