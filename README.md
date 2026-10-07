# House

A private editor for the ground floor and first floor of this house.
Use the 3D cutaway or top view to place furniture, paint wall faces, and change room floors.
Named designs save to the home server and cover both floors.

## Run locally

Use Node 24 and npm. The local database uses `data/house.db`.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Vite sends API requests to the server on port 8080.
For the built app:

```sh
npm run build
npm start
```

Open `http://127.0.0.1:8080`. The website and API share one origin.

## Use the editor

- Select a floor and a 3D or top view.
- Drag empty space to rotate in 3D or pan in top view. Use the right mouse button to pan in 3D.
- Pinch or scroll to zoom. Use the camera buttons to zoom or reset the view.
- Select a furniture item, then drag it to move it. Camera controls stop during the drag.
- Use the properties panel for position, dimensions, rotation, colour, duplication, and deletion.
- Use the arrow keys to move selected furniture by 0.1 metre. Hold Shift for a 0.5 metre step.
- Use Delete or Backspace to delete furniture. Use Command/Ctrl+Z to undo and Shift+Command/Ctrl+Z to redo.
- Select a floor or use the Rooms panel to change its finish. Select a wall face there or on the canvas.
- Use **Select any wall face** to reach either side of every wall, including hidden faces.
- On mobile, use the bottom toolbar to open each panel.

The snap option rounds drag positions to 0.1 metre. Numeric controls permit precise positions.
Furniture stays within the floor boundary. An amber outline warns about a wall overlap, but permits the position.
Door openings do not trigger a wall warning.

## Save designs

The server creates one furnished starter design when it initializes the database.
New designs use a furniture preset based on the room photos. The furniture dimensions and positions are estimates.
Bedroom two contains the sofa and triple-monitor desk. Bedroom three contains the desk, storage daybed, and bookcase.
Bedroom two has front and side windows. Bedroom three has one side window.
The main bathroom has a small front window. Its size and position are estimates.
Both floors mirror the original plan from left to right. The kitchen is on the right in top view.
The main bedroom has an open wardrobe area. Its enclosure walls are removed.
The lounge contains two sofas, an ottoman, a coffee table, and a TV unit.
The main bedroom contains the bed, bedside tables, dressing table, and wardrobes.
Dining furniture follows the illustrated plan because the room photos do not show it.
Use the Designs panel to create, open, or delete a design. Change its name in the header.
Use **Save a copy** to duplicate the current design.

The editor saves 750 milliseconds after the last completed edit. It saves a drag when the drag ends.
It sends one save request at a time. New changes retain a browser draft until the server confirms their save.
Failed requests retain the draft and retry with a delay. The status shows pending, saved, failed, or conflicting changes.

If another device changes the design, automatic saves stop. Save the draft as a new design or load the server version.
After a reload, recover an unsaved draft or discard it. An older draft recovers as a new design.
Drafts depend on browser storage. The editor reports when that storage is unavailable.

## Measurements and privacy

The house model follows the local illustrated plans. Listed dimensions guide it where they are consistent.
Unknown measurements, including wall thickness, openings, stairs, and fittings, are estimates.
The kitchen width is estimated at 3.17 metres because the listed 1.17 metres conflicts with the plan proportions.
The first floor follows the stepped bedroom boundaries and L-shaped landing in the plan.
The listed bedroom dimensions guide their main areas. Missing recess and passage dimensions remain estimates.
Use measured dimensions before ordering furniture. The editor is a visual plan.

House model version 4 mirrors both floors and corrects the wardrobe, windows, and bedroom furniture.
It adds kitchen units, a fridge, garden doors, lounge shelves, and a corner cabinet.
The dining area has no cabinets. The table has two chairs toward the front window and two toward the kitchen.
The brown sofa sits against the hallway wall. The lounge door sits near the front door.
The house is 60 centimetres wider. The toilet, understairs cupboard, and hallway each gain 30 centimetres.
The cupboard extends to the kitchen doorway. The stairs enter from the hallway and turn above the cupboard.
The mirrored floor plan supplies the window locations, including both kitchen windows. The lounge door follows the owner's correction.
The server migrates version 1 and 2 designs once, in a transaction.
The migration mirrors saved furniture and swaps furniture between bedrooms two and three.
It preserves furniture identifiers, dimensions, colours, floor finishes, and paint on retained wall faces.
The browser can recover an older draft as a new design. Review furniture positions against the corrected walls.
Version 3 designs require a fresh design. The deployment keeps a database backup before this reset.

The private files stay in ignored `reference/`. The app does not serve or copy them.
The Docker build context uses a file allowlist. It excludes references, plans, databases, and local environment files.
All furniture models, thumbnails, textures, icons, and fonts are local. The browser does not request remote assets.

See [ADR 0001](docs/adr/0001-fixed-house-model-and-designs.md) and the [glossary](GLOSSARY.md).

## Verify

```sh
npm test
npm run build
node scripts/check-assets.mjs
node scripts/check-server.mjs
npx playwright install chromium
npm run test:e2e
```

Vitest checks the editor, automatic saves, HTTP requests, and the same storage contract against memory and SQLite.
It checks persistence after a database restart. Playwright checks desktop, mobile, saved designs, and recovery.
Browser tests use an isolated database in ignored `test-results/`. They run the built app on port 8093.

## Docker

```sh
docker build -t house:local .
node scripts/check-container.mjs house:local
docker volume create house-data
docker run --name house --restart unless-stopped -p 127.0.0.1:8080:8080 -v house-data:/data house:local
```

The container uses Node 24, serves port 8080, and exposes `/healthz`.
The container check uses its own container and volume. It checks health, restart persistence, and reference exclusion.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port |
| `HOST` | `0.0.0.0` | Listen address |
| `HOUSE_DB_PATH` | `/data/house.db` in Docker | SQLite database file |

The container runs as the `node` user. Give that user write access to a bind-mounted data directory.
If the home server overrides the user, give that user access to the same directory.
Keep `/data` persistent. Stop the container before copying the whole data directory for a backup.
Restore the directory with the same ownership before starting the container.

## Home-server delivery

The existing home-server draft expects `ghcr.io/bensuskins/house:latest`, container port 8080, and a persistent `/data` mount.
It sets `HOUSE_DB_PATH=/data/house.db` and checks `/healthz`. Its private host port is 8791.
The protected hostname is `house.suskins.co.uk` through the existing Authelia proxy route.
This repository does not change or deploy that draft.

The app has a shared design library and no application accounts. Authelia protects the proxy route.
Direct host-port access bypasses Authelia. Keep it within the private LAN and Tailscale network.
Do not expose the direct port through an internet router. Preserve the original Host header at the proxy.
The server rejects cross-origin browser writes.

After reviewing and applying the server draft, check health, protected access, and a saved design after a container restart.
Check LAN and Tailscale access. Confirm that an unauthenticated proxy request reaches Authelia.

## CI and publication

The [workflow](.github/workflows/checks.yml) runs tests and a production build on pull requests and pushes to `main`.
It builds a Docker image and checks health, persistence, and reference exclusion.
After checks pass on `main`, it publishes the tested image as `ghcr.io/bensuskins/house:latest` and a commit tag.
It uses `GITHUB_TOKEN` with package write permission. Configure home-server GHCR access if the package is private.
See the [official Docker action documentation](https://github.com/docker/build-push-action) for the build action.

Structural edits, branded furniture, model uploads, walkthroughs, and an exterior view are outside this release.
