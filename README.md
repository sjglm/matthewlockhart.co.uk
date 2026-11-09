# Matthew Lockhart's portfolio

A static personal website with no build step. `index.html` contains the professional portfolio; `life.html` is a separate personal page, with the travel globe first and a Blog section below for future posts. `styles.css` controls the shared layout, and `script.js` handles the theme and image galleries. Life also uses `travel.css` and `travel.js`, with a locally hosted D3 Geo renderer and Natural Earth country boundaries.

Travel entries live in `travel-data.json`. Add each country's three-letter map ID (for example `FRA`), its `name`, a `notes` array and a `photos` array. Photos use `{ "src": "Assets/travel/france/photo.jpg", "alt": "Description of the photo", "caption": "Photo caption" }`. Only countries listed in this file are highlighted. Country names and IDs are in `Assets/travel/countries.geojson`; map and library attribution is in `Assets/travel/sources.json`.

The `cruises` array in the same file contains ship names, sailing dates, ordered ports, map paths and itinerary source links. Coordinates use `[longitude, latitude]`.
