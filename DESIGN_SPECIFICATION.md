# Daredevil Web3 Sports Betting - Design System Specification

## Overview
This document outlines the comprehensive design system for the Daredevil Web3 Sports Betting platform, focusing on the cyberpunk-inspired UI/UX patterns established in the landing page. This specification serves as the reference for maintaining design consistency across all pages and components.

## 🎨 Design Philosophy

### Core Theme: Cyberpunk Sports Betting
- **Aesthetic**: Futuristic, high-tech, adrenaline-fueled
- **Mood**: Bold, confident, cutting-edge
- **Target Audience**: Tech-savvy sports betting enthusiasts
- **Brand Personality**: Daring, innovative, premium

### Design Principles
1. **Consistency**: All components follow the same visual language
2. **Hierarchy**: Clear information architecture with visual emphasis
3. **Accessibility**: High contrast, readable typography, intuitive interactions
4. **Responsiveness**: Seamless experience across all device sizes
5. **Performance**: Optimized animations and interactions

## 🎯 Color System

### Primary Colors
```css
--primary-red: #DB0004        /* Main brand color - bold red */
--primary-red-dark: #dc2626   /* Darker variant for hover states */
--primary-red-light: #f87171  /* Lighter variant for accents */
```

### Background Colors
```css
--bg-primary: #0a0a0f         /* Deep space black - main background */
--bg-secondary: #1a1a2e       /* Dark blue-gray - secondary surfaces */
--bg-tertiary: #16213e        /* Slightly lighter - tertiary surfaces */
--bg-card: #1e2749            /* Card backgrounds */
--bg-modal: rgba(26, 26, 46, 0.95) /* Modal overlays */
```

### Accent Colors
```css
--accent-red: #DB0004         /* Primary accent - matches brand */
--accent-cyan: #ff4d4d        /* Secondary accent - repurposed red */
--accent-purple: #8b5cf6      /* Tertiary accent */
--accent-pink: #f472b6        /* Quaternary accent */
--accent-green: #10b981       /* Success states */
--accent-orange: #f59e0b      /* Warning states */
```

### Text Colors
```css
--text-primary: #ffffff       /* Main text - pure white */
--text-secondary: #f5f5f5     /* Secondary text - off-white */
--text-muted: #e5e5e5         /* Muted text - light gray */
--text-accent: #ffffff        /* Accent text - white */
```

### Special Colors
```css
--highlight-yellow: #FFD700   /* Call-to-action emphasis */
--border-primary: #2d3748     /* Default borders */
--border-accent: var(--accent-cyan) /* Accent borders */
--border-glow: rgba(239, 68, 68, 0.5) /* Glow effects */
```

## 📐 Spacing System

### Spacing Scale
```css
--spacing-xs: 0.25rem    /* 4px - micro spacing */
--spacing-sm: 0.5rem     /* 8px - small spacing */
--spacing-md: 1rem       /* 16px - medium spacing */
--spacing-lg: 1.5rem     /* 24px - large spacing */
--spacing-xl: 2rem       /* 32px - extra large spacing */
--spacing-2xl: 3rem      /* 48px - double extra large spacing */
```

### Usage Guidelines
- **xs**: Between closely related elements (icon + text)
- **sm**: Between form elements, small component padding
- **md**: Standard component padding, section spacing
- **lg**: Between major sections, large component padding
- **xl**: Page-level spacing, hero section margins
- **2xl**: Full-page spacing, major layout divisions

## 🔲 Border Radius System

```css
--radius-sm: 4px    /* Small elements - buttons, inputs */
--radius-md: 8px    /* Medium elements - cards, modals */
--radius-lg: 12px   /* Large elements - containers */
--radius-xl: 16px   /* Extra large elements - major sections */
```

## 🎭 Typography

### Font Families
```css
--font-primary: 'Bebas Neue', Arial, sans-serif    /* Headers, UI elements */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace /* Code, data */
```

