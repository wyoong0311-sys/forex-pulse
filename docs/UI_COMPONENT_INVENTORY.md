# Forex Pulse UI Component Inventory

## Purpose
This inventory is the guardrail for consistent UI across `Home`, `Markets`, `Pair Detail`, `Alerts`, `Insights`, and `Settings`.
Use shared components first before adding screen-specific layout blocks.

## Design System Tokens
- Source files:
  - `mobile/src/theme/colors.js`
  - `mobile/src/theme/spacing.js`
  - `mobile/src/theme/radius.js`
  - `mobile/src/theme/styles.js`
- Rule:
  - New UI blocks should use `colors` and shared card/row styles.
  - Avoid hardcoding repeated color values unless there is a one-off semantic reason.

## Shared Components

### `SectionHeader`
- File: `mobile/src/components/SectionHeader.js`
- Purpose: Consistent section title row with optional subtitle and action.
- Props:
  - `title: string`
  - `subtitle?: string`
  - `action?: ReactNode`
  - `actionLabel?: string`
  - `onActionPress?: () => void`
- Use in:
  - `Home`, `Markets`, `Alerts`, `Insights`
- Replace:
  - One-off title rows like `Recent notifications`, `Market summary`, `Available pairs`, `Alert history`.

### `ConfidenceBadge`
- File: `mobile/src/components/ConfidenceBadge.js`
- Purpose: Normalized confidence display with tiers and percent.
- Props:
  - `confidence?: number | null`
- Use in:
  - `Home` watchlist cards
  - `Markets` cards (`PairCard`)
  - `Pair Detail` hero and forecast views
- Replace:
  - Any local confidence text badges.

### `DirectionChip`
- File: `mobile/src/components/DirectionChip.js`
- Purpose: Standard bullish/bearish/sideways direction tone.
- Props:
  - `direction?: string`
- Use in:
  - `Home`, `Pair Detail`, `ForecastCard`
- Replace:
  - Inline direction pills.

### `ModelTrustCard`
- File: `mobile/src/components/ModelTrustCard.js`
- Purpose: Model trust block from baseline and directional outcomes.
- Props:
  - `beatBaselineCount?: number`
  - `totalRuns?: number`
  - `directionalAccuracy?: number | null`
  - `confidenceDelta?: number | null`
- Use in:
  - `Pair Detail`
- Planned use:
  - `Insights` trust panel.

### `SummaryCard`
- File: `mobile/src/components/SummaryCard.js`
- Purpose: Single reusable summary card for value and descriptive blocks.
- Props:
  - `title: string`
  - `value?: string`
  - `subtitle?: string`
  - `body?: string`
  - `badge?: string`
  - `tone?: 'neutral' | 'up' | 'down' | 'warning' | 'forecast'`
  - `style?: ViewStyle`
- Use in:
  - `Home` market summary
  - `Insights` bullish/bearish summary
  - `Settings` forecast explanation block
- Replace:
  - Home local summary card implementation (completed).

### `ForecastCard`
- File: `mobile/src/components/ForecastCard.js`
- Purpose: Canonical forecast output (predicted close, confidence, range, model, target time).
- Props:
  - `prediction: PredictionViewModel`
- Use in:
  - `Pair Detail`
- Replace:
  - Any future local forecast blocks.

### `AccuracyCard`
- File: `mobile/src/components/AccuracyCard.js`
- Purpose: Shared backtest and model-vs-baseline metrics display.
- Props:
  - `metrics?: Record<string, string | number>`
  - `latest?: PerformanceResult`
  - `baseline?: PerformanceResult`
  - `title?: string`
- Use in:
  - `Pair Detail`
  - `Insights`
- Replace:
  - One-off accuracy text rows.

### `AlertCard`
- File: `mobile/src/components/AlertCard.js`
- Purpose: Active alert row/card with status.
- Props:
  - `alert: Alert`
- Use in:
  - `Alerts`
- Replace:
  - Local active alert list cards.

### `NotificationCard`
- File: `mobile/src/components/NotificationCard.js`
- Purpose: Shared event/notification log card with optional badge and timestamp.
- Props:
  - `title: string`
  - `body: string`
  - `timeLabel?: string`
  - `badgeLabel?: string`
  - `badgeTone?: BadgeTone`
  - `style?: ViewStyle`
- Use in:
  - `Home` recent notifications
  - `Alerts` trigger history
- Replace:
  - Duplicated notification/history card blocks (completed).

### `LoadingState`
- File: `mobile/src/components/LoadingState.js`
- Purpose: Shared loading panel for async data blocks.
- Props:
  - `title?: string`
  - `subtitle?: string`
- Use in:
  - `Home`, `Markets`, `Pair Detail`, `Alerts`, `Insights`, `Settings`

### `EmptyState`
- File: `mobile/src/components/EmptyState.js`
- Purpose: Shared empty-state panel with optional action.
- Props:
  - `title: string`
  - `body: string`
  - `actionLabel?: string`
  - `onActionPress?: () => void`
- Use in:
  - `Home`, `Markets`, `Pair Detail`, `Alerts`, `Insights`, `Settings`

### `ErrorState`
- File: `mobile/src/components/ErrorState.js`
- Purpose: Shared recoverable error panel with retry action.
- Props:
  - `title?: string`
  - `body?: string`
  - `actionLabel?: string`
  - `onActionPress?: () => void`
- Use in:
  - `Alerts`, `Insights`, `Settings`, `Markets` retry path

## Screen-to-Component Map

### Home
- `SectionHeader`, `SummaryCard`, `NotificationCard`, `ConfidenceBadge`, `DirectionChip`, `EmptyState`, `LoadingState`

### Markets
- `SectionHeader`, `PairCard`, `Badge`, `LoadingState`, `EmptyState`, `ErrorState`

### Pair Detail
- `ForecastCard`, `AccuracyCard`, `ModelTrustCard`, `AlertForm`, `Badge`, `ConfidenceBadge`, `DirectionChip`, `LoadingState`, `EmptyState`

### Alerts
- `SectionHeader`, `AlertCard`, `NotificationCard`, `LoadingState`, `EmptyState`, `ErrorState`

### Insights
- `SectionHeader`, `SummaryCard`, `AccuracyCard`, `LoadingState`, `EmptyState`, `ErrorState`, `Badge`

### Settings
- `SummaryCard`, `LoadingState`, `EmptyState`, `ErrorState`, `Badge`

## Refactor Actions Completed In This Pass
- Replaced Home local summary card with shared `SummaryCard`.
- Added shared `NotificationCard` and replaced duplicated notification/history blocks in `Home` and `Alerts`.
- Expanded `SectionHeader` to support action label + callback consistently.
- Added and integrated shared async state components: `LoadingState`, `EmptyState`, `ErrorState`.

## Refactor Backlog (Next Pass)
- Move recurring “hero header” blocks to a shared `ScreenHero` component.
- Build `SettingsGroup` + `SettingsRow` shared components to remove local duplication in `Settings`.
- Standardize chips (`FilterChip`, range chips) into a reusable chip component.
- Replace remaining hardcoded hex values in screens with token-based colors.

## Usage Rules
1. Before adding new UI, check if a matching shared component already exists.
2. If one screen needs a new variant, extend component props; do not fork a new local component.
3. Keep market actuals and forecast visuals separate in naming and rendering.
4. Keep empty/error/loading copy plain language and short.
