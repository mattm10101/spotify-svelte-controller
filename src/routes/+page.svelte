<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { userSession } from '$lib/store';
	import type { CurrentlyPlaying } from '../types';
	import './styles.css';

	let currentlyPlaying: CurrentlyPlaying | null = null;
	let isLoading = false;
	let isRefreshing = false;

	// --- UI State ---
	let theme = 'dark';
	let showAlbumArt = false;
	let isUserInfoExpanded = false;
	let isUiControlsExpanded = false;
	let volume = 100; // State for volume

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
	}
	function toggleAlbumArt() {
		showAlbumArt = !showAlbumArt;
	}
	function toggleUserInfo() {
		isUserInfoExpanded = !isUserInfoExpanded;
	}
	function toggleUiControls() {
		isUiControlsExpanded = !isUiControlsExpanded;
	}

	// --- Auth & API Functions ---
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
	async function getCurrentlyPlaying(token: string, isRefresh = false) {
		if (!isRefresh) isLoading = true;
		const endpoint = 'https://api.spotify.com/v1/me/player/currently-playing';
		const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
		if (response.status === 204) {
			currentlyPlaying = null;
		} else if (response.ok) {
			const data = await response.json();
			currentlyPlaying = data;
			if (data.device) {
				volume = data.device.volume_percent;
			}
		}
		isLoading = false;
	}
	async function playerAction(endpoint: string, method: 'PUT' | 'POST') {
		if (!$userSession?.provider_token) return;
		isRefreshing = true;
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
				const errorData = await response.json().catch(() => ({}));
				const message = errorData?.error?.message || response.statusText;
				console.error('Spotify API Error:', message);
				alert(`Error: ${message}`);
			} else {
				setTimeout(() => {
					if ($userSession?.provider_token) getCurrentlyPlaying($userSession.provider_token, true);
				}, 500);
			}
		} catch (e) {
			console.error('Network or other error:', e);
		} finally {
			setTimeout(() => (isRefreshing = false), 700);
		}
	}

	async function setVolume() {
		if (!$userSession?.provider_token) return;
		// Corrected endpoint with query parameter
		const endpoint = `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`;

		await fetch(endpoint, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$userSession.provider_token}`
			}
		});
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
	$: if ($userSession && $userSession.provider_token) {
		getCurrentlyPlaying($userSession.provider_token);
	}
</script>

<main class={theme}>
	<div class="player-wrapper">
		{#if $userSession}
			<div class="player" class:refreshing={isRefreshing}>
				{#if isLoading}
					<p>Loading...</p>
				{:else if currentlyPlaying}
					<div class="song-details">
						<p class="song-title">{currentlyPlaying.item.name}</p>
						<p class="artist-name">{currentlyPlaying.item.artists.map((a: any) => a.name).join(', ')}</p>
					</div>

					{#if showAlbumArt}
						<img
							src={currentlyPlaying.item.album.images[0].url}
							alt="Album art for {currentlyPlaying.item.album.name}"
							class="album-art"
						/>
					{/if}

					<div class="controls">
						<button on:click={prevTrack} aria-label="Previous Track">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
								><path d="M6 6h2v12H6zm3.5 6L18 6v12l-8.5-6z" /></svg
							>
						</button>
						<button
							class="play-pause-btn"
							class:playing={currentlyPlaying.is_playing}
							on:click={currentlyPlaying.is_playing ? pause : play}
							aria-label={currentlyPlaying.is_playing ? 'Pause' : 'Play'}
						>
							{#if currentlyPlaying.is_playing}
								<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
									><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg
								>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
									><path d="M8 5v14l11-7z" /></svg
								>
							{/if}
						</button>
						<button on:click={nextTrack} aria-label="Next Track">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
								><path d="M6 18v-12l8.5 6L6 18zM16 6h2v12h-2z" /></svg
							>
						</button>
					</div>

					<div class="volume-container">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
							><path
								d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
							/></svg
						>
						<input
							type="range"
							min="0"
							max="100"
							bind:value={volume}
							on:change={setVolume}
							style="--value: {volume}"
							aria-label="Volume"
						/>
					</div>

					<div class="collapsible-section">
						<div class="collapsible-panel" class:expanded={isUiControlsExpanded}>
							<button type="button" class="panel-header" on:click={toggleUiControls}>
								<span>UI Controls</span>
								<svg
									class="chevron"
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg
								>
							</button>
							<div class="panel-content">
								<button class="icon-btn" on:click={toggleAlbumArt} aria-label="Toggle Album Art">
									{#if showAlbumArt}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											><path
												d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
											/></svg
										>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											><path
												d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 9.88 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
											/></svg
										>
									{/if}
								</button>
								<button class="icon-btn" on:click={toggleTheme} aria-label="Toggle Theme">
									{#if theme === 'dark'}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											><path
												d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"
											/></svg
										>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											><path
												d="M12.3 4.9c.4-.2.6-.7.4-1.1s-.7-.6-1.1-.4C7.2 5.5 4 9.4 4 14c0 4.4 3.6 8 8 8s8-3.6 8-8c0-2.1-.8-4-2.2-5.5-.4-.4-.9-.3-1.2.1s-.3.9.1 1.2c1.1 1.2 1.8 2.8 1.8 4.4 0 3.3-2.7 6-6 6s-6-2.7-6-6c0-3.4 2.4-6.3 5.7-6.9.1 0 .2-.1.3-.2z"
											/></svg
										>
									{/if}
								</button>
							</div>
						</div>

						<div class="collapsible-panel" class:expanded={isUserInfoExpanded}>
							<button type="button" class="panel-header" on:click={toggleUserInfo}>
								<span>{$userSession.user.email}</span>
								<svg
									class="chevron"
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg
								>
							</button>
							<div class="panel-content">
								<button class="logout-btn" on:click={logout}>Logout</button>
							</div>
						</div>
					</div>
				{:else}
					<p>No song is currently playing on Spotify.</p>
					<p><small>(Start playing a song on another device.)</small></p>
				{/if}
			</div>
		{:else}
			<div class="login-container">
				<h1>Spotify Controller</h1>
				<button class="login-btn" on:click={loginWithSpotify}>Login with Spotify</button>
			</div>
		{/if}
	</div>
</main>
