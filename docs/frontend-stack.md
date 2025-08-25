# Frontend Stack Documentation

## React 18.3.x

### Installation
```bash
npm install react@^18.3.0 react-dom@^18.3.0
npm install -D @types/react @types/react-dom
```

### Key Features
- **Concurrent Features**: Automatic batching, transitions, suspense
- **New Hooks**: useId, useTransition, useDeferredValue, useSyncExternalStore
- **Strict Mode**: Enhanced development checks

### Basic Setup
```tsx
// main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

## TypeScript 5.x (Strict Mode)

### Installation
```bash
npm install -D typescript@^5.0.0
```

### tsconfig.json (Strict Mode)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Type-Safe Component Example
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary'
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({ 
  variant, 
  onClick, 
  children, 
  disabled = false 
}) => {
  return (
    <button
      className={`btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
```

## Shadcn/ui

### Installation & Setup

#### Initialize Project
```bash
# Initialize shadcn/ui in your project
npx shadcn@latest init

# For canary version with latest features
npx shadcn@canary init

# Initialize with specific options (skip prompts)
npx shadcn@latest init -y --src-dir --css-variables

# Follow the prompts:
# - Would you like to use TypeScript? → Yes
# - Which style would you like to use? → Default/New York
# - Which color would you like to use as base color? → Slate/Zinc/Gray
# - Where is your global CSS file? → src/index.css
# - Would you like to use CSS variables for colors? → Yes
# - Where is your tailwind.config.js located? → tailwind.config.js
# - Configure the import alias for components? → src/components
# - Configure the import alias for utils? → src/lib/utils
```

#### Manual Installation (Core Dependencies)
```bash
npm install class-variance-authority clsx tailwind-merge lucide-react tw-animate-css
```

### Adding Components

#### Essential Components for Trading App
```bash
# Core UI components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add textarea

# Form components
npx shadcn@latest add form
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group
npx shadcn@latest add switch

# Layout & navigation
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add navigation-menu
npx shadcn@latest add sheet
npx shadcn@latest add tabs

# Data display
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add progress
npx shadcn@latest add skeleton

# Feedback
npx shadcn@latest add toast
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add sonner

# Charts & visualization
npx shadcn@latest add chart
npm install recharts  # Required for charts

# Advanced components
npx shadcn@latest add command
npx shadcn@latest add carousel
npx shadcn@latest add resizable
npx shadcn@latest add drawer

# Date/Time pickers (third-party)
npx shadcn@latest add "https://greenk.dev/r/monthpicker.json"
npx shadcn@latest add "https://greenk.dev/r/monthrangepicker.json"
npx shadcn@latest add popover  # Required for month pickers
```

#### Manual Component Dependencies
```bash
# If not using CLI, install individual dependencies:

# Button (uses class-variance-authority)
npm install @radix-ui/react-slot

# Dialog
npm install @radix-ui/react-dialog

# Dropdown Menu
npm install @radix-ui/react-dropdown-menu

# Form
npm install @radix-ui/react-label @radix-ui/react-slot react-hook-form @hookform/resolvers zod

# Select
npm install @radix-ui/react-select

# Toast/Sonner
npm install sonner next-themes

# Calendar/Date Picker
npm install react-day-picker date-fns

# Command Menu
npm install cmdk

# Resizable
npm install react-resizable-panels

# Input OTP
npm install input-otp
```

### Configuration (components.json)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Example Components

#### Button Component
```tsx
import { Button } from "@/components/ui/button"

