<script lang="ts">
	import { onMount } from 'svelte';
	
	// Shadcn-Svelte Component Imports
	import { Button } from '../components/ui/button/index.ts';
	import { Input } from '../components/ui/input/index.ts';
	import { Label } from '../components/ui/label/index.ts';
	import * as Alert from '../components/ui/alert/index.ts';
	import * as Card from '../components/ui/card/index.ts';
	import * as Tabs from '../components/ui/tabs/index.ts';

	// Login form state using Svelte 5 Runes
	let loginFormData = $state({
		email: '',
		password: ''
	});
	let isLoginLoading = $state(false);
	let loginError = $state('');

	// Register form state
	let registerFormData = $state({
		username: '',
		displayName: '',
		email: '',
		password: '',
		confirmPassword: ''
	});
	let isRegisterLoading = $state(false);
	let registerError = $state('');
	let registrationSuccess = $state(false);

	// General state
	let success = $state(false);
	let isCheckingAuth = $state(true);
	let activeTab = $state('login');

	// Check for existing login and set up cross-tab event listeners on component mount
	onMount(() => {
    // Async function to check auth status
    const checkInitialAuth = async () => {
    try {
        // Use local API route instead of calling Payload CMS directly
        const response = await fetch('/api/users/me', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();

            // Check if we actually have user data
            if (data && (data.id || data.email)) {
                window.location.href = '/';
                return;
            } else {
                isCheckingAuth = false;
            }
        } else {
            isCheckingAuth = false;
        }
    } catch (err) {
        console.error('Error checking auth:', err);
        isCheckingAuth = false;
    }
};

    // Call the async function immediately
    checkInitialAuth();

    // Set up event listeners (synchronous)
    const handleUserLogin = () => {
        console.log('Login event received, redirecting...');
        window.location.href = '/';
    };

    window.addEventListener('userLogin', handleUserLogin);

    // Return cleanup function (synchronous)
    return () => {
        window.removeEventListener('userLogin', handleUserLogin);
    };
});

	// Function to validate the username
	function validateUsername(username: string): string {
		if (!username) return '';
		if (username.length < 3) return 'Username must be at least 3 characters';
		if (username.length > 20) return 'Username must be less than 20 characters';
		if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
			return 'Username can only contain letters, numbers, underscores, and hyphens';
		}
		return '';
	}

	// Function to validate the display name
	function validateDisplayName(displayName: string): string {
		if (!displayName) return '';
		if (displayName.length < 3) return 'Display name must be at least 3 characters';
		if (displayName.length > 40) return 'Display name must be less than 40 characters';
		return '';
	}

	// Create derived state for real-time validation feedback
	let usernameValidationError = $derived(
		registerFormData.username ? validateUsername(registerFormData.username) : ''
	);

	let displayNameValidationError = $derived(
		registerFormData.displayName ? validateDisplayName(registerFormData.displayName) : ''
	);

	// Handler for login form submission
	async function handleLoginSubmit() {
        isLoginLoading = true;
        loginError = '';

        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: loginFormData.email,
                    password: loginFormData.password,
                }),
                });

            const data = await response.json();

            if (response.ok) {
            success = true;

            // Dispatch event for navbar to update
            window.dispatchEvent(new CustomEvent('userLogin'));

            setTimeout(() => {
                window.location.href = '/';
            }, 500);
            } else {
            const errorMessage = data.errors?.[0]?.message || data.message || 'Login failed. Please check your credentials.';
            loginError = errorMessage;
            }
        } catch (err) {
            console.error('Network error:', err);
            loginError = 'Network error. Please try again.';
        } finally {
            isLoginLoading = false;
        }
    }

	// Handler for register form submission
	async function handleRegisterSubmit() {
		isRegisterLoading = true;
		registerError = '';

		if (registerFormData.password !== registerFormData.confirmPassword) {
			registerError = 'Passwords do not match.';
			isRegisterLoading = false;
			return;
		}

		if (usernameValidationError) {
			registerError = usernameValidationError;
			isRegisterLoading = false;
			return;
		}

		if (displayNameValidationError) {
			registerError = displayNameValidationError;
			isRegisterLoading = false;
			return;
		}

		try {
			const response = await fetch('https://cms.sgxp.me/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    username: registerFormData.username.toLowerCase().trim(),
                    displayName: registerFormData.displayName.trim(),
                    email: registerFormData.email,
                    password: registerFormData.password,
                }),
                });

			const data = await response.json();

			if (response.ok) {
				registrationSuccess = true;
				registerFormData = { username: '', displayName: '', email: '', password: '', confirmPassword: '' };
			} else {
				const errorMessage = data.errors?.[0]?.message || data.message || 'Registration failed. Please try again.';
				registerError = errorMessage;
			}
		} catch (err) {
			console.error('Network error:', err);
			registerError = 'Network error. Please try again.';
		} finally {
			isRegisterLoading = false;
		}
	}

	// Handlers for switching tabs
	function handleSwitchToRegister(e: MouseEvent) {
		e.preventDefault();
		activeTab = 'register';
	}

	function handleSwitchToLogin(e: MouseEvent) {
		e.preventDefault();
		activeTab = 'login';
		registrationSuccess = false;
	}
