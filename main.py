from fastapi import FastAPI, HTTPException
from calculator import calculate_degree_total, calculate_year_grade, calculate_module_grade
from models import Course, Year, Module, Component
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Session, create_engine, select
from datetime import datetime

sqlite_url = "sqlite:///grades.db"
engine = create_engine(sqlite_url)
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)


# === COURSE SETUP ENDPOINTS ===

@app.post("/course/setup")
def setup_course(course_data: dict):
    """Create or update the course structure with years, modules, and components"""
    with Session(engine) as session:
        # Checks if there's an existing active course
        statement = select(Course).where(Course.is_archived == False)
        existing_course = session.exec(statement).first()
        
        if existing_course:
            # Update existing course
            course = existing_course
            course.name = course_data.get("name", course.name)
            course.updated_at = datetime.utcnow()
            
            # Deletes existing years (cascade will handle modules/components)
            for year in course.years:
                session.delete(year)
        else:
            # Create new course
            course = Course(name=course_data.get("name", "My Course"))
            session.add(course)
        
        # Build the course structure
        for year_data in course_data.get("years", []):
            modules_raw = year_data.pop("modules", [])
            current_year = Year(**year_data, course_id=course.id)
            
            for module_data in modules_raw:
                components_raw = module_data.pop("components", [])
                current_module = Module(**module_data)
                
                for component_data in components_raw:
                    current_component = Component(**component_data)
                    current_module.components.append(current_component)
                
                current_year.modules.append(current_module)
            
            course.years.append(current_year)
        
        session.add(course)
        session.commit()
        session.refresh(course)
        
        return {"message": "Course setup successful", "course_id": course.id}


@app.get("/course/current")
def get_current_course():
    """Retrieve the active (non-archived) course with all nested data"""
    with Session(engine) as session:
        statement = select(Course).where(Course.is_archived == False)
        course = session.exec(statement).first()
        
        if not course:
            return None
        
        # Build complete course structure with calculations
        course_data = {
            "id": course.id,
            "name": course.name,
            "created_at": course.created_at.isoformat() if course.created_at else None,
            "years": []
        }
        
        total_components = 0
        completed_components = 0
        
        for year in course.years:
            year_data = {
                "id": year.id,
                "year_number": year.year_number,
                "weight": year.weight,
                "grade": None,
                "modules": []
            }
            
            for module in year.modules:
                module_data = {
                    "id": module.id,
                    "module_name": module.module_name,
                    "credits": module.credits,
                    "grade": None,
                    "components": []
                }
                
                for component in module.components:
                    total_components += 1
                    if component.grade is not None:
                        completed_components += 1
                    
                    module_data["components"].append({
                        "id": component.id,
                        "name": component.name,
                        "weight": component.weight,
                        "grade": component.grade
                    })
                
                # Calculate module grade if all components have grades
                if all(c.grade is not None for c in module.components):
                    module_data["grade"] = calculate_module_grade(module)
                
                year_data["modules"].append(module_data)
            
            # Calculate year grade if all modules have grades
            if all(all(c.grade is not None for c in m.components) for m in year.modules):
                year_data["grade"] = calculate_year_grade(year)
            
            course_data["years"].append(year_data)
        
        # Calculate overall grade if all years have complete grades
        if all(all(all(c.grade is not None for c in m.components) for m in y.modules) for y in course.years):
            course_data["total_percentage"] = round(calculate_degree_total(course.years), 2)
        else:
            course_data["total_percentage"] = None
        
        course_data["progress"] = {
            "completed": completed_components,
            "total": total_components,
            "percentage": round((completed_components / total_components * 100), 1) if total_components > 0 else 0
        }
        
        return course_data


@app.patch("/course/component/{component_id}")
def update_component_grade(component_id: int, grade_data: dict):
    """Update a single component's grade"""
    with Session(engine) as session:
        component = session.get(Component, component_id)
        
        if not component:
            raise HTTPException(status_code=404, detail="Component not found")
        
        grade = grade_data.get("grade")
        if grade is not None:
            if grade < 0 or grade > 100:
                raise HTTPException(status_code=400, detail="Grade must be between 0 and 100")
            component.grade = float(grade)
        else:
            component.grade = None
        
        session.add(component)
        session.commit()
        session.refresh(component)
        
        # Update course's updated_at timestamp
        statement = select(Course).where(Course.is_archived == False)
        course = session.exec(statement).first()
        if course:
            course.updated_at = datetime.utcnow()
            session.add(course)
            session.commit()
        
        return {
            "message": "Grade updated successfully",
            "component_id": component_id,
            "grade": component.grade
        }


@app.post("/course/reset-grades")
def reset_all_grades():
    """Set all component grades to None while keeping the course structure"""
    with Session(engine) as session:
        statement = select(Course).where(Course.is_archived == False)
        course = session.exec(statement).first()
        
        if not course:
            raise HTTPException(status_code=404, detail="No active course found")
        
        count = 0
        for year in course.years:
            for module in year.modules:
                for component in module.components:
                    component.grade = None
                    session.add(component)
                    count += 1
        
        course.updated_at = datetime.utcnow()
        session.add(course)
        session.commit()
        
        return {"message": f"Reset {count} component grades"}


@app.post("/course/archive")
def archive_course():
    """Archive the current course (soft delete)"""
    with Session(engine) as session:
        statement = select(Course).where(Course.is_archived == False)
        course = session.exec(statement).first()
        
        if not course:
            raise HTTPException(status_code=404, detail="No active course found")
        
        course.is_archived = True
        course.updated_at = datetime.utcnow()
        session.add(course)
        session.commit()
        
        return {"message": "Course archived successfully", "course_id": course.id}


@app.get("/course/archived")
def get_archived_courses():
    """Retrieve all archived courses"""
    with Session(engine) as session:
        statement = select(Course).where(Course.is_archived == True)
        archived_courses = session.exec(statement).all()
        
        return [
            {
                "id": c.id,
                "name": c.name,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None
            }
            for c in archived_courses
        ]