/***** JavaScript *****/

// Google Sheet CSV URL for "LML Venues" tab
/* Fetch and parse the venue owners CSV, returns a mapping { LML ID: Owner } */
async function fetchVenueOwners() {
    const url = './LML Admin Central - LML Venues.csv';
    console.log("Fetching owners from local CSV file:", url);
    try {
        const res = await fetch(url);
        const csv = await res.text();
        console.log("Raw fetch response from local CSV:", csv.slice(0, 1000)); // Print first 1000 chars

        // Robust CSV parser for quoted fields
        function parseCSV(text) {
            const rows = [];
            let row = [];
            let cell = '';
            let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '"') {
                    if (inQuotes && text[i + 1] === '"') {
                        cell += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    row.push(cell);
                    cell = '';
                } else if ((char === '\n' || char === '\r') && !inQuotes) {
                    if (cell !== '' || row.length > 0) {
                        row.push(cell);
                        rows.push(row);
                        row = [];
                        cell = '';
                    }
                    // Handle \r\n
                    if (char === '\r' && text[i + 1] === '\n') i++;
                } else {
                    cell += char;
                }
            }
            if (cell !== '' || row.length > 0) {
                row.push(cell);
                rows.push(row);
            }
            return rows;
        }

        // Parse and map after fetch
        const lines = parseCSV(csv).filter(row => row.length > 1);
        // Headers are on the second line (index 1) in this specific CSV
        if (lines.length < 2) {
            console.error("CSV has less than 2 lines, cannot find headers.");
            return {};
        }
        const headers = lines[1].map(h => h.trim().toLowerCase());
        const idIdx = headers.findIndex(h => h === "lml id");
        const ownerIdx = headers.findIndex(h => h === "owner");

        if (idIdx === -1 || ownerIdx === -1) {
             console.error("Could not find 'lml id' or 'owner' header in the second row. Found headers:", headers);
             return {};
        }
        const map = {};
        // Data starts from the third line (index 2)
        for (let i = 2; i < lines.length; i++) {
            const cols = lines[i];
            // Ensure the row has enough columns before accessing indices
            if (cols.length > Math.max(idIdx, ownerIdx)) {
                const id = cols[idIdx]?.trim().toLowerCase();
                const owner = cols[ownerIdx]?.trim();
                if (id) map[id] = owner || "-";
            } else {
                 console.warn(`Skipping row ${i+1} due to insufficient columns:`, cols);
            }
        }
        return map;
    } catch (e) {
        console.error("Error fetching or parsing venue owners CSV:", e);
        return {};
    }
};

/** API Settings **/
const API_BASE_URL = "https://api.lml.live/gigs/query";
const WEEKS_PAST = 10;
const WEEKS_FUTURE = 6;

// API Settings section continues below

// Helper function to get the start of the week (Monday 4am)
function getWeekStart(date) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    result.setDate(diff);
    result.setHours(4, 0, 0, 0);
    return result;
}

const currentDate = new Date();
const startDate = getWeekStart(new Date(currentDate));
startDate.setDate(startDate.getDate() - WEEKS_PAST * 7);

const endDate = getWeekStart(new Date(currentDate));
endDate.setDate(endDate.getDate() + WEEKS_FUTURE * 7);

/**
 * Fetch gigs from the API week by week, updating the progress bar as we go.
 */
async function fetchGigs(location) {
    const gigs = [];
    let weekStart = new Date(startDate);

    const progressBar = document.getElementById("progress-bar-fill");
    const progressMessage = document.getElementById("loading-message");
    const progressCount = document.getElementById("progress-count");

    // Show loading message and initialize progress
    progressMessage.style.display = "block";
    let totalWeeks = WEEKS_PAST + WEEKS_FUTURE + 1;
    let loadedWeeks = 0;

    while (weekStart <= endDate) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7); // Full week
        weekEnd.setHours(3, 59, 59, 999); // End at 3:59:59.999am next Monday

        const url = `${API_BASE_URL}?location=${location}&date_from=${weekStart
            .toISOString()
            .split(".")[0]}Z&date_to=${weekEnd.toISOString().split(".")[0]}Z`;

        try {
            const response = await fetch(url);
            if (response.ok) {
                const weekGigs = await response.json();
                gigs.push(...weekGigs);
            }
        } catch (error) {
            console.error("Error fetching data: ", error);
        }

        // Update progress bar and message
        loadedWeeks++;
        const progress = Math.round((loadedWeeks / totalWeeks) * 100);
        progressBar.style.width = `${progress}%`;
        progressCount.textContent = `${progress}%`;

        weekStart.setDate(weekStart.getDate() + 7);
    }

    // Hide loading message after completion
    progressMessage.style.display = "none";
    
    // Deduplicate gigs by ID to prevent false duplicates from overlapping week fetches
    const uniqueGigs = [];
    const seenIds = new Set();
    
    for (const gig of gigs) {
        if (!seenIds.has(gig.id)) {
            seenIds.add(gig.id);
            uniqueGigs.push(gig);
        }
    }
    
    console.log(`Fetched ${gigs.length} total gigs, deduped to ${uniqueGigs.length} unique gigs`);
    
    return uniqueGigs;
}

