<script lang="ts">
	// Shadcn-Svelte Component Imports
	import { Button } from '../components/ui/button/index.ts';
	import { Input } from '../components/ui/input/index.ts';
	import { Label } from '../components/ui/label/index.ts';
	import * as Alert from '../components/ui/alert/index.ts';
	import * as Card from '../components/ui/card/index.ts';

	// State
	let email = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let success = $state(false);

	// Handler for form submission
	async function handleSubmit() {
		isLoading = true;
		error = '';

		try {
			const response = await fetch('https://cms.sgxp.me/api/users/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email }),
			});

			const data = await response.json();

			if (response.ok) {
				success = true;
			} else {
				const errorMessage = data.errors?.[0]?.message || data.message || 'Failed to send reset email. Please try again.';
				error = errorMessage;
			}
		} catch (err) {
			console.error('Network error:', err);
			error = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="theme-compatible-login">
	{#if success}
		<Card.Root class="login-card">
			<Card.Content class="pt-6">
				<div class="text-center space-y-4">
					<div class="text-2xl">📧</div>
					<Card.Title class="text-lg theme-title">Check Your Email!</Card.Title>
					<Card.Description class="theme-description">
						We've sent you a password reset link. Please check your inbox and click the link to reset your password.
						The link will expire in 10 minutes.
					</Card.Description>
					<Button href="/login" class="theme-button">
						Back to Login
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root class="login-card">
			<Card.Header class="space-y-1">
				<Card.Title class="text-2xl text-center theme-title">Forgot Password</Card.Title>
				<Card.Description class="text-center theme-description">
					Enter your email address and we'll send you a link to reset your password.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
					<div class="space-y-2">
						<Label for="email" class="theme-label">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="sonic@hedgehog.net"
							bind:value={email}
							oninput={() => (error = '')}
							required
							disabled={isLoading}
							autocomplete="email"
							class="theme-input"
						/>
					</div>
					{#if error}
						<Alert.Root variant="destructive" class="theme-alert">
							<Alert.Description class="theme-alert-text">{error}</Alert.Description>
						</Alert.Root>
					{/if}
					<Button type="submit" class="w-full theme-button" disabled={isLoading}>
						{#if isLoading}
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
							Sending...
						{:else}
							Send Reset Link
						{/if}
					</Button>
				</form>
				<div class="text-center mt-4">
					<p class="text-sm theme-description">
						Remember your password?{' '}
						<a href="/login" class="theme-link">Sign in</a>
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<style>
	.theme-compatible-login {
		margin: auto;
		margin-top: 200px;
		width: 100%;
		max-width: 400px;
	}

	.theme-compatible-login :global(.login-card) {
		background: var(--page-color);
		border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
		border-radius: 0px;
		box-shadow: var(--box-shadow);
		width: 100%;
	}

	.theme-compatible-login :global(.theme-title) {
		color: var(--font-color);
		font-family: 'saira', monospace;
		font-weight: 800;
		text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
	}

	.theme-compatible-login :global(.theme-description) {
		color: var(--font-color);
		font-family: 'saira', monospace;
		opacity: 0.8;
	}

	.theme-compatible-login :global(.theme-label) {
		color: var(--font-color);
		font-family: 'saira', monospace;
		font-weight: 600;
		font-size: 14px;
		text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
	}

	.theme-compatible-login :global(.theme-input) {
		background: color-mix(in srgb, var(--page-color) 60%, black);
		border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
		border-radius: 0px;
		color: var(--font-color);
		font-family: 'saira', monospace;
		font-size: 14px;
		transition: all var(--transition-speed, 200ms) ease-in-out;
		text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
	}

	.theme-compatible-login :global(.theme-input:focus) {
		border-color: var(--font-link-color);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent);
		outline: none;
	}

	.theme-compatible-login :global(.theme-input::placeholder) {
		color: color-mix(in srgb, var(--font-color) 60%, transparent);
	}

	.theme-compatible-login :global(.theme-button) {
		background: var(--font-link-color);
		color: var(--page-color);
		border: none;
		border-radius: 0px;
		font-family: 'saira', monospace;
		font-weight: 700;
		font-size: 14px;
		transition: all var(--transition-speed, 200ms) ease-in-out;
		cursor: url('/img/Sonic_Cursor.png'), pointer;
		box-shadow: var(--box-shadow);
		text-shadow: none;
	}

	.theme-compatible-login :global(.theme-button:hover:not(:disabled)) {
		background: color-mix(in srgb, var(--font-link-color) 80%, white);
		cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
	}

	.theme-compatible-login :global(.theme-button:disabled) {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.theme-compatible-login :global(.theme-alert) {
		background: color-mix(in srgb, var(--font-link-color) 20%, var(--page-color));
		border: var(--border-width) var(--border-style) var(--font-link-color);
		border-radius: 0px;
	}

	.theme-compatible-login :global(.theme-alert-text) {
		color: var(--font-link-color);
		font-family: 'saira', monospace;
		font-size: 14px;
		font-weight: 600;
	}

	.theme-link {
		color: var(--font-link-color);
		text-decoration: none;
		font-family: 'saira', monospace;
		font-weight: 600;
		transition: all var(--transition-speed, 200ms) ease-in-out;
	}

	.theme-link:hover {
		color: color-mix(in srgb, var(--font-link-color) 80%, white);
		cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
	}

	@media (max-width: 800px) {
		.theme-compatible-login {
			max-width: 100%;
			padding: 0 1rem;
		}
	}
</style>
