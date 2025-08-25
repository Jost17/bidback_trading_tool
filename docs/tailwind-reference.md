# Tailwind CSS Reference Guide

## Installation Methods

### 1. Using CDN (Quick Start)
```html
<script src="https://cdn.tailwindcss.com"></script>
```

### 2. Using npm/yarn
```bash
# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind configuration
npx tailwindcss init -p

# For yarn users
yarn add -D tailwindcss postcss autoprefixer
```

### 3. Using Vite
```bash
# Create Vite project
npm create vite@latest my-app --template vue
cd my-app

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 4. Tailwind CLI
```bash
# Install Tailwind CSS
npm install -D tailwindcss

# Generate configuration file
npx tailwindcss init

# Build CSS
npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch
```

## Configuration

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### CSS Setup (input.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### HTML Integration
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Production build -->
  <link href="/dist/output.css" rel="stylesheet">
  
  <!-- Or using CDN for development -->
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

## Framework-Specific Guides

### Popular Framework Integrations
- **Next.js**: [/docs/installation/framework-guides/nextjs](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- **Laravel**: [/docs/installation/framework-guides/laravel/vite](https://tailwindcss.com/docs/installation/framework-guides/laravel/vite)
- **Nuxt**: [/docs/installation/framework-guides/nuxt](https://tailwindcss.com/docs/installation/framework-guides/nuxt)
- **SvelteKit**: [/docs/installation/framework-guides/sveltekit](https://tailwindcss.com/docs/installation/framework-guides/sveltekit)
- **Angular**: [/docs/installation/framework-guides/angular](https://tailwindcss.com/docs/installation/framework-guides/angular)
- **React Router**: [/docs/installation/framework-guides/react-router](https://tailwindcss.com/docs/installation/framework-guides/react-router)
- **Astro**: [/docs/installation/framework-guides/astro](https://tailwindcss.com/docs/installation/framework-guides/astro)

## Development Tools

### Editor Setup
Install the Tailwind CSS IntelliSense extension for:
- Visual Studio Code
- WebStorm/IntelliJ IDEA
- Sublime Text
- Vim/Neovim

### Build Commands
```bash
# Development build with watch mode
npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch

# Production build (minified)
npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify

# Start development server (Vite projects)
npm run dev
```

## PostCSS Configuration

### postcss.config.js
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
```

## Essential Links

- **Installation Guide**: https://tailwindcss.com/docs/installation
- **Editor Setup**: https://tailwindcss.com/docs/editor-setup
- **Compatibility**: https://tailwindcss.com/docs/compatibility
- **Upgrade Guide**: https://tailwindcss.com/docs/upgrade-guide
- **Documentation**: https://tailwindcss.com/docs

## Quick Tips

1. **Content Configuration**: Always configure the `content` array in `tailwind.config.js` to include all files that use Tailwind classes
2. **Tree Shaking**: Tailwind automatically removes unused styles in production builds
3. **JIT Mode**: Just-In-Time mode is enabled by default in Tailwind CSS v3+
4. **Custom Classes**: Use the `extend` section in the config to add custom utilities without overriding defaults

## Common Issues & Solutions

### CSS Not Updating
- Ensure your content paths are correctly configured
- Check that the build process is running
- Clear browser cache

### IntelliSense Not Working
- Install the official Tailwind CSS IntelliSense extension
- Ensure `tailwind.config.js` is in the project root
- Restart your editor after installation

### Production Build Size
- Use PurgeCSS or Tailwind's built-in purging
- Minify your CSS with the `--minify` flag
- Only import the styles you need