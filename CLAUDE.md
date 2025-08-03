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

## Commit and Development Guidelines

- Never mention yourself in commits or adds