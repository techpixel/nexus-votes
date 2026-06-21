<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/favicon.png" />
	<link rel="preconnect" href="https://assets.hackclub.com" crossorigin="anonymous" />
</svelte:head>

{@render children()}