export function TradingActions() {
  return (
    <div className="flex gap-2">
      <Button variant="default">Buy</Button>
      <Button variant="destructive">Sell</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="secondary">Hold</Button>
      <Button variant="ghost" size="icon">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

#### Card Component for Trading Data
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function TradeCard({ trade }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{trade.symbol}</CardTitle>
        <CardDescription>
          {trade.orderType} Order • {trade.quantity} shares
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Entry Price</p>
            <p className="text-2xl font-bold">${trade.price}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">P&L</p>
            <p className="text-2xl font-bold text-green-600">
              +${trade.profit}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">View Details</Button>
      </CardFooter>
    </Card>
  )
}
```

#### Dialog for Order Placement
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function PlaceOrderDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Place Order</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Place New Order</DialogTitle>
          <DialogDescription>
            Enter your order details below. Click submit when ready.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="symbol" className="text-right">
              Symbol
            </Label>
            <Input id="symbol" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input id="quantity" type="number" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Submit Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### Data Table for Trades
```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function TradesTable({ trades }) {
  return (
    <Table>
      <TableCaption>Recent trades</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">P&L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.id}>
            <TableCell className="font-medium">{trade.symbol}</TableCell>
            <TableCell>{trade.type}</TableCell>
            <TableCell>{trade.quantity}</TableCell>
            <TableCell className="text-right">${trade.price}</TableCell>
            <TableCell className="text-right">
              <span className={trade.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                ${trade.pnl}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

#### Toast Notifications
```tsx
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

export function TradingNotifications() {
  const { toast } = useToast()

  const handleTradeExecution = () => {
    toast({
      title: "Order Executed",
      description: "Your AAPL buy order for 100 shares has been filled.",
    })
  }

  const handleTradeError = () => {
    toast({
      variant: "destructive",
      title: "Order Failed",
      description: "Insufficient funds to complete the order.",
    })
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handleTradeExecution}>Simulate Success</Button>
      <Button variant="destructive" onClick={handleTradeError}>
        Simulate Error
      </Button>
    </div>
  )
}
```

#### Month Range Picker for Trading Reports
```tsx
import React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns/format"
import { cn } from "@/lib/utils"
import { MonthPicker } from "@/components/ui/monthpicker"
import { MonthRangePicker } from "@/components/ui/monthrangepicker"

// Types for month picker components
type Month = { 
  number: number
  name: string
  yearOffset: number // 0 for left calendar, 1 for right calendar
}

type ButtonVariant = "default" | "outline" | "ghost" | "link" | "destructive" | "secondary" | null | undefined

export function TradingReportDatePicker() {
  const [month, setMonth] = React.useState<Date>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !month && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {month ? format(month, "MMM yyyy") : <span>Pick a month</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <MonthPicker onMonthSelect={setMonth} selectedMonth={month} />
      </PopoverContent>
    </Popover>
  )
}

export function TradingReportRangePicker() {
  const [dateRange, setDateRange] = React.useState<{ start: Date; end: Date }>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "w-[320px] justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange 
            ? `${format(dateRange.start, "MMM yyyy")} - ${format(dateRange.end, "MMM yyyy")}`
            : <span>Pick a month range</span>
          }
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <MonthRangePicker 
          onMonthRangeSelect={setDateRange} 
          selectedMonthRange={dateRange} 
        />
      </PopoverContent>
    </Popover>
  )
}

// Example usage in trading dashboard
export function TradingAnalytics() {
  const [reportPeriod, setReportPeriod] = React.useState<{ start: Date; end: Date }>()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Report Period:</span>
        <TradingReportRangePicker />
      </div>
      
      {reportPeriod && (
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">
            Trading Performance: {format(reportPeriod.start, "MMM yyyy")} - {format(reportPeriod.end, "MMM yyyy")}
          </h3>
          {/* Analytics content would go here */}
        </div>
      )}
    </div>
  )
}
```

#### Form Integration with Zod Schema
```tsx
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

// Zod schema for trading report form
const TradingReportSchema = z.object({
  reportMonth: z.date(),
  comparisonRange: z.object({
    start: z.date(),
    end: z.date()
  }),
  symbols: z.array(z.string()),
  includeOptions: z.boolean().default(false),
})

type TradingReportForm = z.infer<typeof TradingReportSchema>

export function TradingReportForm() {
  const form = useForm<TradingReportForm>({
    resolver: zodResolver(TradingReportSchema),
    defaultValues: {
      includeOptions: false,
      symbols: [],
    }
  })

  const onSubmit = (data: TradingReportForm) => {
    console.log("Generating report for:", data)
    // Generate trading report logic
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Form implementation */}
    </form>
  )
}
```

### CDN Usage (for prototyping)
```html
<!-- Using ESM CDN -->
<script type="module">
  import shadcn from 'https://cdn.jsdelivr.net/npm/shadcdn/+esm'
  // Note: Shadcn/ui is primarily a component library for React projects
  // CDN usage is limited compared to full installation
</script>
```

### Build and Publish (for custom component libraries)
```bash
# Build the project
yarn build

# Publish to npm (if creating custom shadcn-based library)
npm publish
```

### Custom Component Registry

#### Setup Custom Registry
```bash
# Install canary version with build command
npm install shadcn@canary

# Add registry build script to package.json
{
  "scripts": {
    "registry:build": "shadcn build"
  }
}
```

#### Create Registry Configuration
```json
// registry.json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    {
      "name": "hello-world",
      "type": "registry:block",
      "title": "Hello World",
      "description": "A simple hello world component.",
      "files": [
        {
          "path": "registry/new-york/hello-world/hello-world.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

#### Build and Serve Registry
```bash
# Build registry JSON files
npm run registry:build

# Start development server (Next.js, etc.)
npm run dev

# Registry will be available at:
# http://localhost:3000/r/hello-world.json
```

#### Install from Custom Registry
```bash
# Install component from custom registry
npx shadcn@latest add http://localhost:3000/r/hello-world.json

# Install with primitive overrides
npx shadcn@latest add http://example.com/r/custom-login.json
```

### Advanced Registry Examples

#### Complex Multi-File Component
```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "trading-dashboard",
  "title": "Trading Dashboard",
  "type": "registry:block",
  "description": "A complex trading dashboard component",
  "dependencies": ["recharts", "date-fns"],
  "files": [
    {
      "path": "registry/new-york/trading-dashboard/page.tsx",
      "type": "registry:page",
      "target": "app/trading/page.tsx"
    },
    {
      "path": "registry/new-york/trading-dashboard/components/trading-chart.tsx",
      "type": "registry:component"
    },
    {
      "path": "registry/new-york/trading-dashboard/components/order-form.tsx",
      "type": "registry:component"
    },
    {
      "path": "registry/new-york/trading-dashboard/hooks/use-trading-data.ts",
      "type": "registry:hook"
    },
    {
      "path": "registry/new-york/trading-dashboard/lib/trading-utils.ts",
      "type": "registry:utils"
    },
    {
      "path": "registry/new-york/trading-dashboard/trading.config.ts",
      "type": "registry:file",
      "target": "~/trading.config.ts"
    }
  ]
}
```

#### Block with Registry Dependencies
```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-login",
  "type": "registry:block",
  "registryDependencies": [
    "login-01",
    "https://example.com/r/button.json",
    "https://example.com/r/input.json",
    "https://example.com/r/label.json"
  ]
}
```

### Framework-Specific Setup

#### Next.js
```bash
npx shadcn@latest init
# Choose: Next.js
```

#### Remix
```bash
npx shadcn@latest init
# Follow prompts for Remix configuration
```

#### Vite
```bash
npx shadcn@latest init
# Choose appropriate Vite configuration
```

#### Gatsby
```bash
npm init gatsby
# Then initialize shadcn/ui
npx shadcn@latest init
```

#### TanStack Start
```bash
# Install Tailwind dependencies
npm install tailwindcss @tailwindcss/postcss postcss

# Initialize shadcn/ui
npx shadcn@canary init

# Add components
npx shadcn@canary add button
```

### Monorepo Setup
```bash
# Initialize monorepo project
npx shadcn@canary init

# Choose: Next.js (Monorepo)
# Sets up 'web' and 'ui' workspaces with Turborepo
```

### CLI Command Reference

#### Init Command Options
```bash
# Initialize with all options
npx shadcn@latest init [options] [components...]

# Options:
# -t, --template <template>      next, next-monorepo
# -b, --base-color <base-color>  neutral, gray, zinc, stone, slate
# -y, --yes                      skip confirmation prompt
# -f, --force                    force overwrite existing configuration
# -c, --cwd <cwd>                working directory
# -s, --silent                   mute output
# --src-dir                      use src directory
# --no-src-dir                   do not use src directory
# --css-variables                use CSS variables for theming
# --no-css-variables             do not use CSS variables

# Examples:
npx shadcn@latest init -y --src-dir --css-variables -b zinc
npx shadcn@latest init --template next-monorepo --base-color slate
```

### Development & Publishing

#### Development Server
```bash
# Start development server (pnpm projects)
pnpm install
pnpm www:dev

# Regular npm projects
npm run dev
npm run setup  # Initial project setup if needed
```

### Project Setup & Development Workflow

#### Repository Setup
```bash
# Clone project repository
git clone https://github.com/your-org/trading-app
cd trading-app

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

#### Database Setup (Docker)
```bash
# Start PostgreSQL Docker container
pnpm db:start

# Setup database schema and seed data
pnpm db:setup

# Alternative: Complete setup with Docker (includes dependencies, database, seeding)
pnpm ollie
```

#### Development Commands
```bash
# Start development server
pnpm dev

# Database operations
pnpm db:start     # Start PostgreSQL container
pnpm db:setup     # Apply schema and seed data
pnpm db:migrate   # Run migrations only
pnpm db:seed      # Seed data only
```

#### Git Workflow
```bash
# Create feature branch
git checkout -b feature/trading-dashboard

# Make changes, then commit
git add .
git commit -m 'Add trading dashboard with real-time charts'

# Push to remote repository
git push -u origin feature/trading-dashboard

# Create pull request via GitHub/GitLab interface
```

### Environment Configuration

#### Example .env file for Trading App
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trading_db"

# IB Gateway
IB_GATEWAY_HOST="127.0.0.1"
IB_GATEWAY_PORT=7497

# API Keys
ALPHA_VANTAGE_API_KEY="your_api_key"
POLYGON_API_KEY="your_polygon_key"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Trading Configuration
ENABLE_PAPER_TRADING=true
MAX_POSITION_SIZE=10000
RISK_LIMIT_PERCENT=2
```

### Advanced Components

#### Sidebar Layout
```tsx
import { Sidebar, SidebarContent } from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        {/* Trading navigation, watchlists, portfolio summary */}
      </SidebarContent>
    </Sidebar>
  )
}
```

### Theming with CSS Variables
```css
/* In your global CSS file */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode variables */
  }
}
```

## Tailwind CSS 3.4.x

### Installation
```bash
npm install -D tailwindcss@^3.4.0 postcss autoprefixer
npx tailwindcss init -p
```

### Configuration (tailwind.config.js)
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
      }
    },
  },
  plugins: [],
}
```

