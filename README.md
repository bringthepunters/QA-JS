# Live Music Locator QA Bear

## Venue Owner Data Source

This SPA loads all venue owner/category data from a static CSV file (`LML Admin Central - LML Venues.csv`) included in the project.

**Note:** Due to browser security (CORS) restrictions, it is not possible to fetch live Google Sheets data directly from the browser.  
If you need to update the owner/category data, replace or update the static CSV file in the project.

- The app does not use a backend or any dynamic API for this data.
- All owner/category lookups are performed client-side from the static CSV.