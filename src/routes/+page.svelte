<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { userSession } from '$lib/store';
	import type { CurrentlyPlaying } from '../types';

	let currentlyPlaying: CurrentlyPlaying | null = null;
	let isLoading = false;
	let isRefreshing = false; // NEW: State for subtle background refreshing

	// --- Auth Functions ---
	async function loginWithSpotify() {
		await supabase.auth.signInWithOAuth({
			provider: 'spotify',
			options: {
				scopes:
					'user-read-email playlist-read-private user-read-playback-state user-modify-playback-state'
			}
		});
	}

	async function logout() {
		await supabase.auth.signOut();
		currentlyPlaying = null;
	}

	// --- Fetch Function (UPDATED) ---
	async function getCurrentlyPlaying(token: string, isRefresh = false) {
		// Only show the main "Loading..." screen on the initial load
		if (!isRefresh) {
			isLoading = true;
		}

		const endpoint = 'https://api.spotify.com/v1/...';

		const response = await fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (response.status === 204) {
			currentlyPlaying = null;
		} else if (response.ok) {
			const data = await response.json();
			currentlyPlaying = data;
		}

		isLoading = false;
	}

	// --- Player Control Functions (UPDATED) ---
	async function playerAction(endpoint: string, method: 'PUT' | 'POST') {
		if (!$userSession?.provider_token) return;

		isRefreshing = true; // Start the subtle refresh effect

		try {
			const response = await fetch(endpoint, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${$userSession.provider_token}`
				},
				body: JSON.stringify({})
			});

			if (!response.ok) {
				// Error handling...
				const errorData = await response.json().catch(() => ({}));
				const message = errorData?.error?.message || response.statusText;
				console.error('Spotify API Error:', message);
				alert(`Error: ${message}`);
			} else {
				// On success, wait briefly then get the new state
				setTimeout(() => {
					if ($userSession?.provider_token) {
						getCurrentlyPlaying($userSession.provider_token, true); // Pass `true` for refresh
					}
				}, 500);
			}
		} catch (e) {
			console.error('Network or other error:', e);
			alert('An unexpected network error occurred.');
		} finally {
			// Stop the refresh effect after a short delay, letting the UI update first
			setTimeout(() => {
				isRefreshing = false;
			}, 700);
		}
	}

	function play() {
		playerAction('https://api.spotify.com/v1/me/player/play', 'PUT');
	}

	function pause() {
		playerAction('https://api.spotify.com/v1/me/player/pause', 'PUT');
	}

	function nextTrack() {
		playerAction('https://api.spotify.com/v1/me/player/next', 'POST');
	}

	function prevTrack() {
		playerAction('https://api.spotify.com/v1/me/player/previous', 'POST');
	}

	// --- Reactive Statement ---
	$: if ($userSession && $userSession.provider_token) {
		getCurrentlyPlaying($userSession.provider_token);
	}
</script>

<main>
	{#if $userSession}
		<div class="user-info">
			<p>Logged in as: <strong>{$userSession.user.email}</strong></p>
			<button class="logout-btn" on:click={logout}>Logout</button>
		</div>

		<div class="player" class:refreshing={isRefreshing}>
			{#if isLoading}
				<p>Loading...</p>
			{:else if currentlyPlaying}
				<img
					src={currentlyPlaying.item.album.images[0].url}
					alt="Album art for {currentlyPlaying.item.album.name}"
					class="album-art"
				/>
				<div class="song-details">
					<p class="song-title">{currentlyPlaying.item.name}</p>
					<p class="artist-name">{currentlyPlaying.item.artists.map((a) => a.name).join(', ')}</p>
				</div>
				<div class="controls">
					<button on:click={prevTrack} aria-label="Previous Track">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
							><path
								d="M16 18V6l-8.5 6L16 18zm-1.5 0l-6.5-4.5 6.5-4.5V18zM4 6h2v12H4V6z"
							/></svg
						>
					</button>
					{#if currentlyPlaying.is_playing}
						<button on:click={pause} aria-label="Pause">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
								><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg
							>
						</button>
					{:else}
						<button on:click={play} aria-label="Play">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
								><path d="M8 19V5l11 7l-11 7z" /></svg
							>
						</button>
					{/if}
					<button on:click={nextTrack} aria-label="Next Track">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
							><path d="m6 18l8.5-6L6 6v12zM8 9.86L11.03 12L8 14.14V9.86zM18 6h-2v12h2V6z" /></svg
						>
					</button>
				</div>
			{:else}
				<p>No song is currently playing on Spotify.</p>
				<p><small>(Start playing a song on another device.)</small></p>
			{/if}
		</div>
	{:else}
		<h1>Spotify Controller</h1>
		<button class="login-btn" on:click={loginWithSpotify}>Login with Spotify</button>
	{/if}
</main>

<style>
	/* ... all previous styles ... */
	:root {
		--spotify-green: #1db954;
		--spotify-white: #ffffff;
		--spotify-light-gray: #b3b3b3;
		--spotify-black: #191414;
	}
	main {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100vh;
		width: 100vw;
		background-color: var(--spotify-black);
		color: var(--spotify-white);
		gap: 1rem;
		text-align: center;
		padding: 1rem;
		box-sizing: border-box;
	}
	.user-info {
		position: absolute;
		top: 10px;
		right: 10px;
		text-align: right;
		font-size: 0.8rem;
	}
	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		transition: opacity 0.3s ease; /* Smooth transition for the effect */
	}
	/* NEW: The style for our refreshing state */
	.player.refreshing {
		opacity: 0.6;
	}
	.album-art {
		width: 300px;
		height: 300px;
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
	}
	.song-details {
		text-align: center;
	}
	.song-title {
		font-size: 1.5rem;
		font-weight: bold;
		margin: 0.5rem 0 0.2rem;
	}
	.artist-name {
		font-size: 1rem;
		color: var(--spotify-light-gray);
		margin: 0;
	}
	.login-btn,
	.logout-btn {
		font-size: 1rem;
		font-weight: bold;
		padding: 10px 24px;
		cursor: pointer;
		background-color: var(--spotify-green);
		color: var(--spotify-white);
		border: none;
		border-radius: 50px;
	}
	.logout-btn {
		font-size: 0.8rem;
		padding: 6px 12px;
		margin-top: 5px;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}
	.controls button {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--spotify-light-gray);
		transition: all 0.2s ease-in-out;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.controls button:hover {
		color: var(--spotify-white);
	}
	.controls button svg {
		width: 32px;
		height: 32px;
		fill: currentColor;
	}
	.controls button:nth-child(2) {
		color: var(--spotify-white);
		width: 48px;
		height: 48px;
	}
	.controls button:nth-child(2) svg {
		width: 48px;
		height: 48px;
	}
</style>