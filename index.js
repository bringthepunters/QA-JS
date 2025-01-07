document.addEventListener("DOMContentLoaded", () => {
  const locationSelect = document.getElementById("location-select");
  const refreshButton = document.getElementById("refresh-button");
  const clearFilterButton = document.getElementById("clear-filter-button");
  const filterInput = document.getElementById("filter-input");
  const gigTable = document.getElementById("gig-table");
  const loadingMessage = document.getElementById("loading-message");
  const errorMessage = document.getElementById("error-message");

  // Fetch gigs function
  async function fetchGigs(location) {
      const gigs = [];
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 10 * 7);
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + 6 * 7);

      let weekStart = new Date(startDate);
      while (weekStart <= endDate) {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const url = `https://api.lml.live/gigs/query?location=${location}&date_from=${weekStart.toISOString().split('T')[0]}&date_to=${weekEnd.toISOString().split('T')[0]}`;
          try {
              const response = await fetch(url);
              if (response.ok) {
                  const weekGigs = await response.json();
                  gigs.push(...weekGigs);
              }
          } catch (error) {
              console.error("Error fetching gigs:", error);
          }
          weekStart.setDate(weekStart.getDate() + 7);
      }
      return gigs;
  }

  // Render table
  function renderTable(gigs) {
      const venues = {};
      const weeks = generateWeekLabels();

      gigs.forEach((gig) => {
          const venueId = gig.venue.id;
          const venueName = gig.venue.name;
          const gigDate = new Date(gig.date);

          const weekStart = new Date(gigDate);
          weekStart.setDate(gigDate.getDate() - gigDate.getDay());

          if (!venues[venueId]) {
              venues[venueId] = { name: venueName, weeks: {} };
              weeks.forEach((week) => (venues[venueId].weeks[week] = 0));
          }

          const diffWeeks = Math.round((weekStart - new Date(weeks[0])) / (7 * 24 * 60 * 60 * 1000));
          const label =
              diffWeeks === 0 ? "<b>This week</b>" : diffWeeks > 0 ? `+${diffWeeks}w` : `-${Math.abs(diffWeeks)}w`;

          venues[venueId].weeks[label] = (venues[venueId].weeks[label] || 0) + 1;
      });

      // Generate table HTML
      let html = `<table class="styled-table"><thead><tr><th style="text-align: left;">Venue</th>`;
      weeks.forEach((week) => {
          const borderStyle = week === "<b>This week</b>" ? "border-left: 3px solid #6c757d; border-right: 3px solid #6c757d;" : "";
          html += `<th style="${borderStyle}">${week}</th>`;
      });
      html += `</tr></thead><tbody>`;

      Object.values(venues).forEach((venue) => {
          html += `<tr><td style="text-align: left;">${venue.name}</td>`;
          weeks.forEach((week) => {
              const count = venue.weeks[week];
              const bgColor = count > 0 ? "#c8faed" : "transparent";
              const textAlign = count > 0 ? "center" : "left";
              html += `<td style="background-color: ${bgColor}; text-align: ${textAlign};">${count > 0 ? count : ""}</td>`;
          });
          html += `</tr>`;
      });

      html += `</tbody></table>`;
      gigTable.innerHTML = html;
  }

  // Generate week labels
  function generateWeekLabels() {
      const labels = [];
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 10 * 7);
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + 6 * 7);

      let weekStart = new Date(startDate);
      while (weekStart <= endDate) {
          const diffWeeks = Math.round((weekStart - currentDate) / (7 * 24 * 60 * 60 * 1000));
          labels.push(
              diffWeeks === 0 ? "<b>This week</b>" : diffWeeks > 0 ? `+${diffWeeks}w` : `-${Math.abs(diffWeeks)}w`
          );
          weekStart.setDate(weekStart.getDate() + 7);
      }

      return labels;
  }

  // Initialize app
  async function initializeApp() {
      const location = locationSelect.value;
      loadingMessage.style.display = "block";
      const gigs = await fetchGigs(location);
      loadingMessage.style.display = "none";

      if (gigs.length === 0) {
          errorMessage.textContent = "No gigs found for the selected location.";
      } else {
          errorMessage.textContent = "";
          renderTable(gigs);
      }
  }

  refreshButton.addEventListener("click", initializeApp);
  clearFilterButton.addEventListener("click", () => {
      filterInput.value = "";
      initializeApp();
  });

  // Initial load
  initializeApp();
});
