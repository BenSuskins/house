# House editor

The house editor shows this house and lets its owner plan changes to its interior.

## Language

**House**:
The existing building shown in the reference files.

**Ground floor**:
The lower of the two house floors in the editor.
_Avoid_: First floor

**First floor**:
The house floor above the ground floor.
_Avoid_: Second floor

**Furniture item**:
One piece of furniture placed in the house.
_Avoid_: Object, asset

**House model**:
The fixed geometry of the house, including rooms, walls, openings, stairs, and fixed fittings on both floors.

**House model version**:
The version of the house model that a design uses.

**Room**:
A named area on one floor. It has a floor finish and wall faces.

**Wall face**:
One side of a wall. Each wall face has its own paint colour.

**Floor finish**:
The material and colour of a room floor. The material is wood, carpet, or tile.

**Fixed fitting**:
A kitchen or bathroom fitting in the house model. A design cannot move it.

**Furniture catalogue**:
The generic furniture types available to add to a design.

**Design**:
A named set of wall colours, floor finishes, and furniture items for both floors.
_Avoid_: Layout, project, scene when the term means a saved design

**Revision**:
The server's numbered version of a saved design. Each successful update increases the revision.

**Draft**:
The changes stored on one browser before the server confirms their save.

**Conflict**:
An attempted save that uses an older revision than the server. The editor keeps the draft and stops automatic saves.

**Cutaway view**:
A 3D view with short walls that exposes the interior.

**Top view**:
An orthographic view directly above one floor.

**Grid snapping**:
An option that rounds a furniture position to the nearest 0.1 metre during a drag.

**Wall overlap**:
A furniture footprint that crosses a solid wall. The editor warns about it but permits the position.

**Floor boundary**:
The outer limit for furniture placement. Every corner of a furniture footprint must remain inside this limit.

**Estimated measurement**:
A measurement derived from the plan proportions rather than a listed room dimension.