### Component Styling Example
```tsx
const TradingCard = () => (
  <div className="rounded-lg bg-white p-6 shadow-lg hover:shadow-xl transition-shadow">
    <h3 className="text-xl font-semibold text-gray-900">Trade Summary</h3>
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div className="text-sm text-gray-600">Profit/Loss</div>
      <div className="text-sm font-medium text-green-600">+$1,234.56</div>
    </div>
  </div>
)
```

## Recharts 2.x

### Installation
```bash
npm install recharts@^2.0.0
```

### Basic Chart Example
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { time: '09:00', price: 100 },
  { time: '10:00', price: 105 },
  { time: '11:00', price: 103 },
  { time: '12:00', price: 108 },
]

export const PriceChart = () => (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" />
      <YAxis />
      <Tooltip />
      <Line 
        type="monotone" 
        dataKey="price" 
        stroke="#3b82f6" 
        strokeWidth={2}
      />
    </LineChart>
  </ResponsiveContainer>
)
```

### Custom Tooltip
```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-lg">
        <p className="text-sm font-medium">{`Time: ${label}`}</p>
        <p className="text-sm text-green-600">
          {`Price: $${payload[0].value.toFixed(2)}`}
        </p>
      </div>
    )
  }
  return null
}
```

## React Hook Form 7.x

### Installation
```bash
npm install react-hook-form@^7.0.0
```

### Basic Form Example
```tsx
import { useForm } from 'react-hook-form'

