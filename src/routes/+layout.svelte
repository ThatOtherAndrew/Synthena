<script lang="ts">
	import logo from '$lib/assets/logo.png';

	let { children } = $props();
</script>

<svelte:head>
	<title>Synthena!</title>
	<link rel="icon" href={logo} />
</svelte:head>

{@render children()}
