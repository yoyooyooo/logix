# Roadmap and Future Capability Capsules

## Roadmap Owns

```text
long-horizon evolution sequence
capability prerequisites and promotion gates
launch and coverage gates
future capability routes
links to owning execution and evidence artifacts
```

Roadmap does not own current object authority, step-by-step implementation, or copied tracker status.

## Preserve Route Value

Retain a Roadmap when it still constrains sequence, prevents unsafe early implementation, defines a falsifiable promotion gate, links current foundations to a future objective, or routes readers to active proof.

Lack of current implementation is not itself a reason to delete a durable route.

## Capability Capsule

Default home:

```text
docs/roadmap/future/<capability>/README.md
```

The exact internal shape is earned. A project with one or two future capabilities may keep them as flat files under `docs/roadmap/`; create `future/<capability>/` only when the capsule needs several co-located artifacts or an independent routing boundary.

Never duplicate authority-shaped subtrees such as:

```text
docs/roadmap/future/ssot
docs/roadmap/future/standards
docs/roadmap/future/adr
docs/roadmap/future/architecture
docs/roadmap/future/product
```

A future capability may discuss candidate authority and architecture inside one capsule without pretending those are current layers.

## Capsule Questions

A durable capsule should answer, directly or through equivalent sections:

```text
Product / system hypothesis
Candidate capability boundary
Reusable current foundations
Current non-authority
Candidate authority model
Candidate architecture
Prerequisites
Promotion gates
First falsifiable proof
Unsafe early implementations
Promotion targets
Sources and evidence
```

Use [the capsule template](../templates/future-capability-capsule.md) when the capability has earned a full capsule. A lightweight future route may answer fewer questions in one Roadmap file.

## Promotion

When evidence and adoption gates succeed:

```text
move accepted meaning to Product / SSoT / ADR / Architecture / Standards / Protocols
link the owning implementation/evidence artifact
remove promoted duplicate prose from the capsule
retain only the future delta and remaining gates
update indexes in the same change
```

Promotion changes authority; it does not prove completion unless the owning evidence does.
