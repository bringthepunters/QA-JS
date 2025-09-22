# Live Music Locator QA Bear

## Overview

Live Music Locator QA Bear is a Single Page Application (SPA) designed for quality assurance of live music gig data. It helps users review and analyze gig data across different locations, identify data quality issues, and track gig distribution by venue and time.

## Features

- **Multi-location Support**: View gig data for Melbourne, Bendigo, Castlemaine, and Geelong.
- **Venue Filtering**: Filter venues by name to focus on specific venues.
- **Owner Filtering**: Filter venues by owner/category to view related venues.
- **Weekly View**: Displays gig counts for a 16-week period (10 weeks past to 6 weeks future).
- **Visual Indicators**: Highlights current week and flags missing genre information.
- **Interactive Elements**: Tooltips show gig names when hovering over cells.
- **Data Refresh**: Manually refresh data to see the latest information.
- **Admin Links**: Direct links to admin interface for current week gigs.
- **Progress Tracking**: Visual loading indicator for data fetching.

## Data Sources

### Gig Data

Gig data is fetched from the Live Music Locator API:
- Endpoint: `https://api.lml.live/gigs/query`
- Parameters:
  - `location`: melbourne, bendigo, castlemaine, or geelong
  - `date_from`: ISO date for start of week
  - `date_to`: ISO date for end of week

Example fetch URLs:
```
https://api.lml.live/gigs/query?location=melbourne&date_from=2025-09-22T04:00:00Z&date_to=2025-09-29T03:59:59Z
https://api.lml.live/gigs/query?location=bendigo&date_from=2025-09-22T04:00:00Z&date_to=2025-09-29T03:59:59Z
https://api.lml.live/gigs/query?location=castlemaine&date_from=2025-09-22T04:00:00Z&date_to=2025-09-29T03:59:59Z
https://api.lml.live/gigs/query?location=geelong&date_from=2025-09-22T04:00:00Z&date_to=2025-09-29T03:59:59Z
```

The app fetches data week by week, with each week starting at Monday 4:00:00 AM and ending at the following Monday 3:59:59 AM.

### Venue Owner Data Source

This SPA loads all venue owner/category data from a static CSV file (`LML Admin Central - LML Venues.csv`) included in the project.

**Note:** Due to browser security (CORS) restrictions, it is not possible to fetch live Google Sheets data directly from the browser.
If you need to update the owner/category data, replace or update the static CSV file in the project.

- The app does not use a backend or any dynamic API for this data.
- All owner/category lookups are performed client-side from the static CSV.

## Table Structure

The main table displays:
- **Owner Column**: Single letter category code for each venue.
- **Venue Column**: Name of the venue.
- **Week Columns**: Number of gigs at the venue for each week.
  - Background color indicates presence of gigs
  - Red text indicates missing genre tags
  - Current week links to admin interface
  - Tooltips show gig names on hover

## Usage

1. Select a location from the dropdown (Melbourne, Bendigo, Castlemaine, or Geelong).
2. Use the filter inputs to search for specific venues or owners.
3. Click "Refresh" to fetch the latest data.
4. Hover over cells to see gig names for that venue and week.
5. Click on numbers in the current week column to open the admin interface for those gigs.

## Running the App

The app is a pure client-side SPA with no build process required:
1. Open `index.html` in a browser.
2. Ensure the static CSV file is present in the same directory.