interface TradeFormData {
  symbol: string
  quantity: number
  price: number
  orderType: 'market' | 'limit'
}

export const TradeForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<TradeFormData>()
  
  const onSubmit = (data: TradeFormData) => {
    console.log('Trade data:', data)
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input
          {...register('symbol', { required: 'Symbol is required' })}
          placeholder="Symbol"
          className="input"
        />
        {errors.symbol && <span className="text-red-500 text-sm">{errors.symbol.message}</span>}
      </div>
      
      <div>
        <input
          type="number"
          {...register('quantity', { 
            required: 'Quantity is required',
            min: { value: 1, message: 'Minimum quantity is 1' }
          })}
          placeholder="Quantity"
          className="input"
        />
        {errors.quantity && <span className="text-red-500 text-sm">{errors.quantity.message}</span>}
      </div>
      
      <button type="submit" className="btn-primary">Submit Order</button>
    </form>
  )
}
```

## Zod 3.x

### Installation
```bash
npm install zod@^3.0.0
npm install @hookform/resolvers
```

### Schema Validation
```tsx
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

// Define schema
const tradeSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive').multipleOf(0.01),
  orderType: z.enum(['market', 'limit']),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
})

type TradeFormData = z.infer<typeof tradeSchema>

export const ValidatedTradeForm = () => {
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema)
  })
  
  const onSubmit = (data: TradeFormData) => {
    // Type-safe data
    console.log('Validated trade:', data)
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

### Advanced Validation
```tsx
const advancedTradeSchema = z.object({
  symbol: z.string().regex(/^[A-Z]+$/, 'Symbol must be uppercase'),
  quantity: z.number().int().min(1).max(10000),
  price: z.number().positive(),
  orderType: z.enum(['market', 'limit']),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
}).refine(
  (data) => {
    if (data.stopLoss && data.takeProfit) {
      return data.stopLoss < data.price && data.takeProfit > data.price
    }
    return true
  },
  {
    message: "Stop loss must be below price and take profit above price",
    path: ["stopLoss"],
  }
)
```

## Integration Example

### Complete Trading Dashboard with Shadcn/ui
```tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const tradeSchema = z.object({
  symbol: z.string().min(1),
  quantity: z.number().positive(),
  orderType: z.enum(['market', 'limit']),
})

type TradeData = z.infer<typeof tradeSchema>

export const TradingDashboard: React.FC = () => {
  const { toast } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm<TradeData>({
    resolver: zodResolver(tradeSchema)
  })
  
  const chartData = [
    { time: '09:00', value: 100 },
    { time: '10:00', value: 105 },
    { time: '11:00', value: 102 },
  ]
  
  const onSubmit = (data: TradeData) => {
    console.log('Executing trade:', data)
    toast({
      title: "Order Submitted",
      description: `${data.orderType} order for ${data.quantity} shares of ${data.symbol}`,
    })
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Trading Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Card */}
        <Card>
          <CardHeader>
            <CardTitle>Price Chart</CardTitle>
            <CardDescription>Real-time market data</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Order Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
            <CardDescription>Enter your order details below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  {...register('symbol')}
                  placeholder="e.g., AAPL"
                />
                {errors.symbol && (
                  <p className="text-sm text-destructive mt-1">{errors.symbol.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                  placeholder="Number of shares"
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive mt-1">{errors.quantity.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="orderType">Order Type</Label>
                <Select {...register('orderType')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full">
                Submit Order
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

## Best Practices

### 1. Component Structure
- Keep components small and focused
- Use TypeScript for type safety
- Implement proper error boundaries

### 2. State Management
- Use React Query for server state
- Consider Zustand for client state
- Implement optimistic updates

### 3. Performance
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Lazy load heavy components

### 4. Testing
```bash
npm install -D @testing-library/react @testing-library/jest-dom vitest
```

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

test('renders button with text', () => {
  render(<Button variant="primary" onClick={() => {}}>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```