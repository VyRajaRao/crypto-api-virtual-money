import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
			screens: {
				// Mobile-first responsive breakpoints
				'xs': '375px',
				'sm': '640px',
				'md': '768px',
				'lg': '1024px',
				'xl': '1280px',
				'2xl': '1536px',
				// Touch-friendly breakpoints
				'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
				'mouse': { 'raw': '(hover: hover) and (pointer: fine)' },
				// Orientation breakpoints
				'portrait': { 'raw': '(orientation: portrait)' },
				'landscape': { 'raw': '(orientation: landscape)' },
				// Landscape mobile optimizations
				'landscape-sm': { 'raw': '(orientation: landscape) and (max-height: 640px)' },
				'landscape-xs': { 'raw': '(orientation: landscape) and (max-height: 480px)' }
			},
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				xs: '1rem',
				sm: '1.5rem',
				md: '2rem',
				lg: '2rem',
				xl: '2rem'
			},
			screens: {
				xs: '375px',
				sm: '640px',
				md: '768px',
				lg: '1024px',
				xl: '1280px',
				'2xl': '1400px'
			}
		},
		extend: {
			// Mobile-first spacing system
			spacing: {
				'safe': 'env(safe-area-inset-bottom)',
				'safe-top': 'env(safe-area-inset-top)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
				// Touch-friendly sizes (minimum 44px as per Apple/Google guidelines)
				'touch-sm': '40px',
				'touch': '44px',
				'touch-lg': '48px',
				'touch-xl': '56px',
				// Mobile-specific spacing
				'mobile-xs': '0.25rem',
				'mobile-sm': '0.5rem',
				'mobile': '0.75rem',
				'mobile-lg': '1rem',
				'mobile-xl': '1.5rem'
			},
			// Font sizes optimized for mobile
			fontSize: {
				'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
				'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'mobile': ['1rem', { lineHeight: '1.5rem' }],
				'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
				'mobile-3xl': ['1.875rem', { lineHeight: '2.25rem' }]
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				/* Crypto Dashboard Custom Colors */
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				crypto: {
					gain: 'hsl(var(--crypto-gain))',
					loss: 'hsl(var(--crypto-loss))',
					neutral: 'hsl(var(--crypto-neutral))'
				},
				neon: {
					pink: 'hsl(var(--neon-pink))',
					blue: 'hsl(var(--neon-blue))',
					glow: 'hsl(var(--neon-glow))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-glow': 'var(--gradient-glow)',
				'gradient-card': 'var(--gradient-card)'
			},
			boxShadow: {
				'neon': 'var(--shadow-neon)',
				'glow': 'var(--shadow-glow)',
				'card': 'var(--shadow-card)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'glow-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(var(--primary) / 0.3)'
					},
					'50%': {
						boxShadow: '0 0 40px hsl(var(--primary) / 0.6)'
					}
				},
				'slide-in': {
					'0%': {
						transform: 'translateX(-100%)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateX(0)',
						opacity: '1'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'slide-in': 'slide-in 0.3s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out'
			},
			// Mobile-specific utilities
			utilities: {
				// Touch target utility for accessible tap areas
				'.touch-target': {
					'min-height': '44px',
					'min-width': '44px',
					'touch-action': 'manipulation'
				},
				// Touch manipulation
				'.touch-manipulation': {
					'touch-action': 'manipulation'
				},
				// Mobile-safe scrolling
				'.scroll-mobile': {
					'-webkit-overflow-scrolling': 'touch',
					'overscroll-behavior': 'contain'
				},
				// Accessibility focus ring
				'.focus-accessible': {
					'&:focus-visible': {
						'outline': '2px solid hsl(var(--ring))',
						'outline-offset': '2px'
					}
				},
				// Skip link for screen readers
				'.skip-link': {
					'position': 'absolute',
					'top': '-100px',
					'left': '16px',
					'background': 'hsl(var(--primary))',
					'color': 'hsl(var(--primary-foreground))',
					'padding': '8px 16px',
					'text-decoration': 'none',
					'border-radius': '4px',
					'z-index': '9999',
					'&:focus': {
						'top': '16px'
					}
				},
				// Landscape mobile optimizations
				'.landscape-optimized': {
					'@media (orientation: landscape) and (max-height: 640px)': {
						'padding-top': '0.5rem',
						'padding-bottom': '0.5rem'
					}
				},
				// Improved scrollable container
				'.scrollable-container': {
					'overflow': 'auto',
					'-webkit-overflow-scrolling': 'touch',
					'overscroll-behavior': 'contain',
					'scrollbar-width': 'thin',
					'&::-webkit-scrollbar': {
						'width': '6px',
						'height': '6px'
					},
					'&::-webkit-scrollbar-track': {
						'background': 'transparent'
					},
					'&::-webkit-scrollbar-thumb': {
						'background': 'hsl(var(--muted-foreground) / 0.3)',
						'border-radius': '3px',
						'&:hover': {
							'background': 'hsl(var(--muted-foreground) / 0.5)'
						}
					}
				}
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
