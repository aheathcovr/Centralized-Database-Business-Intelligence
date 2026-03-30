# Chart Timeline Switching Implementation

## Overview
Implemented timeline switching functionality for all chart components across the dashboard. Users can toggle between different time periods (Monthly, Quarterly, YTD, All Time) with smooth transitions and consistent behavior.

## Files Created/Modified

### New Files
1. **`/dashboard/components/TimelineSelector.tsx`**
   - Reusable UI component for timeline period selection
   - Button group with 4 options: Monthly, Quarterly, YTD, All Time
   - Smooth CSS transitions when switching periods
   - Visual feedback with active state styling

2. **`/dashboard/lib/timeline-utils.ts`**
   - Utility functions for timeline-based filtering
   - `getTimelineStartDate()`: Calculates start date for each period
   - `getTimelineLabel()`: Returns human-readable label (e.g., "March 2026", "Q1 2026")
   - `filterCorporationsByTimeline()`: Filters corporations by creation date
   - `recalculateStatsFromCorporations()`: Recalculates statistics from filtered data

### Modified Files
1. **`/dashboard/components/Dashboard.tsx`**
   - Added timeline state management (`timeline`, `isTransitioning`)
   - Integrated TimelineSelector component in header area
   - Applied timeline filtering to all chart data:
     - Customer Status Distribution chart
     - Product Mix pie chart
     - Product Depth vs. Penetration chart
     - GTM Priority penetration chart
     - Facilities by Corporation Status chart
     - Opportunity Matrix scatter chart
   - Summary cards now show timeline-filtered statistics
   - GTM tier metrics affected by timeline selection
   - Corporation table respects timeline filter
   - Added visual indicator showing current timeline and corporation count

## How It Works

### Timeline Filtering Logic
- **Monthly**: Shows corporations created/going live in the current month
- **Quarterly**: Shows corporations created/going live in the current quarter
- **YTD**: Shows corporations created/going live since January 1 of current year
- **All Time**: Shows all corporations (no filtering)

### Filter Priority
1. Timeline filter is applied first to all corporations
2. UI filters (Status, Product, Search) are applied on top of timeline filter
3. All chart data is recalculated based on timeline-filtered corporations

### Smooth Transitions
- Dashboard container has opacity transition (300ms) during timeline changes
- TimelineSelector buttons have scale and shadow animations on selection
- Disabled state prevents rapid clicking during transitions

## Usage

The TimelineSelector appears at the top of the dashboard, below the header. Users can:
1. Click any of the 4 timeline buttons (Monthly, Quarterly, YTD, All Time)
2. See the current timeline label and corporation count
3. All charts and metrics update immediately with smooth transitions

## Technical Details

- Uses React `useMemo` for efficient filtering and stats recalculation
- Timeline state lifted to Dashboard component for consistent behavior
- Statistics are recalculated client-side from filtered corporations
- Original BigQuery stats preserved for comparison
- TypeScript types shared between components via timeline-utils exports

