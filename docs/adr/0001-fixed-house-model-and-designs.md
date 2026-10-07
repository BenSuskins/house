# ADR 0001: Separate the house model from saved designs

Status: Accepted

## Context

The first release edits furniture and finishes in one existing house. It does not edit the building structure.
The reference plans supply approximate geometry. Some dimensions are missing or inconsistent.
Each named design must cover both floors and work across devices.

## Decision

Keep the house model in application code. Give each room, wall face, and fixed fitting a stable identifier.
Version the house model independently of designs. Record estimated measurements in the model.

Store each design as furniture and finish data in SQLite. Store its house model version and revision with it.
Store independent colours for both faces of each shared wall. Keep fixed fittings outside the saved design.

Reject design data that does not match the current house model version. Require an explicit migration for future geometry changes.
Use a revision check in a transaction for every update or deletion. Preserve the browser draft when the revision check fails.

Version 2 corrects the first-floor boundaries, doors, wardrobe passage, and stair opening from the reference plan.
Keep the version 1 model as the migration source. Match old wall colours by wall, room, and side.
Use neutral paint for new wall faces. Preserve furniture and floor finishes. Increase each migrated design revision once.
Run the migration in a SQLite transaction at startup. Recover an older browser draft through the same content migration.

Version 3 mirrors both floors from left to right and removes the main bedroom wardrobe enclosure.
It corrects the bedroom windows and adds an estimated small bathroom window.
Keep the version 2 model as the migration source. Preserve retained wall face identifiers and their paint.
Mirror furniture positions and rotations. Swap furniture between bedrooms two and three across their shared wall.
Preserve furniture identifiers, dimensions, colours, and room floor finishes. Increase each design revision once.

Version 4 adds the confirmed ground-floor fittings, patio doors, and lounge furniture.
Expand the central block by 60 centimetres across both floors. Keep the kitchen and lounge widths.
Use one staircase across both floors. Its lower flight enters from the hallway and turns above the extended cupboard.
Use the mirrored reference plan for doors and windows. Keep both kitchen windows and a solid wall behind the TV.
Reset the deployed version 3 design to the new preset with an independent database backup, as requested.

## Consequences

Designs remain small. A furniture edit does not duplicate or change the building geometry.
The same house model serves every design. Stable identifiers connect colours and finishes to the correct surfaces.
Geometry changes need a migration before old designs can use the new model. Structural edits remain outside the first release.
