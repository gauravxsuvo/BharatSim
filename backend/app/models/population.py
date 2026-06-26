"""Population data model.

Stores census and demographic statistics for each district by year,
including total population, gender breakdown, urbanisation, literacy,
and growth rates.
"""

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class PopulationData(Base):
    """Demographic and census data for a district in a given year.

    Attributes:
        id: Primary key.
        district_id: Foreign key to the districts table.
        year: Census or survey year.
        total_population: Total population count.
        male_population: Male population count.
        female_population: Female population count.
        density_per_sq_km: Population density per square kilometer.
        urban_population: Urban population count.
        rural_population: Rural population count.
        literacy_rate: Literacy rate as a percentage (0–100).
        sex_ratio: Number of females per 1000 males.
        growth_rate: Decadal growth rate as a percentage.
        created_at: Timestamp of record creation.
    """

    __tablename__ = "population_data"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(
        Integer,
        ForeignKey("districts.id"),
        nullable=False,
        index=True,
    )
    year = Column(Integer, nullable=False, comment="Census or survey year")
    total_population = Column(Integer, comment="Total population")
    male_population = Column(Integer, comment="Male population")
    female_population = Column(Integer, comment="Female population")
    density_per_sq_km = Column(
        Float, comment="Population density per sq km"
    )
    urban_population = Column(Integer, comment="Urban population")
    rural_population = Column(Integer, comment="Rural population")
    literacy_rate = Column(Float, comment="Literacy rate percentage")
    sex_ratio = Column(Float, comment="Females per 1000 males")
    growth_rate = Column(Float, comment="Decadal growth rate percentage")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    district = relationship("District", back_populates="population_data")

    __table_args__ = (
        Index(
            "idx_population_district_year",
            "district_id",
            "year",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<PopulationData(id={self.id}, district_id={self.district_id}, "
            f"year={self.year}, population={self.total_population})>"
        )