### Typography Hierarchy
- **Headers**: Bebas Neue - Bold, uppercase, high impact
- **Body Text**: System fonts - Readable, accessible
- **Data/Code**: Monospace - Technical, precise
- **UI Elements**: Bebas Neue - Consistent with brand

## 🎪 Component Design Patterns

### 1. Banner Cards (FeaturedMatchCard, F1QualifyingResults, F1MediaPlayer)

#### Structure
```
┌─────────────────────────────────────┐
│ RED HEADER BAR                      │ ← #DB0004 background
│ [Title] [Status/Icon]               │ ← White text, bold, uppercase
├─────────────────────────────────────┤
│ BLACK CONTENT AREA                  │ ← #000000 background
│ [Main Content]                      │ ← White text, structured data
│ [Interactive Elements]              │ ← Buttons, dropdowns
└─────────────────────────────────────┘
```

#### Styling Rules
- **Header**: `background: #DB0004`, `color: white`, `padding: 12px 16px`
- **Content**: `background: #000000`, `border: 1px solid #DB0004`
- **Border Radius**: `4px` (top corners only for header, bottom corners for content)
- **Width**: `min(90vw, 720px)` - responsive with max width
- **Z-index**: `1` (standard), `5` (dropdowns)

#### Interactive States
- **Hover**: Subtle glow effect, `box-shadow: 0 0 20px rgba(239, 68, 68, 0.3)`
- **Active**: Slight scale transform, `transform: translateY(-2px)`
- **Focus**: Enhanced border glow, `border-color: #ff4444`

### 2. Button System

#### Primary Button (Main CTA)
```css
.btn-primary {
  background: linear-gradient(135deg, #DB0004, #ff4d4d);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-family: 'Bebas Neue';
  font-size: 1.125rem;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
  transition: all 0.3s ease;
}
```

#### Button States
- **Default**: Gradient background, subtle glow
- **Hover**: Enhanced glow, slight lift (`translateY(-2px)`)
- **Active**: Pressed state, reduced glow
- **Disabled**: Reduced opacity, no interactions

#### Button Sizes
- **Small**: `padding: 4px 16px`, `font-size: 0.875rem`
- **Medium**: `padding: 8px 24px`, `font-size: 1rem`
- **Large**: `padding: 16px 32px`, `font-size: 1.25rem`

### 3. Layout System

#### Container Structure
```css
.container {
  max-width: min(90vw, 720px);
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}
```

#### Responsive Breakpoints
- **Desktop**: `> 768px` - Full layout, all features
- **Mobile**: `≤ 768px` - Stacked layout, simplified interactions

#### Flexbox Patterns
```css
.flex-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  justify-content: space-evenly; /* Mobile spacing solution */
}
```

## 🎬 Animation & Effects

### Glow Effects
```css
.glow {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

.glow-strong {
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.6);
}
```

### Transitions
```css
--transition-fast: 0.15s ease-in-out    /* Micro-interactions */
--transition-normal: 0.3s ease-in-out   /* Standard interactions */
--transition-slow: 0.5s ease-in-out     /* Page transitions */
```

### Background Animation
- **Squares Component**: Animated grid with diagonal movement
- **Color**: `#7f1d1d` borders, `#2a0a0a` hover fill
- **Speed**: `0.5` (moderate pace)
- **Overlay**: Dark gradient for text readability

## 📱 Responsive Design Patterns

### Mobile-First Approach
1. **Design for mobile** (320px+) first
2. **Progressive enhancement** for larger screens
3. **Touch-friendly** interactions (44px minimum touch targets)
4. **Simplified navigation** and reduced cognitive load

### Mobile Layout Strategy
```css
@media (max-width: 768px) {
  .landing-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    justify-content: space-evenly; /* Even distribution */
  }
  
  /* Reset margins to let flexbox handle spacing */
  .component {
    margin: 0 !important;
  }
}
```

### Desktop Layout Strategy
- **Fixed positioning** for certain elements (when needed)
- **Hover states** and advanced interactions
- **Larger touch targets** and more detailed information
- **Multi-column layouts** where appropriate

## 🎯 Component-Specific Guidelines

