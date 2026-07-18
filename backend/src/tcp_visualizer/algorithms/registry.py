"""Construction of congestion control algorithms by name."""

from collections.abc import Callable, Mapping

from tcp_visualizer.algorithms.cubic import TcpCubic
from tcp_visualizer.algorithms.new_reno import TcpNewReno
from tcp_visualizer.algorithms.reno import TcpReno
from tcp_visualizer.algorithms.tahoe import TcpTahoe
from tcp_visualizer.domain import CongestionControlAlgorithm, DomainError

_FACTORIES: Mapping[str, Callable[[], CongestionControlAlgorithm]] = {
    "tahoe": TcpTahoe,
    "reno": TcpReno,
    "new_reno": TcpNewReno,
    "cubic": TcpCubic,
}

AVAILABLE_ALGORITHMS: tuple[str, ...] = tuple(_FACTORIES)


def create_algorithm(name: str) -> CongestionControlAlgorithm:
    """Build a fresh algorithm instance for ``name``.

    A new instance per call matters: algorithms carry mutable per-run
    state (congestion window, ssthresh, recovery markers).
    """
    factory = _FACTORIES.get(name)
    if factory is None:
        raise DomainError(f"Unknown algorithm: {name}")
    return factory()
