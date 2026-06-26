"""Simulator registry for discovering and instantiating simulation modules.

Provides a central registry where simulation modules self-register via
the @SimulatorRegistry.register decorator. The registry supports lazy
auto-import of all modules and lookup by simulation_type key.
"""

import logging
from typing import Any

from app.simulation.base import BaseSimulator

logger = logging.getLogger(__name__)


class SimulatorRegistry:
    """Central registry mapping simulation_type strings to simulator classes.

    Usage:
        @SimulatorRegistry.register
        class MySimulator(BaseSimulator):
            simulation_type = "my_sim"
            ...

        simulator = SimulatorRegistry.get("my_sim")
    """

    _registry: dict[str, type] = {}
    _initialized: bool = False

    @classmethod
    def register(cls, simulator_class: type) -> type:
        """Register a simulator class in the registry.

        Intended to be used as a class decorator. The simulator_class must
        define a `simulation_type` class attribute.

        Args:
            simulator_class: The simulator class to register.

        Returns:
            The original class, unmodified (pass-through decorator).
        """
        sim_type = getattr(simulator_class, "simulation_type", None)
        if not sim_type:
            raise ValueError(
                f"Simulator class {simulator_class.__name__} must define "
                f"a 'simulation_type' class attribute."
            )

        if sim_type in cls._registry:
            logger.warning(
                "Overwriting existing registration for simulation_type='%s' "
                "(%s -> %s)",
                sim_type,
                cls._registry[sim_type].__name__,
                simulator_class.__name__,
            )

        cls._registry[sim_type] = simulator_class
        logger.info(
            "Registered simulator: %s (type='%s')",
            simulator_class.__name__,
            sim_type,
        )
        return simulator_class

    @classmethod
    def _auto_import(cls) -> None:
        """Lazily import all simulation modules to trigger registration.

        This is called automatically before any lookup to ensure all
        modules have been imported and their @register decorators executed.
        """
        if not cls._initialized:
            try:
                import app.simulation.modules  # noqa: F401
                cls._initialized = True
                logger.info(
                    "Auto-imported simulation modules. "
                    "Registry contains %d simulator(s).",
                    len(cls._registry),
                )
            except ImportError as exc:
                logger.error("Failed to auto-import simulation modules: %s", exc)
                raise

    @classmethod
    def get(cls, simulation_type: str) -> BaseSimulator:
        """Look up and instantiate a simulator by its type key.

        Args:
            simulation_type: The unique type identifier (e.g. 'flood').

        Returns:
            An instantiated BaseSimulator subclass.

        Raises:
            ValueError: If no simulator is registered for the given type.
        """
        cls._auto_import()

        simulator_class = cls._registry.get(simulation_type)
        if simulator_class is None:
            available = ", ".join(sorted(cls._registry.keys())) or "(none)"
            raise ValueError(
                f"No simulator registered for type '{simulation_type}'. "
                f"Available types: {available}"
            )

        return simulator_class()

    @classmethod
    def list_all(cls) -> list[dict[str, Any]]:
        """Return metadata for all registered simulators.

        Returns:
            List of dicts with keys: type, name, description, parameter_schema.
        """
        cls._auto_import()

        result = []
        for sim_type, sim_class in sorted(cls._registry.items()):
            instance = sim_class()
            result.append({
                "type": sim_type,
                "name": instance.name,
                "description": instance.description,
                "parameter_schema": instance.parameter_schema,
            })
        return result