### FeaturedMatchCard
- **Purpose**: Display upcoming matches with dropdown selection
- **Header**: "UPCOMING" with status indicator
- **Content**: Match details, competitors, date/time
- **Interaction**: Dropdown with all upcoming matches
- **Z-index**: `5` (highest for dropdown visibility)

### F1QualifyingResults
- **Purpose**: Display F1 qualifying results from FastF1 API
- **Header**: "QUALIFYING" with session info
- **Content**: Top 3 results by default, expandable to full grid
- **Data**: Position, driver, team, lap time, time delta
- **Responsive**: Desktop (after UPCOMING), Mobile (after network info)

### F1MediaPlayer
- **Purpose**: Embedded YouTube F1 content
- **Header**: "F1 MEDIA" with status indicator
- **Content**: YouTube iframe (200px height)
- **Error Handling**: Fallback options for restricted content
- **Position**: Below all other content

### Navigation Elements
- **Hidden on landing** (as per requirements)
- **Consistent styling** when visible on other pages
- **Breadcrumb patterns** for deep navigation

## 🔧 Implementation Guidelines

### CSS Architecture
1. **CSS Custom Properties** for all design tokens
2. **Component-scoped styles** with consistent naming
3. **Utility classes** for common patterns
4. **Mobile-first media queries**

### Component Structure
```typescript
interface ComponentProps {
  className?: string;        // Additional styling
  // Component-specific props
}

const Component: React.FC<ComponentProps> = ({ className = '' }) => {
  // Component logic
  return (
    <div className={`component-base ${className}`}>
      {/* Component JSX */}
    </div>
  );
};
```

### State Management
- **Loading states**: Consistent spinner and messaging
- **Error states**: User-friendly error messages with retry options
- **Empty states**: Helpful guidance for empty data
- **Success states**: Confirmation feedback

## 🎨 Visual Hierarchy

### Information Architecture
1. **Primary**: Hero content, main CTAs
2. **Secondary**: Supporting information, features
3. **Tertiary**: Additional details, metadata
4. **Quaternary**: Legal text, disclaimers

### Visual Weight
- **Heavy**: Headers, CTAs, important data
- **Medium**: Body text, secondary actions
- **Light**: Muted text, decorative elements

## 🚀 Performance Considerations

### Optimization Strategies
- **Lazy loading** for non-critical components
- **Optimized animations** (transform, opacity only)
- **Efficient re-renders** with proper React patterns
- **Minimal bundle size** with tree shaking

### Loading States
- **Skeleton screens** for content loading
- **Progressive enhancement** for API data
- **Graceful degradation** for network issues

## 📋 Quality Assurance

### Design Review Checklist
- [ ] Consistent color usage across components
- [ ] Proper spacing according to design system
- [ ] Responsive behavior on all breakpoints
- [ ] Accessibility compliance (contrast, focus states)
- [ ] Performance optimization
- [ ] Cross-browser compatibility

### Testing Requirements
- **Visual regression testing** for component consistency
- **Responsive testing** on multiple devices
- **Accessibility testing** with screen readers
- **Performance testing** for animation smoothness

## 🔄 Maintenance & Updates

### Version Control
- **Design tokens** in CSS custom properties for easy updates
- **Component documentation** with usage examples
- **Breaking change** communication for design system updates

### Future Enhancements
- **Dark/light mode** toggle (if needed)
- **Customization options** for user preferences
- **Advanced animations** for premium feel
- **Accessibility improvements** based on user feedback

---

## 📚 Reference Implementation

This design system is currently implemented in:
- `src/views/LandingView.tsx` - Main landing page
- `src/components/FeaturedMatchCard.tsx` - Match display component
- `src/components/F1QualifyingResults.tsx` - F1 data component
- `src/components/F1MediaPlayer.tsx` - Media player component
- `src/styles/cyberpunk.css` - Complete design system CSS
- `src/components/Squares.tsx` - Background animation component

Use this specification as the single source of truth for all design decisions and component implementations across the Daredevil platform.
