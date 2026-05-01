# Chain Boundaries

| Chain | Layers / Entries | Must Not Mix With |
| --- | --- | --- |
| implementation chain | `surface -> authoring kernel -> field-kernel -> runtime core` | verification protocol、host-only projection |
| governance chain | `runtime control plane` | authoring surface、host projection |
| host projection chain | `RuntimeProvider / imports scope / root escape hatch / local-session-suspend variants` | verification subtree、second runtime truth source |