/**
 * Generate the labels for each week from startDate to endDate.
 * e.g., -10w, -9w, ..., <b>This week</b>, +1w, ...
 */
function generateWeekLabels() {
    const labels = [];
    let weekStart = new Date(startDate);
    const currentWeekStart = getWeekStart(currentDate);

    while (weekStart <= endDate) {
        const diffWeeks = Math.round(
            (weekStart - currentWeekStart) / (7 * 24 * 60 * 60 * 1000)
        );
        labels.push(
            diffWeeks === 0
                ? "<b>This week</b>"
                : diffWeeks < 0
                    ? `${diffWeeks}w`
                    : `+${diffWeeks}w`
        );
        weekStart.setDate(weekStart.getDate() + 7);
    }
    return labels;
}

/**
 * Render the gig data in a table format.
 * Each row corresponds to a venue, and columns correspond to each week.
 */
function renderTable(gigs, venueOwnersMap) {
    const venues = {};
    const weeks = generateWeekLabels();
    let maxVenueNameLength = 0;

    // Prepare a structure for each venue to hold gig counts/weeks
    gigs.forEach((gig) => {
        const venueId = gig.venue.id;
        const venueName = gig.venue.name;
        const gigDate = new Date(gig.date);

        // Get the week start (Monday 4am) for this gig
        const weekStart = getWeekStart(gigDate);
        
        maxVenueNameLength = Math.max(maxVenueNameLength, venueName.length);

        // Initialize the venue if it doesn't exist
        if (!venues[venueId]) {
            venues[venueId] = { id: venueId, name: venueName, weeks: {} };
            weeks.forEach((week) => {
                venues[venueId].weeks[week] = { count: 0, gigNames: [], gigs: [] };
            });
        }

        // Determine the label based on the difference from current week
        const currentWeekStart = getWeekStart(currentDate);
        const diffWeeks = Math.round(
            (weekStart - currentWeekStart) / (7 * 24 * 60 * 60 * 1000)
        );
        const label =
            diffWeeks === 0
                ? "<b>This week</b>"
                : diffWeeks < 0
                    ? `${diffWeeks}w`
                    : `+${diffWeeks}w`;

        // If this label exists in the venue's weeks, update it
        if (venues[venueId].weeks[label]) {
            venues[venueId].weeks[label].count++;
            venues[venueId].weeks[label].gigNames.push(gig.name);
            venues[venueId].weeks[label].gigs.push(gig);
        }
    });

    const table = document.createElement("table");
    
    // Add table header
    const headerRow = document.createElement("tr");
    // Owner column header (centered)
    const ownerHeader = document.createElement("th");
    ownerHeader.textContent = ""; // Removed "Owner" as requested
    headerRow.appendChild(ownerHeader);

    // Venue column header (left-aligned)
    const venueHeader = document.createElement("th");
    venueHeader.textContent = "Venue"; // Restore the header text
    // venueHeader.classList.add("venue-column"); // Remove class from TH
    venueHeader.style.width = `${maxVenueNameLength * 7 + 20}px`;
    // Make sure venue header is visually distinct like other headers
    venueHeader.style.textAlign = "left";
    // venueHeader.style.color = "black"; // Remove inline style
    headerRow.appendChild(venueHeader);

    weeks.forEach((week) => {
        const weekHeader = document.createElement("th");
        weekHeader.innerHTML = week;
        headerRow.appendChild(weekHeader);
    });

    const thead = document.createElement("thead");
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Add table rows for each venue
    const tbody = document.createElement("tbody");

    // Convert venues object to an array and sort alphabetically by owner name (case-insensitive)
    const sortedVenues = Object.values(venues).sort((a, b) => {
        // Get owner names, defaulting to '-' if not found or ID is missing
        const ownerA = (venueOwnersMap && a.id && venueOwnersMap[a.id.trim().toLowerCase()]) || '-';
        const ownerB = (venueOwnersMap && b.id && venueOwnersMap[b.id.trim().toLowerCase()]) || '-';
        const nameA = ownerA.toLowerCase();
        const nameB = ownerB.toLowerCase();

        // Prioritize non-hyphen owners: If A is '-' and B is not, B comes first.
        if (ownerA === '-' && ownerB !== '-') return 1;
        // If B is '-' and A is not, A comes first.
        if (ownerA !== '-' && ownerB === '-') return -1;

        // If both are '-' or both are not '-', sort alphabetically by owner
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;

        // If owners are the same (or both '-'), sort by venue name as a secondary criterion
        const venueNameA = a.name.toLowerCase();
        const venueNameB = b.name.toLowerCase();
        if (venueNameA < venueNameB) return -1;
        if (venueNameA > venueNameB) return 1;
        return 0;
    });

    // Iterate over the sorted array to create rows
    sortedVenues.forEach((venue) => {
        const row = document.createElement("tr");
        // Owner cell (centered)
        const ownerCell = document.createElement("td");
        // Normalize ID for lookup
        const normId = venue.id ? venue.id.trim().toLowerCase() : "";
        let ownerValue = "-";
        if (venueOwnersMap && venueOwnersMap[normId]) {
            ownerValue = venueOwnersMap[normId];
        }
        ownerCell.textContent = ownerValue;

        // Debug: log mapping for a sample ID and similar keys
        const sampleId = "a7535cc9-de04-4846-99e9-61cd1b02d1b2";
        if (normId === sampleId) {
            console.log("Owner for", sampleId, ":", venueOwnersMap[normId]);
            // Find all mapping keys that contain the sample substring
            const similarKeys = Object.keys(venueOwnersMap).filter(k => k.includes("a7535cc9"));
            console.log("Mapping keys containing 'a7535cc9':", similarKeys);
            // Log lengths and char codes for comparison
            similarKeys.forEach(k => {
                console.log("Key:", k, "Length:", k.length, "Char codes:", Array.from(k).map(c => c.charCodeAt(0)));
            });
            console.log("SampleId Length:", sampleId.length, "Char codes:", Array.from(sampleId).map(c => c.charCodeAt(0)));
        }
        row.appendChild(ownerCell);
        // Venue cell (left-aligned)
        const venueCell = document.createElement("td");
        venueCell.textContent = venue.name;
        venueCell.classList.add("venue-column");
        venueCell.style.whiteSpace = "nowrap";
        row.appendChild(venueCell);

        weeks.forEach((week) => {
            const weekCell = document.createElement("td");
            const weekData = venue.weeks[week];

            // Default: Set background color
            weekCell.style.backgroundColor = weekData.count > 0 ? "#c8faed" : "white";

            // Special handling for "This week" column
            if (week === "<b>This week</b>") {
                weekCell.classList.add("current-week");

                if (weekData.count > 0) {
                    // Create hyperlink for the count
                    const link = document.createElement("a");
                    const adminUrl = `https://api.lml.live/admin/gigs?order=source_desc&q%5Bvenue_id_eq%5D=${venue.id}`;
                    link.href = adminUrl;
                    link.textContent = weekData.count;
                    link.target = "_blank"; // Open in new tab
                    // link.title = "open gigs in admin"; // REVERTED: Remove tooltip text
                    link.style.textDecoration = "underline"; // Optional: make it look like a link
                    link.style.color = "inherit"; // Inherit color (e.g., red if missing genres)
                    weekCell.appendChild(link);

                    // Check for missing genres and set color (applies to link via inheritance)
                    const hasMissingGenres = weekData.gigs.some(
                        (g) => !g.genre_tags || g.genre_tags.length === 0
                    );
                    if (hasMissingGenres) {
                        weekCell.style.color = "red";
                    }
                } else {
                    // If count is 0, just leave the cell empty
                    weekCell.textContent = "";
                }

            } else {
                // For other weeks, just display the count
                weekCell.textContent = weekData.count > 0 ? weekData.count : "";
            }

            // Tooltip logic applies to all cells with gigs
            if (weekData.gigs.length > 0) {
                // Find potential duplicates (same venue, similar name, within 30 minutes)
                const gigGroups = [];
                const processed = new Set();
                
                // Helper function for fuzzy string matching (simplified)
                function stringSimilarity(a, b) {
                    a = a.toLowerCase();
                    b = b.toLowerCase();
                    
                    // Exact match
                    if (a === b) return 1.0;
                    
                    // One is substring of the other
                    if (a.includes(b) || b.includes(a)) return 0.8;
                    
                    // Check for common words
                    const wordsA = a.split(/\s+/);
                    const wordsB = b.split(/\s+/);
                    let commonWords = 0;
                    
                    for (const wordA of wordsA) {
                        if (wordA.length < 3) continue; // Skip short words
                        if (wordsB.some(wordB => wordB.includes(wordA) || wordA.includes(wordB)))
                            commonWords++;
                    }
                    
                    if (commonWords > 0) {
                        return commonWords / Math.max(wordsA.length, wordsB.length);
                    }
                    
                    return 0;
                }
                
                // Group similar gigs
                for (let i = 0; i < weekData.gigs.length; i++) {
                    if (processed.has(i)) continue;
                    
                    const gig = weekData.gigs[i];
                    const group = [gig];
                    processed.add(i);
                    
                    for (let j = 0; j < weekData.gigs.length; j++) {
                        if (i === j || processed.has(j)) continue;
                        
                        const otherGig = weekData.gigs[j];
                        const timeA = new Date(gig.date).getTime();
                        const timeB = new Date(otherGig.date).getTime();
                        const timeDiffMinutes = Math.abs(timeA - timeB) / (1000 * 60);
                        
                        // Check if gigs are within 30 minutes and have similar names
                        if (timeDiffMinutes <= 30 && stringSimilarity(gig.name, otherGig.name) >= 0.7) {
                            group.push(otherGig);
                            processed.add(j);
                        }
                    }
                    
                    gigGroups.push(group);
                }
                
                // Generate tooltip content with potential duplicates highlighted and grouped
                const tooltipContent = gigGroups.map(group => {
                    if (group.length > 1) {
                        // Potential duplicates - style with purple, bold
                        return group.map(gig =>
                            `<a href="https://api.lml.live/admin/gigs/${gig.id}" target="_blank" style="color: purple; font-weight: bold;">${gig.name} (${new Date(gig.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</a>`
                        ).join("<br>");
                    } else {
                        // Single gig - normal styling based on genre
                        const gig = group[0];
                        const color = gig.genre_tags && gig.genre_tags.length > 0 ? "black" : "red";
                        return `<a href="https://api.lml.live/admin/gigs/${gig.id}" target="_blank" style="color: ${color};">${gig.name}</a>`;
                    }
                }).join("<br>");
                
                weekCell.setAttribute("data-tooltip", tooltipContent);
                
                // If this is the current week and has a link, also set the tooltip on the link
                if (week === "<b>This week</b>" && weekCell.querySelector('a')) {
                    weekCell.querySelector('a').setAttribute("data-tooltip", tooltipContent);
                }
            }

            row.appendChild(weekCell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Update DOM
    const gigTableContainer = document.getElementById("gig-table");
    gigTableContainer.innerHTML = "";
    gigTableContainer.appendChild(table);

    // Initialize custom tooltips
    initializeTooltips();
}

// The rest of the code (initializeTooltips, event listeners, etc.) remains the same
/**
 * Initialize custom tooltips using CSS.
 */
function initializeTooltips() {
  // First, remove any existing tooltips
  removeAllTooltips();
  
  // Remove any existing global document click handler and add a new one
  document.removeEventListener('click', removeAllTooltips);
  document.addEventListener('click', removeAllTooltips);
  
  // Get all elements with tooltips
  document.querySelectorAll("[data-tooltip]").forEach((element) => {
    // Clean up any existing event listeners to avoid duplicates
    element.removeEventListener("mouseenter", showTooltip);
    element.removeEventListener("mouseleave", hideTooltip);
    element.removeEventListener("mouseover", showTooltip);
    element.removeEventListener("mouseout", hideTooltip);
    
    // Add new event listeners (use both mouseenter/leave and mouseover/out for better coverage)
    element.addEventListener("mouseenter", showTooltip);
    element.addEventListener("mouseleave", hideTooltip);
  });
  
  // Helper function to remove all tooltips
  function removeAllTooltips() {
    document.querySelectorAll(".custom-tooltip").forEach(tooltip => tooltip.remove());
    
    // Also clear any tooltip references
    document.querySelectorAll("[data-tooltip]").forEach(el => {
      if (el._tooltip) {
        el._tooltip = null;
      }
    });
  }
  
  // Function to show tooltip
  function showTooltip(event) {
    // Remove any existing tooltips first
    removeAllTooltips();
    
    // Find the element with the data-tooltip attribute
    // It could be the target or a parent element
    let tooltipElement = event.target;
    
    // If target doesn't have data-tooltip, check if it's inside an element that does
    if (!tooltipElement.hasAttribute("data-tooltip")) {
      tooltipElement = event.target.closest("[data-tooltip]");
    }
    
    if (!tooltipElement || !tooltipElement.hasAttribute("data-tooltip")) return;
    
    // Create and position the tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "custom-tooltip";
    tooltip.id = "active-tooltip"; // Add an ID for easier reference
    tooltip.innerHTML = tooltipElement.getAttribute("data-tooltip");
    document.body.appendChild(tooltip);

    const rect = tooltipElement.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY - 5}px`; // Overlap by 5px
    
    // Store the tooltip on the element
    tooltipElement._tooltip = tooltip;
    
    // Add mouseout/leave events to the tooltip itself
    tooltip.addEventListener("mouseleave", () => {
      tooltip.remove();
      tooltipElement._tooltip = null;
    });
  }
  
  // Function to hide tooltip
  function hideTooltip(event) {
    // Find the element with the tooltip
    let tooltipElement = event.target;
    
    if (!tooltipElement.hasAttribute("data-tooltip")) {
      tooltipElement = event.target.closest("[data-tooltip]");
    }
    
    // Only remove if we're not moving to the tooltip itself
    if (tooltipElement && tooltipElement._tooltip) {
      const tooltip = tooltipElement._tooltip;
      
      // Check if we're moving to the tooltip
      const relatedTarget = event.relatedTarget;
      if (relatedTarget && (relatedTarget === tooltip || tooltip.contains(relatedTarget))) {
        // Moving to the tooltip itself, don't remove
        return;
      }
      
      // Otherwise, remove the tooltip
      tooltip.remove();
      tooltipElement._tooltip = null;
    }
  }
}

/**
 * Initialize the app by fetching gigs for the selected location and rendering them.
 */
async function initializeApp() {
  const location = document.getElementById("location-select").value;
  // Fetch owners first
  let venueOwnersMap = {};
  try {
    venueOwnersMap = await fetchVenueOwners();
  } catch (e) {
    console.warn("Could not fetch venue owners:", e);
  }
  const gigs = await fetchGigs(location);
  renderTable(gigs, venueOwnersMap);
}

/**
 * Combined filter functionality (Venue and Owner)
 */
function applyFilters() {
  const venueFilterText = document.getElementById("filter-input").value.toLowerCase();
  const ownerFilterText = document.getElementById("owner-filter-input").value.toLowerCase();
  const rows = document.querySelectorAll("tbody tr");

  rows.forEach((row) => {
    // Get venue name (second td) and owner (first td)
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return; // Skip if row doesn't have enough cells

    const ownerName = cells[0].textContent.toLowerCase();
    const venueName = cells[1].textContent.toLowerCase(); // Venue name is in the second column

    const venueMatch = venueName.includes(venueFilterText);
    const ownerMatch = ownerName.includes(ownerFilterText);

    // Show row only if it matches both active filters
    row.style.display = venueMatch && ownerMatch ? "" : "none";
  });
}

// Event listener for venue filter input
document.getElementById("filter-input").addEventListener("input", applyFilters);

// Event listener for owner filter input
document.getElementById("owner-filter-input").addEventListener("input", applyFilters);


/**
 * Clear Venue filter button functionality
 */
document.getElementById("clear-filter-button").addEventListener("click", () => {
  document.getElementById("filter-input").value = "";
  applyFilters(); // Re-apply filters after clearing
});

/**
 * Clear Owner filter button functionality
 */
document.getElementById("clear-owner-filter-button").addEventListener("click", () => {
  document.getElementById("owner-filter-input").value = "";
  applyFilters(); // Re-apply filters after clearing
});


/**
 * Refresh button functionality
 */
document.getElementById("refresh-button").addEventListener("click", initializeApp);

/** Initialize the app on page load **/
document.addEventListener("DOMContentLoaded", initializeApp);
