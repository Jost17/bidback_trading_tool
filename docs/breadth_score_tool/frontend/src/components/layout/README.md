# 🏗️ Layout Components

Diese Ordnerstruktur enthält alle Layout-Komponenten für das Dashboard.

## 📁 Struktur

```
layout/
├── DashboardLayout.tsx          # Haupt-Layout Container
├── Header.tsx                   # Header Container
├── DashboardTitle.tsx           # Titel-Bereich mit Actions  
├── GridContainer.tsx            # Grid-Layout System
├── types.ts                     # TypeScript Interfaces
├── README.md                    # Diese Dokumentation
└── header/                      # Header Sub-Komponenten
    ├── Logo.tsx                 # Logo + Branding
    ├── Navigation.tsx           # Haupt-Navigation
    └── UserProfile.tsx          # User Info + Actions
```

## 🎯 Komponenten-Übersicht

### DashboardLayout
- **Zweck**: Haupt-Container für das gesamte Dashboard
- **Features**: Gradient-Background, Padding, Layout-Struktur
- **Props**: `children`, `className`

### Header  
- **Zweck**: Obere Navigation und Branding
- **Features**: Logo, Navigation, User Profile
- **Besteht aus**: Logo + Navigation + UserProfile

### DashboardTitle
- **Zweck**: Dashboard-Titel mit Action-Buttons
- **Features**: Titel, Datum-Auswahl, Share, AI Assistant
- **Props**: `title`, `dateRange`, `showAiAssistant`

### GridContainer
- **Zweck**: 6-spaltiges CSS Grid System
- **Features**: Responsive Grid, Gap-Management
- **Props**: `children`, `columns`, `gap`

## 🔧 Verwendung

```tsx
import DashboardLayout from './layout/DashboardLayout'
import Header from './layout/Header'
import DashboardTitle from './layout/DashboardTitle'
import GridContainer from './layout/GridContainer'

const MyDashboard = () => {
  return (
    <DashboardLayout>
      <Header />
      <DashboardTitle title="Mein Dashboard" />
      <GridContainer>
        {/* Card Komponenten hier */}
      </GridContainer>
    </DashboardLayout>
  )
}
```

## 🎨 Styling

Alle Layout-Komponenten verwenden:
- **Tailwind CSS** für Styling
- **Glassmorphism** Effekte
- **Responsive Design** Patterns
- **Dark Theme** Optimierung

## 📋 TypeScript

Alle Interfaces sind in `types.ts` definiert für:
- Type Safety
- IntelliSense Support  
- Consistent APIs
- Easy Refactoring