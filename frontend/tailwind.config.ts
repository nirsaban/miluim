import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ============================================
        // MILTECH PRO DESIGN SYSTEM
        // Premium Dark Military-Tech Theme
        // ============================================

        // Background Layers (darkest to lightest)
        app: '#0A1128',              // Deep Midnight Navy - deepest shell
        canvas: '#0D1530',           // Page background
        surface: {
          DEFAULT: '#1A233E',        // Primary cards (at 85% opacity for glass)
          '2': '#1F2B4A',            // Secondary/nested cards
        },
        elevated: '#252F52',         // Modals, elevated panels

        // Glass effect backgrounds (with opacity)
        glass: {
          DEFAULT: 'rgba(26, 35, 62, 0.85)',
          light: 'rgba(31, 43, 74, 0.80)',
          dark: 'rgba(13, 21, 48, 0.90)',
        },

        // Border Colors
        border: {
          subtle: 'rgba(255, 255, 255, 0.05)',  // Ultra subtle
          DEFAULT: 'rgba(255, 255, 255, 0.10)', // Glassmorphism standard
          strong: 'rgba(255, 255, 255, 0.15)',  // Emphasized
          glow: 'rgba(92, 201, 245, 0.3)',      // Cyan glow border
        },

        // Text Colors
        content: {
          primary: '#FFFFFF',        // Headlines, primary content
          secondary: '#CBD5E1',      // Body text, descriptions
          muted: '#94A3B8',          // Muted Slate - metadata, labels
        },

        // Primary Action - Electric Cyan
        accent: {
          DEFAULT: '#5CC9F5',        // Electric Cyan - primary actions
          hover: '#7DD4F7',          // Lighter hover
          active: '#4AB8E8',         // Pressed state
          glow: 'rgba(92, 201, 245, 0.4)', // Glow effect
        },

        // Data Visualization
        viz: {
          primary: '#5CC9F5',        // Electric Cyan
          secondary: '#3B82F6',      // Royal Blue
          gradient: {
            from: '#3B82F6',         // Royal Blue
            to: '#5CC9F5',           // Electric Cyan
          },
        },

        // Semantic Colors
        success: {
          DEFAULT: '#10B981',        // Emerald
          light: '#34D399',
          surface: 'rgba(16, 185, 129, 0.1)',
          border: 'rgba(16, 185, 129, 0.3)',
        },
        warning: {
          DEFAULT: '#F59E0B',        // Amber
          light: '#FBBF24',
          surface: 'rgba(245, 158, 11, 0.1)',
          border: 'rgba(245, 158, 11, 0.3)',
        },
        danger: {
          DEFAULT: '#EF4444',        // Coral Red - Critical Alerts
          light: '#F87171',
          surface: 'rgba(239, 68, 68, 0.1)',
          border: 'rgba(239, 68, 68, 0.3)',
        },
        info: {
          DEFAULT: '#5CC9F5',        // Electric Cyan
          light: '#7DD4F7',
          surface: 'rgba(92, 201, 245, 0.1)',
          border: 'rgba(92, 201, 245, 0.3)',
        },

        // Chart Colors
        chart: {
          primary: '#5CC9F5',        // Electric Cyan
          secondary: '#3B82F6',      // Royal Blue
          tertiary: '#8B5CF6',       // Purple
          positive: '#10B981',       // Emerald
          negative: '#EF4444',       // Coral Red
          highlight: '#FBBF24',      // Amber
          grid: 'rgba(255, 255, 255, 0.05)',
          axis: 'rgba(255, 255, 255, 0.1)',
        },

        // Legacy military colors (compatibility)
        military: {
          50: '#1A233E',
          100: '#1F2B4A',
          200: '#252F52',
          300: '#3B82F6',
          400: '#5CC9F5',
          500: '#5CC9F5',
          600: '#4AB8E8',
          700: '#1A233E',
          800: '#0D1530',
          900: '#0A1128',
          950: '#070D1F',
        },
      },

      backgroundColor: {
        overlay: 'rgba(10, 17, 40, 0.85)',
      },

      ringColor: {
        focus: 'rgba(92, 201, 245, 0.4)',
      },

      borderColor: {
        DEFAULT: 'rgba(255, 255, 255, 0.10)',
      },

      borderRadius: {
        'card': '16px',    // Cards
        'btn': '12px',     // Buttons
        'input': '12px',   // Inputs
      },

      fontFamily: {
        sans: ['Rubik', 'Arial', 'sans-serif'],
      },

      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 30px rgba(92, 201, 245, 0.2)',
        'glow-sm': '0 0 15px rgba(92, 201, 245, 0.15)',
        'glow-lg': '0 0 50px rgba(92, 201, 245, 0.25)',
        'neon': '0 0 10px rgba(92, 201, 245, 0.5), 0 0 20px rgba(92, 201, 245, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(92, 201, 245, 0.1)',
      },

      backgroundImage: {
        // Cinematic lighting gradients
        'radial-cyan': 'radial-gradient(ellipse at top right, rgba(92, 201, 245, 0.08) 0%, transparent 50%)',
        'radial-blue': 'radial-gradient(ellipse at bottom left, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
        'cinematic': 'radial-gradient(ellipse at top right, rgba(92, 201, 245, 0.08) 0%, transparent 40%), radial-gradient(ellipse at bottom left, rgba(59, 130, 246, 0.08) 0%, transparent 40%)',
        // Data visualization gradients
        'viz-gradient': 'linear-gradient(135deg, #3B82F6 0%, #5CC9F5 100%)',
        'viz-gradient-vertical': 'linear-gradient(180deg, #5CC9F5 0%, #3B82F6 100%)',
        // Chart area fills
        'chart-area': 'linear-gradient(180deg, rgba(92, 201, 245, 0.3) 0%, rgba(92, 201, 245, 0) 100%)',
        'chart-area-blue': 'linear-gradient(180deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0) 100%)',
        // Glass surface
        'glass-surface': 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },

      backdropBlur: {
        'glass': '12px',
        'glass-lg': '20px',
      },

      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'carousel': 'carousel 10s ease-in-out infinite',
        'slide-out-left': 'slideOutLeft 0.2s ease-out',
        'slide-out-right': 'slideOutRight 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'neon-flicker': 'neonFlicker 3s ease-in-out infinite',
      },

      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        carousel: {
          '0%, 33%': { transform: 'translateX(0)' },
          '40%, 73%': { transform: 'translateX(-100%)' },
          '80%, 100%': { transform: 'translateX(-200%)' },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-20px)', opacity: '0' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(20px)', opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(92, 201, 245, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(92, 201, 245, 0.4)' },
        },
        neonFlicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
          '75%': { opacity: '0.95' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
