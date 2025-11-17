# Diagram Generation Style Guide: Architect Excalidraw

This guide documents the prompt engineering focused on creating "Architect-level" high-density, hand-drawn architecture diagrams suitable for high-quality technical documentation.

## Core Style Definition

**Style Name**: High-Density Architect Excalidraw
**Visual Identity**: Technical whiteboard sketch, precision engineering, "messy but organized", blueprint aesthetic.
**Key Elements**:

- **High Information Density**: Avoid over-simplified boxes. Show internals, code snippets, and specific API names.
- **Hand-Drawn Aesthetic**: Mimics Excalidraw/tldraw strokes. Black ink on white background.
- **Color Palette**: Minimalist. Primary black lines, whitespace, and strategic use of "Light Blue" fills for distinct components.
- **Text**: Small technical fonts, legible labels (e.g., "Fiber Root", "Effect.gen").

## Prompt Template

Use this template to generate consistent diagrams:

```text
Complex Excalidraw architecture diagram, horizontal 16:9, high information density.

Topic: '{TOPIC NAME}'

1. Node '{NODE A}': Internal details showing '{INTERNAL A1}', '{INTERNAL A2}'. Annotation: '{NOTE A}'.
2. Node '{NODE B}': Internal details showing '{INTERNAL B1}', '{INTERNAL B2}'.
3. Connection: '{NODE A}' -> '{NODE B}' via '{PROTOCOL/METHOD}'.

Visual details: Show '{SPECIFIC VISUAL ELEMENT}' (e.g., AST tree, Event Stream, Stack).
Style: Technical whiteboard sketch, detailed labels, code snippets in small font, architectural precision, hand-drawn black ink, light blue fills.
```

## Examples

### Example 1: The Runtime Trinity

> **Topic**: 'Runtime Trinity Deep Dive'
> **Prompt**: Complex Excalidraw architecture diagram, horizontal 16:9, high information density. Topic: 'Runtime Trinity Deep Dive'.
>
> 1. Left Node 'Module (Definition)': Internal boxes for 'State Schema', 'Actions Enum', 'Reducers (Pure)'. Annotation: 'Static Asset'.
> 2. Middle Node 'Logic (Program)': Internal flow showing 'Effect.gen', 'yield\* $', 'Flow Control'. Connected to an external 'Env/Context' cloud. Annotation: 'Portable IO'.
> 3. Right Node 'Live (Runtime)': Internal details showing 'Fiber Root', 'Scope', 'State Ref', 'Txn Queue'.
>    Arrows: Live 'compiles' Module + Logic into 'Executable Layer'. Logic 'projects' capabilities via BoundAPI ($).
>    Style: Technical whiteboard sketch, detailed labels, code snippets in small font, architectural precision, hand-drawn black ink, light blue fills.

### Example 2: Full-Duplex Architecture

> **Topic**: 'Full-Duplex Engine Internals'
> **Prompt**: Complex Excalidraw architecture diagram, horizontal 16:9, high information density. Topic: 'Full-Duplex Engine Internals'.
> Outer Ring: 'Source Code (TS)' <-> 'Parser/Builder' <-> 'Unified IR (Node/Edge/Loc)' <-> 'Codegen (AST Patch)'.
> Inner Core 'Runtime Bridge': 'DevTools' taking 'SlimOp Events' from Runtime and mapping them to 'IR Nodes'.
> Visual details: Show 'AST' tree structures, 'Graph' node network, 'Event Stream' timeline.
> Annotations: 'Single Source of Truth', 'Digital Twin', 'Bi-directional Sync'.
> Style: Engineering blueprint, hand-drawn, complex connections, technical labels.

## Keywords for Refinement

If the generation is too simple, add:

- "Architectural precision"
- "System sequence diagram mixed with block diagram"
- "Specific API names"
- "No generic abstract shapes"
