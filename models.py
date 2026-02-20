from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

# The course - top level container
class Course(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    is_archived: bool = Field(default=False)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    years: List["Year"] = Relationship(
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

# Each year
class Year(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    year_number: int
    weight: float
    
    # This 'staples' the year to its parent Course
    course_id: Optional[int] = Field(default=None, foreign_key="course.id")
    
    modules: List["Module"] = Relationship(
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

# The modules
class Module(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    module_name: str
    credits: int
    
    # This 'staples' the module to its parent Year
    year_id: Optional[int] = Field(default=None, foreign_key="year.id")
    
    components: List["Component"] = Relationship(
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

# The individual grades
class Component(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    weight: float
    grade: Optional[float] = None
    
    # This 'staples' the component to its parent Module
    module_id: Optional[int] = Field(default=None, foreign_key="module.id")