"""Tests for the simulation endpoint."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from tcp_visualizer.main import app

client = TestClient(app)


def request_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "algorithm": "new_reno",
        "seed": 42,
        "bandwidth_bytes_per_second": 1_000_000,
        "latency_ms": 20,
        "loss_probability": 0.1,
        "total_bytes_to_transfer": 20_000,
        "maximum_segment_size_bytes": 1000,
    }
    body.update(overrides)
    return body


class TestSuccessfulRun:
    def test_returns_timeline_and_statistics(self) -> None:
        response = client.post("/simulations", json=request_body())

        assert response.status_code == 200
        payload = response.json()
        assert payload["algorithm"] == "new_reno"
        assert payload["seed"] == 42
        assert payload["duration_seconds"] > 0
        assert len(payload["events"]) > 0
        assert set(payload["statistics"]) == {
            "throughput_bytes_per_second",
            "packet_delivery_ratio",
            "retransmission_count",
            "average_rtt_seconds",
            "packet_loss_count",
        }

    def test_events_are_ordered_and_carry_their_signals(self) -> None:
        payload = client.post("/simulations", json=request_body()).json()

        timestamps = [event["timestamp"] for event in payload["events"]]
        assert timestamps == sorted(timestamps)

        acks = [e for e in payload["events"] if e["event_type"] == "packet_acknowledged"]
        assert len(acks) > 0
        for ack in acks:
            assert ack["signal"]["kind"] == "ack_received"
            assert ack["signal"]["ack_sequence_number"] is not None
            assert ack["packet"]["size_bytes"] > 0

    def test_window_change_events_report_the_phase(self) -> None:
        payload = client.post("/simulations", json=request_body()).json()

        changes = [e for e in payload["events"] if e["event_type"] == "congestion_window_changed"]
        assert len(changes) > 0
        for change in changes:
            assert change["congestion_window_segments"] is not None
            assert change["phase"] in {"slow_start", "congestion_avoidance", "fast_recovery"}

    def test_lossy_run_reports_both_loss_signal_kinds_faithfully(self) -> None:
        payload = client.post(
            "/simulations", json=request_body(loss_probability=0.3, total_bytes_to_transfer=50_000)
        ).json()

        losses = [e for e in payload["events"] if e["event_type"] == "packet_lost"]
        assert len(losses) > 0
        for loss in losses:
            assert loss["signal"]["kind"] in {"triple_duplicate_ack", "timeout"}
            assert loss["signal"]["highest_transmitted_sequence_number"] is not None
        assert payload["statistics"]["packet_loss_count"] == len(losses)

    def test_same_request_produces_an_identical_timeline(self) -> None:
        first = client.post("/simulations", json=request_body()).json()
        second = client.post("/simulations", json=request_body()).json()

        assert first == second

    def test_different_seeds_produce_different_timelines(self) -> None:
        first = client.post("/simulations", json=request_body(seed=1)).json()
        second = client.post("/simulations", json=request_body(seed=2)).json()

        assert first["events"] != second["events"]

    @pytest.mark.parametrize("algorithm", ["tahoe", "reno", "new_reno", "cubic"])
    def test_every_algorithm_runs(self, algorithm: str) -> None:
        response = client.post("/simulations", json=request_body(algorithm=algorithm))

        assert response.status_code == 200
        assert response.json()["algorithm"] == algorithm

    def test_a_clean_link_delivers_the_whole_transfer_without_loss(self) -> None:
        payload = client.post(
            "/simulations", json=request_body(loss_probability=0.0, total_bytes_to_transfer=10_000)
        ).json()

        assert payload["statistics"]["packet_delivery_ratio"] == 1.0
        assert payload["statistics"]["packet_loss_count"] == 0
        assert payload["statistics"]["retransmission_count"] == 0


class TestValidation:
    @pytest.mark.parametrize(
        "overrides",
        [
            {"algorithm": "bbr"},
            {"seed": -1},
            {"loss_probability": 1.0},
            {"loss_probability": -0.1},
            {"total_bytes_to_transfer": 0},
            {"total_bytes_to_transfer": 10_000_000},
            {"maximum_segment_size_bytes": 10},
            {"latency_ms": -1},
            {"bandwidth_bytes_per_second": 0},
        ],
    )
    def test_rejects_out_of_range_configuration(self, overrides: dict[str, Any]) -> None:
        response = client.post("/simulations", json=request_body(**overrides))

        assert response.status_code == 422

    def test_rejects_a_missing_field(self) -> None:
        body = request_body()
        del body["seed"]

        assert client.post("/simulations", json=body).status_code == 422
