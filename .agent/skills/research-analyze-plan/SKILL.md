---
name: research-analyze-plan
description: This skill should be used when the user asks for a comprehensive decision-making process involving external research, comparative analysis, and strategic planning. It formalizes the "Research -> Analyze -> Decide -> Plan" loop.
---

# Research-Analyze-Plan Skill

This skill guides the agent through a rigorous decision-making process, ensuring that architectural decisions are backed by external evidence and deep comparative analysis.

## When to Use

Use this skill when:
- The user asks to "research and decide" on a technology or pattern.
- The user requests a "competitive analysis" or "industry landscape" review.
- You need to validate an internal design against industry best practices.
- The user explicitly invokes the "Research, Analyze, Decide, Plan" workflow.

## The Workflow

### Phase 1: Research (The "Wide Net")

**Goal**: Gather unbiased external data.

1.  **Identify Keywords**: Extract core concepts from the user's request (e.g., "Ephemeral State", "Undo/Redo", "Transaction").
2.  **Multi-Source Search**:
    *   Leverage available search tools (specifically `tavily` or `exa` if available) to gather broad industry trends and comparative analysis.
    *   Use content fetching tools (e.g., `fetcher`) to retrieve specific documentation or deep-dive articles.
    *   *Tip*: Search for "alternatives to X", "X vs Y", "best practices for Z".
3.  **Capture Findings**: Record key features, pros, cons, and architectural philosophies of each candidate.

### Phase 2: Analyze (The "Deep Dive")

**Goal**: Contextualize findings against the current project.

1.  **Concept Mapping**: Map external concepts to internal terminology (e.g., "XState Actor" ~= "Logix Draft").
2.  **Gap Analysis**:
    *   **Inspiration**: What did they do right? (e.g., "Redux's Immer integration is great")
    *   **Deficiency**: What is missing or mismatched? (e.g., "Redux is too global", "XState is too manual")
3.  **Comparative Matrix**: Create a mental (or actual) table comparing features (Isolation, Lifecycle, Transaction, DX).

### Phase 3: Decide (The "Verdict")

**Goal**: Make a definitive choice.

1.  **Synthesize**: Combine internal requirements with external insights.
2.  **Justify**: Articulate *why* the chosen approach is superior for *this specific context*.
    *   *Template*: "While [Competitor] excels at [Feature A], we chose [Our Solution] because [Reason B] is critical for [Project Goal]."
3.  **Final Verdict**: State the decision clearly (e.g., "We will adopt the Draft Pattern").

### Phase 4: Plan (The "Output")

**Goal**: Document the decision.

1.  **Update Specs**: Write the analysis and decision into the relevant design document (e.g., `docs/specs/...`).
    *   Include an "Industry Landscape" section.
    *   Include a "Decision Matrix" or "Comparison Table".
2.  **Refine Design**: If research revealed a flaw in the original design, fix it now.
3.  **Notify User**: Present the findings and the final decision in a structured format.

## Example Output Structure

When presenting the result to the user, follow this structure:

```markdown
## Industry Landscape & Comparison

| Feature | Our Solution | Competitor A | Competitor B |
| :--- | :--- | :--- | :--- |
| Feature 1 | ✅ | ❌ | ⚠️ |

### vs Competitor A
*   **Concept**: ...
*   **Gap**: ...
*   **Our Advantage**: ...

### Final Verdict
We chose **Our Solution** because...
```