</script>

{#if isCheckingAuth}
	<div class="theme-compatible-login">
		<Card.Root class="login-card">
			<Card.Content class="pt-6">
				<div class="text-center space-y-4">
					<Card.Description class="theme-description">
						Checking authentication status...
					</Card.Description>
					<div class="flex justify-center">
						<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{:else if success}
	<div class="theme-compatible-login">
		<Card.Root class="login-card">
			<Card.Content class="pt-6">
				<div class="text-center space-y-4">
					<div class="text-2xl">✅</div>
					<Card.Title class="text-lg theme-title">Success!</Card.Title>
					<Card.Description class="theme-description">
						Redirecting to home page...
					</Card.Description>
					<div class="flex justify-center">
						<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{:else if registrationSuccess}
	<div class="theme-compatible-login">
		<Card.Root class="login-card">
			<Card.Content class="pt-6">
				<div class="text-center space-y-4">
					<div class="text-2xl">📧</div>
					<Card.Title class="text-lg theme-title">Check Your Email!</Card.Title>
					<Card.Description class="theme-description">
						We've sent you a verification email. Please check your inbox and click the verification link
                        to activate your account before you can log in.
					</Card.Description>
					<Button onclick={handleSwitchToLogin} class="theme-button">
						Back to Login
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<div class="theme-compatible-login">
		<Tabs.Root bind:value={activeTab} class="login-tabs">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="login" class="theme-tab-trigger">Login</Tabs.Trigger>
				<Tabs.Trigger value="register" class="theme-tab-trigger">Register</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="login">
				<Card.Root class="login-card">
					<Card.Header class="space-y-1">
						<Card.Title class="text-2xl text-center theme-title">Sign in</Card.Title>
						<Card.Description class="text-center theme-description"> Welcome back! </Card.Description>
					</Card.Header>
					<Card.Content>
						<form onsubmit={(e) => { e.preventDefault(); handleLoginSubmit(); }} class="space-y-4">
							<div class="space-y-2">
								<Label for="login-email" class="theme-label">Email</Label>
								<Input
									id="login-email"
									type="email"
									placeholder="sonic@hedgehog.net"
									bind:value={loginFormData.email}
									oninput={() => (loginError = '')}
									required
									disabled={isLoginLoading}
									autocomplete="email"
									class="theme-input"
								/>
							</div>
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<Label for="login-password" class="theme-label">Password</Label>
									<a href="/forgot-password" class="theme-link text-sm">Forgot password?</a>
								</div>
								<Input
									id="login-password"
									type="password"
									placeholder="Enter your password"
									bind:value={loginFormData.password}
									oninput={() => (loginError = '')}
									required
									disabled={isLoginLoading}
									autocomplete="current-password"
									class="theme-input"
								/>
							</div>
							{#if loginError}
								<Alert.Root variant="destructive" class="theme-alert">
									<Alert.Description class="theme-alert-text">{loginError}</Alert.Description>
								</Alert.Root>
							{/if}
							<Button type="submit" class="w-full theme-button" disabled={isLoginLoading}>
								{#if isLoginLoading}
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
									Signing in...
								{:else}
									Sign in
								{/if}
							</Button>
						</form>
						<div class="text-center mt-4">
							<p class="text-sm theme-description">
								Don't have an account?{' '}
								<button type="button" onclick={handleSwitchToRegister} class="theme-link"> Sign up </button>
							</p>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
			<Tabs.Content value="register">
				<Card.Root class="login-card">
					<Card.Header class="space-y-1">
						<Card.Title class="text-2xl text-center theme-title">Create an Account</Card.Title>
						<Card.Description class="text-center theme-description">
							Register and start posting your first sprites!
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<form onsubmit={(e) => { e.preventDefault(); handleRegisterSubmit(); }} class="space-y-4">
							<div class="space-y-2">
								<Label for="register-username" class="theme-label">Username</Label>
								<Input
									id="register-username"
									type="text"
									placeholder="sonic_the_hedgehog"
									bind:value={registerFormData.username}
									oninput={() => (registerError = '')}
									required
									disabled={isRegisterLoading}
									autocomplete="username"
									class={`theme-input ${usernameValidationError ? 'border-red-500' : ''}`}
									minlength={3}
									maxlength={20}
								/>
								{#if usernameValidationError}
									<p class="text-sm text-red-500 theme-error-text">{usernameValidationError}</p>
								{/if}
								<p class="text-xs theme-description opacity-70">
									Your permanent username. Choose wisely! 3-20 characters, letters, numbers, underscores and hyphens only.
								</p>
							</div>
							<div class="space-y-2">
								<Label for="register-displayname" class="theme-label">Display Name</Label>
								<Input
									id="register-displayname"
									type="text"
									placeholder="Sonic the Hedgehog"
									bind:value={registerFormData.displayName}
									oninput={() => (registerError = '')}
									required
									disabled={isRegisterLoading}
									autocomplete="name"
									class={`theme-input ${displayNameValidationError ? 'border-red-500' : ''}`}
									minlength={3}
									maxlength={40}
								/>
								{#if displayNameValidationError}
									<p class="text-sm text-red-500 theme-error-text">{displayNameValidationError}</p>
								{/if}
								<p class="text-xs theme-description opacity-70">
									The name that will be displayed on your profile. This can be changed later. 3-40 characters
								</p>
							</div>
							<div class="space-y-2">
								<Label for="register-email" class="theme-label">Email</Label>
								<Input
									id="register-email"
									type="email"
									placeholder="sonic@hedgehog.net"
									bind:value={registerFormData.email}
									oninput={() => (registerError = '')}
									required
									disabled={isRegisterLoading}
									autocomplete="email"
									class="theme-input"
								/>
							</div>
							<div class="space-y-2">
								<Label for="register-password" class="theme-label">Password</Label>
								<Input
									id="register-password"
									type="password"
									placeholder="Create a password"
									bind:value={registerFormData.password}
									oninput={() => (registerError = '')}
									required
									disabled={isRegisterLoading}
									autocomplete="new-password"
									class="theme-input"
									minlength={6}
								/>
							</div>
							<div class="space-y-2">
								<Label for="register-confirm-password" class="theme-label">Confirm Password</Label>
								<Input
									id="register-confirm-password"
									type="password"
									placeholder="Confirm your password"
									bind:value={registerFormData.confirmPassword}
									oninput={() => (registerError = '')}
									required
									disabled={isRegisterLoading}
									autocomplete="new-password"
									class="theme-input"
								/>
							</div>
							{#if registerError}
								<Alert.Root variant="destructive" class="theme-alert">
									<Alert.Description class="theme-alert-text">{registerError}</Alert.Description>
								</Alert.Root>
							{/if}
							<Button type="submit" class="w-full theme-button" disabled={isRegisterLoading || !!usernameValidationError || !!displayNameValidationError}>
								{#if isRegisterLoading}
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
									Creating account...
								{:else}
									Create Account
								{/if}
							</Button>
						</form>
						<div class="text-center mt-4">
							<p class="text-sm theme-description">
								Already have an account?{' '}
								<button type="button" onclick={handleSwitchToLogin} class="theme-link"> Sign in </button>
							</p>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	</div>
{/if}

<style>
	.theme-compatible-login {
		margin: auto;
		margin-top: 100px;
		width: 100%;
		max-width: 400px;
	}
	
	.theme-compatible-login :global(.login-tabs) {
		width: 100%;
	}

	.theme-compatible-login :global(.login-card) {
		background: var(--page-color);
		border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
		border-radius: 0px;
		box-shadow: var(--box-shadow);
		width: 100%;
	}
	
	.theme-compatible-login :global(.theme-tab-trigger) {
		background: var(--page-color);
		color: var(--font-color);
		border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
		border-radius: 0px;
		font-family: 'saira', monospace;
		font-weight: 600;
		transition: all var(--transition-speed, 200ms) ease-in-out;
	}

	.theme-compatible-login :global(.theme-tab-trigger[data-state='active']) {
		background: var(--font-link-color);
		color: var(--page-color);
		border-color: var(--font-link-color);
	}

	.theme-compatible-login :global(.theme-tab-trigger:first-child) {
		border-right: none;
	}

	.theme-compatible-login :global(.theme-tab-trigger:last-child) {
		border-left: none;
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
		text-shadow: none !important;
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

	.theme-error-text {
		font-family: 'saira', monospace;
		font-weight: 600;
	}
	
	.theme-link {
		color: var(--font-link-color);
		text-decoration: none;
		font-family: 'saira', monospace;
		font-weight: 600;
		transition: all var(--transition-speed, 200ms) ease-in-out;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.theme-link:hover {
		color: color-mix(in srgb, var(--font-link-color) 80%, white);
		cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
	}
	
	@media (max-width: 768px) {
		.theme-compatible-login {
			max-width: 100%;
			padding: 0 1rem;
			margin-top: 2rem;
		}

		.theme-compatible-login :global(.login-card) {
			border: none;
			box-shadow: none;
			background: transparent;
		}

		.theme-compatible-login :global(.theme-tab-trigger) {
			border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
		}

		.theme-compatible-login :global(.theme-tab-trigger:first-child) {
			border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
		}

		.theme-compatible-login :global(.theme-tab-trigger:last-child) {
			border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
		}
	}
</style>