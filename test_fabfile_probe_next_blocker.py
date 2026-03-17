import subprocess
import unittest
from unittest import mock

import fabfile


def _make_report(gate_class: str | None) -> str:
    budget = {
        'id': 'full/off<=1.25',
        'type': 'relative',
        'metric': 'timePerIngestMs',
        'maxRatio': 1.25,
        'numeratorRef': 'diagnosticsLevel=full',
        'denominatorRef': 'diagnosticsLevel=off',
    }
    if gate_class is not None:
        budget['gateClass'] = gate_class
        budget['costClass'] = 'devtools_projection'

    payload = {
        'schemaVersion': 1,
        'meta': {'createdAt': '2026-03-22T00:00:00.000Z'},
        'suites': [
            {
                'id': 'externalStore.ingest.tickNotify',
                'thresholds': [
                    {
                        'budget': budget,
                        'where': {'diagnosticsLevel': 'full'},
                        'maxLevel': 512,
                        'firstFailLevel': 128,
                    }
                ],
            }
        ],
    }
    return f"{fabfile.LOGIX_PERF_REPORT_PREFIX}{fabfile.json.dumps(payload)}\n"


class ProbeNextBlockerSoftGateTests(unittest.TestCase):
    def test_collect_suite_threshold_anomalies_preserves_gate_metadata(self) -> None:
        anomalies = fabfile._collect_suite_threshold_anomalies(
            [
                {
                    'suites': [
                        {
                            'id': 'externalStore.ingest.tickNotify',
                            'thresholds': [
                                {
                                    'budget': {
                                        'id': 'full/off<=1.25',
                                        'gateClass': 'soft',
                                        'costClass': 'devtools_projection',
                                    },
                                    'firstFailLevel': 128,
                                    'maxLevel': 512,
                                }
                            ],
                        }
                    ]
                }
            ],
            'externalStore.ingest.tickNotify',
        )

        self.assertEqual(anomalies[0]['gate_class'], 'soft')
        self.assertEqual(anomalies[0]['cost_class'], 'devtools_projection')

    def test_run_probe_target_soft_threshold_does_not_block(self) -> None:
        target = fabfile.BrowserProbeTarget(
            order=1,
            suite_id='externalStore.ingest.tickNotify',
            gate='残余复核门',
            command='pnpm fake',
        )
        result = subprocess.CompletedProcess(
            args=['pnpm', 'fake'],
            returncode=0,
            stdout=_make_report('soft'),
            stderr='',
        )

        with mock.patch('fabfile.subprocess.run', return_value=result):
            run = fabfile._run_probe_target(target, tail_lines=20)

        self.assertEqual(run.status, 'passed')
        self.assertIsNone(run.failure_kind)
        self.assertEqual(run.returncode, 0)
        self.assertEqual(run.threshold_anomaly_count, 1)

    def test_run_probe_target_hard_threshold_still_blocks(self) -> None:
        target = fabfile.BrowserProbeTarget(
            order=1,
            suite_id='externalStore.ingest.tickNotify',
            gate='残余复核门',
            command='pnpm fake',
        )
        result = subprocess.CompletedProcess(
            args=['pnpm', 'fake'],
            returncode=0,
            stdout=_make_report('hard'),
            stderr='',
        )

        with mock.patch('fabfile.subprocess.run', return_value=result):
            run = fabfile._run_probe_target(target, tail_lines=20)

        self.assertEqual(run.status, 'failed')
        self.assertEqual(run.failure_kind, 'threshold')
        self.assertEqual(run.returncode, fabfile.PROBE_THRESHOLD_FAILURE_RETURN_CODE)


if __name__ == '__main__':
    unittest.main()
