# Design System

## Colors

### Military Theme (Primary)
```
military-50:  #f0fdf4  - Lightest background
military-100: #dcfce7  - Light background, hover states
military-200: #bbf7d0  - Borders, dividers
military-500: #22c55e  - Accent
military-600: #16a34a  - Buttons, links
military-700: #15803d  - Primary buttons, active states
military-800: #166534  - Headers, emphasis
military-900: #14532d  - Darkest text
```

### Semantic Colors
```
success: green-500/600
warning: yellow-500/600
error:   red-500/600
info:    blue-500/600
```

### Status Colors
```
PENDING:  yellow-100/600
APPROVED: green-100/600
REJECTED: red-100/600
ACTIVE:   blue-100/600
RETURNED: gray-100/600
OVERDUE:  red-200/700
```

## Typography

### Font Stack
- System fonts (native feel)
- Hebrew-optimized

### Sizes
```
text-xs:   10px - Labels, timestamps
text-sm:   12px - Secondary text
text-base: 14px - Body text
text-lg:   16px - Headings
text-xl:   18px - Page titles
text-2xl:  20px - Major headings
```

## Components

### Buttons
```jsx
// Primary
<Button className="bg-military-700 hover:bg-military-600 text-white">
  פעולה ראשית
</Button>

// Secondary
<Button variant="outline" className="border-military-700 text-military-700">
  פעולה משנית
</Button>

// Danger
<Button className="bg-red-600 hover:bg-red-500 text-white">
  מחיקה
</Button>
```

### Cards
```jsx
<Card className="bg-white rounded-2xl shadow-card p-4">
  <CardHeader>
    <CardTitle>כותרת</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Input Fields
```jsx
<Input
  type="text"
  placeholder="הזן ערך"
  className="border-gray-300 rounded-lg focus:ring-military-500"
  dir="rtl"
/>
```

### Badges/Pills
```jsx
// Status badge
<span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
  ממתין
</span>
```

## Layout Patterns

### Page Container
```jsx
<div className="container mx-auto px-4 py-4 pb-24 lg:pb-6">
  {/* Content */}
</div>
```

### Card Grid
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

### Stats Grid
```jsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard label="סה״כ" value={100} />
  {/* More stats */}
</div>
```

## Navigation

### Mobile Bottom Nav
- 5 items max (4 primary + "More")
- Icon + label below
- Active state: military-700 color
- Height: h-16

### Desktop Sidebar
- Width: w-60
- Fixed position
- Flat list with dividers
- Active item: bg-military-700 text-white

### Admin Sidebar
- Width: w-64
- Collapsible sections
- Section icons
- Border-right indicator for active

## Responsive Breakpoints

```
sm:  640px   - Small tablets
md:  768px   - Tablets
lg:  1024px  - Desktops (sidebar appears)
xl:  1280px  - Large desktops
```

## Animations

### Transitions
```css
transition-colors   /* Color changes */
transition-all      /* Multiple properties */
duration-200        /* Standard timing */
```

### Loading States
```jsx
<Spinner className="animate-spin" />
<PageLoader /> // Full page spinner
```

## Icons

### Library
Lucide React icons

### Common Icons
```
Home         - בית
Calendar     - משמרות
FileText     - בקשות
User         - פרופיל
Settings     - הגדרות
Bell         - התראות
Shield       - מבצעי
Users        - חיילים
Building2    - מחלקה
MoreHorizontal - עוד
```

### Icon Sizing
```
w-4 h-4  - Small (nav, buttons)
w-5 h-5  - Medium (icons in text)
w-6 h-6  - Large (section icons)
```

## Shadows

```
shadow-sm     - Subtle elevation
shadow-card   - Cards (custom)
shadow-lg     - Modals, dropdowns
```

## RTL Considerations

1. Text alignment: `text-right` default
2. Flex direction: normal (flexbox handles RTL)
3. Margin/padding: Use logical properties when possible
4. Icons: Position on right side of text
5. Navigation: Right-aligned sidebar on desktop
