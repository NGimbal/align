# Align

[This repo was templated with this great resource for creating React component libraries with rollup.](https://github.com/HarveyD/react-component-library)

[This repository represents recent work on Align (previously SDFUI).](https://github.com/NGimbal/sdfui) This work was originally presented at SIGGRAPH 2020 as a poster under the title "A CAD Interface for Drafting with Signed Distance Functions." That project is still hosted at [www.alignaec.com](www.alignaec.com).

The goal of the recent work was to integrate the project into a React component, increase its performance for large scenes, add undo / redo, and scene serialization + loading.

There are a lot of other features currently in progress including importing .DXF files.

## Principles for the project
- Decouple rendering and document state completely
- Don't rely on actions to update rendering state
- Enable cool stuff with shaders

## Features
- [x] Draw Polyline
- [x] Draw Filled Polygon
- [x] Draw Filled Circle
- [x] Draw Filled Ellipse
- [x] Cursor hit detection + selection
- [x] Select / deselect by click + drag "box" selection
- [x] Translate selected shapes with mouse click + drag
- [x] Snap to grid
- [x] Snap to points
- [x] Snap to relative angle (angle from last line)
- [x] Snap to global angle (15deg)
- [x] Configurable undo / redo (based on Redux state snapshots)
- [x] Show / hide grid
- [x] Screenshot
- [x] Screenshot underlying distance scene
- [x] Download .json scene
- [x] Baked shapes are rendered to textures, so they don't have to be raytraced every frame (pros and cons)
- [x] Zoom to fit, zoom to shape
- [x] Import json scene by drag + drop
## In Progress (aka broken)
- [ ] Import dxf by drag + drop
- [ ] Modify drawing properties after the shape has been "baked" to the scene

## Important missing features
- [ ] Text
## Tradeoffs
The most significant change between this version and the last, was implementing a mechanism whereby "baked" shapes are rendered to a texture. This has the benefit of reducing the amount of work WebGL has to do, but it also inhibits some of the effects that were initially motivating this project. Additionally, figuring out when to update the shaders, and making sure not to update too many glyphs at once is a challenge that remains unsolved.




