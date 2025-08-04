# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a client-side trading platform called "Lupo" - a professional retail-focused investment platform that provides market intelligence, transparency tools, and investment opportunities. The application is built as a static web application with vanilla JavaScript, HTML, and CSS.

## Architecture

- **Frontend-only application** - No backend/server components
- **Single-page application (SPA)** built with vanilla JavaScript
- **Professional trading interface** with market data visualization
- **Chart.js integration** for financial data visualization
- **Real-time price simulation** using JavaScript intervals

### Core Components

- `app.js` - Main application class (`LupoPlatform`) containing all business logic
- `index.html` - Single HTML page with modal-based navigation
- `style.css` - Comprehensive styling with dark theme and professional design system

### Key Features

1. **Market Intelligence Dashboard** - Retail vs institutional sentiment tracking
2. **Investment Opportunities** - Categorized stock listings (under $1, $4, $5)
3. **Institutional Transparency** - Holdings data for major institutions
4. **Market Alerts System** - Real-time notifications
5. **Community Insights** - Discussion and research sharing
6. **Investment Analysis Modal** - Detailed stock analysis with charts

## Development Commands

Since this is a static web application with no build process or package.json:

- **Run locally**: Open `index.html` in a web browser or use any local HTTP server
- **No build step required** - Direct file editing and browser refresh
- **No package manager** - Uses CDN for Chart.js dependency
- **No linting/testing setup** - Manual code review required

## CSS Architecture

The styling system is now modularized for better maintainability:

- `styles/variables.css` - Design tokens, colors, typography, spacing
- `styles/base.css` - Reset, typography, forms, accessibility  
- `styles/layout.css` - Grid system, container, layout templates
- `styles/breakpoints.css` - Consistent responsive breakpoint strategy
- `styles/utilities.css` - Helper classes for rapid development
- `styles/touch.css` - Touch interaction optimizations and mobile UX
- `style.css` - Component-specific styles

### Breakpoint Strategy

Mobile-first approach with consistent breakpoints:

- **xs**: 0-480px (Small phones) - Base styles
- **sm**: 481px+ (Large phones, small tablets)
- **md**: 769px+ (Tablets, small laptops)  
- **lg**: 1025px+ (Laptops, desktops)
- **xl**: 1281px+ (Large desktops)

Use responsive utility classes: `.sm:grid-2`, `.md:flex-row`, `.lg:gap-xl`

### Touch Optimizations

Enhanced mobile UX with comprehensive touch interactions:

- **Minimum 44px touch targets** - All interactive elements meet accessibility standards
- **Touch feedback** - Visual feedback with scale animations and ripple effects  
- **Smooth scroll** - `-webkit-overflow-scrolling: touch` for native-like scrolling
- **Form enhancements** - Prevents iOS zoom, proper focus states
- **Gesture preparations** - Scroll snap for swipeable interfaces
- **Reduced motion support** - Respects user preferences for accessibility

### Authentication

- **Backend integration** - PHP API endpoints for secure authentication
- **Session management** - Token-based authentication with localStorage
- **Admin roles** - Role-based access control for admin features
- **Responsive login design** - Mobile-first with refined desktop experience

### UI/UX Improvements

Recent enhancements to the user interface and experience:

- **Complete responsive redesign** - Mobile-first approach with consistent breakpoints
- **Modular CSS architecture** - Organized into logical modules for maintainability
- **Enhanced login experience** - Refined desktop layout with proper centering and proportional sizing
- **Touch optimization** - 44px minimum touch targets, smooth animations, iOS zoom prevention
- **Fluid grid system** - Flexible layouts that adapt to any screen size
- **Professional design system** - Consistent spacing, typography, and color tokens

## Technical Details

### Data Management
- Market data is stored as JSON within the JavaScript class
- Price updates are simulated using `setInterval` for demo purposes
- All data is client-side with no external API calls

### External Dependencies
- Chart.js (loaded via CDN from `https://cdn.jsdelivr.net/npm/chart.js`)

### Modal System
- Tab-based navigation within stock analysis modals
- Event delegation for dynamic content interaction
- Keyboard navigation support (ESC to close)

### Styling Architecture
- Comprehensive CSS custom properties (CSS variables) system
- Professional dark theme with amber/gold accent colors
- Responsive design with mobile breakpoints
- Component-based styling approach

## Code Conventions

- **ES6 Classes** - Main application logic in `LupoPlatform` class
- **Event delegation** - Single document-level event listeners for performance
- **Professional naming** - Clear, descriptive variable and method names
- **Modular methods** - Each feature has dedicated rendering methods
- **Console logging** - Extensive logging for debugging and monitoring

## Key Files and Their Purpose

- `app.js:100-115` - Application initialization and setup
- `app.js:268-421` - Market data rendering methods
- `app.js:422-468` - Modal management system
- `app.js:706-830` - Chart generation and financial visualization
- `style.css:744-771` - Professional color theme definitions
- `index.html:213-258` - Modal structure and tabs

## Working with This Codebase

When making changes:
1. Test directly in browser - no build process required
2. All changes are immediately visible on page refresh
3. Use browser developer tools for debugging
4. Market data can be modified in the JSON objects within `app.js`
5. Modal functionality requires testing tab navigation and event handling

### Responsive Development Guidelines

When working with the responsive system:
1. **Mobile-first approach** - Start with mobile styles, enhance for desktop
2. **Use consistent breakpoints** - xs(0-480px), sm(481px+), md(769px+), lg(1025px+), xl(1281px+)
3. **Leverage utility classes** - Use `.sm:grid-2`, `.md:flex-row`, `.lg:gap-xl` for rapid development
4. **Test across devices** - Verify touch interactions work on mobile and desktop refinements look polished
5. **Maintain accessibility** - Ensure 44px minimum touch targets and proper focus states

## Commit and Development Guidelines

- Never mention yourself in commits or adds