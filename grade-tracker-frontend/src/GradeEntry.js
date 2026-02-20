import React, { useState, useEffect } from 'react';
import './App.css';

function GradeEntry({ courseData, onGradeUpdate }) {
  const [localGrades, setLocalGrades] = useState({});
  const [updatingComponents, setUpdatingComponents] = useState(new Set());

  useEffect(() => {
    // Initialize local grades from course data
    const grades = {};
    courseData.years.forEach(year => {
      year.modules.forEach(module => {
        module.components.forEach(component => {
          grades[component.id] = component.grade !== null ? component.grade : '';
        });
      });
    });
    setLocalGrades(grades);
  }, [courseData]);

  const handleGradeChange = (componentId, value) => {
    setLocalGrades({
      ...localGrades,
      [componentId]: value
    });
  };

  const handleGradeBlur = async (componentId) => {
    const grade = localGrades[componentId];
    
    // Convert empty string to null
    const gradeValue = grade === '' ? null : parseFloat(grade);
    
    // Validate grade
    if (gradeValue !== null && (gradeValue < 0 || gradeValue > 100)) {
      alert("Grade must be between 0 and 100");
      return;
    }

    setUpdatingComponents(new Set(updatingComponents).add(componentId));

    try {
      const response = await fetch(`http://localhost:8000/course/component/${componentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grade: gradeValue }),
      });

      if (response.ok) {
        // Trigger parent to reload course data
        onGradeUpdate();
      } else {
        const error = await response.text();
        alert(`Error updating grade: ${error}`);
      }
    } catch (error) {
      alert(`Connection error: ${error.message}`);
    } finally {
      const newUpdating = new Set(updatingComponents);
      newUpdating.delete(componentId);
      setUpdatingComponents(newUpdating);
    }
  };

  const getComponentStatus = (component) => {
    if (component.grade !== null && component.grade !== undefined) {
      return 'completed';
    }
    return 'pending';
  };

  const getModuleProgress = (module) => {
    const total = module.components.length;
    const completed = module.components.filter(c => c.grade !== null).length;
    return { completed, total, percentage: (completed / total * 100).toFixed(0) };
  };

  return (
    <div className="grade-entry">
      <div className="course-header">
        <h1>{courseData.name}</h1>
        <div className="progress-bar">
          <div className="progress-info">
            <span>Overall Progress: {courseData.progress.completed} / {courseData.progress.total} components</span>
            <span className="progress-percentage">{courseData.progress.percentage}%</span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ width: `${courseData.progress.percentage}%` }}
            ></div>
          </div>
        </div>
        
        {courseData.total_percentage !== null && (
          <div className="overall-grade">
            <h2>Overall Degree Grade: {courseData.total_percentage}%</h2>
          </div>
        )}
      </div>

      {courseData.years.map((year, yIdx) => (
        <div key={year.id} className="year-section">
          <div className="year-header">
            <h2>Year {year.year_number}</h2>
            <span className="year-weight">Weight: {year.weight}%</span>
            {year.grade !== null && (
              <span className="year-grade">Average: {year.grade.toFixed(1)}%</span>
            )}
          </div>

          {year.modules.map((module, mIdx) => {
            const progress = getModuleProgress(module);
            return (
              <div key={module.id} className="module-card">
                <div className="module-header">
                  <h3>{module.module_name}</h3>
                  <div className="module-info">
                    <span className="module-credits">{module.credits} credits</span>
                    <span className="module-progress">{progress.completed}/{progress.total} graded</span>
                    {module.grade !== null && (
                      <span className="module-grade">{module.grade.toFixed(1)}%</span>
                    )}
                  </div>
                </div>

                <div className="components-grid">
                  {module.components.map((component) => (
                    <div 
                      key={component.id} 
                      className={`component-item ${getComponentStatus(component)}`}
                    >
                      <div className="component-info">
                        <label>{component.name}</label>
                        <span className="component-weight">{component.weight}%</span>
                      </div>
                      <div className="component-input">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="Grade"
                          value={localGrades[component.id] || ''}
                          onChange={(e) => handleGradeChange(component.id, e.target.value)}
                          onBlur={() => handleGradeBlur(component.id)}
                          disabled={updatingComponents.has(component.id)}
                        />
                        <span className="input-suffix">%</span>
                      </div>
                      {updatingComponents.has(component.id) && (
                        <span className="updating">Saving...</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default GradeEntry;
