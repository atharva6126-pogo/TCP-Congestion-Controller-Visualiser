"""Architectural guardrail: the simulation engine must stay framework-free."""

import ast
import inspect

from tcp_visualizer.simulation import engine


def test_engine_module_imports_no_web_framework() -> None:
    tree = ast.parse(inspect.getsource(engine))

    imported_modules = {
        alias.name
        for node in ast.walk(tree)
        if isinstance(node, ast.Import)
        for alias in node.names
    } | {
        node.module
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and node.module is not None
    }

    forbidden_prefixes = ("fastapi", "starlette", "react")
    assert not any(
        module.startswith(prefix) for module in imported_modules for prefix in forbidden_prefixes
    )
