<script>
	import gearIcon from '$lib/assets/gear.png';
</script>

<img src={gearIcon} alt="Settings" />

<style>
	img {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 2.5rem;
		transition: transform 0.2s ease;
	}

	img:hover {
		cursor: pointer;
		transform: rotate(60deg);
	}
</style>
