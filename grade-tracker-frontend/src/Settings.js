import React, { useState, useEffect } from 'react';
import './App.css';

function Settings({ courseData, onCourseUpdate, onCourseArchived }) {
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYearNumber, setNewYearNumber] = useState(2);
  const [newYearWeight, setNewYearWeight] = useState(0);
  const [yearWeights, setYearWeights] = useState({});
  const [archivedCourses, setArchivedCourses] = useState([]);

  useEffect(() => {
    // Initialize year weights from course data
    const weights = {};
    courseData.years.forEach(year => {
      weights[year.id] = year.weight;
    });
    setYearWeights(weights);

    // Find highest year number
    if (courseData.years.length > 0) {
      const maxYear = Math.max(...courseData.years.map(y => y.year_number));
      setNewYearNumber(maxYear + 1);
    }

    // Load archived courses
    loadArchivedCourses();
  }, [courseData]);

  const loadArchivedCourses = async () => {
    try {
      const response = await fetch("http://localhost:8000/course/archived");
      if (response.ok) {
        const data = await response.json();
        setArchivedCourses(data);
      }
    } catch (error) {
      console.error("Error loading archived courses:", error);
    }
  };

  const handleResetGrades = async () => {
    if (!window.confirm("Are you sure you want to clear all grades? This cannot be undone. Your course structure will be preserved.")) {
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/course/reset-grades", {
        method: "POST",
      });

      if (response.ok) {
        alert("All grades have been cleared");
        onCourseUpdate();
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      alert(`Connection error: ${error.message}`);
    }
  };

  const handleArchiveCourse = async () => {
    if (!window.confirm(`Are you sure you want to archive "${courseData.name}"? You can start a new course afterward. The archived course will be saved.`)) {
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/course/archive", {
        method: "POST",
      });

      if (response.ok) {
        alert("Course archived successfully. You can now create a new course.");
        onCourseArchived();
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      alert(`Connection error: ${error.message}`);
    }
  };

  const handleAddYear = () => {
    setShowAddYear(true);
  };

  const saveNewYear = async () => {
    const totalWeight = Object.values(yearWeights).reduce((sum, w) => sum + w, 0) + newYearWeight;
    
    if (totalWeight !== 100) {
      alert(`Year weights must sum to 100% (currently ${totalWeight}%)`);
      return;
    }

    // Reconstruct course data with new year
    const updatedCourseData = {
      name: courseData.name,
      years: [
        ...courseData.years.map(year => ({
          year_number: year.year_number,
          weight: yearWeights[year.id],
          modules: year.modules.map(module => ({
            module_name: module.module_name,
            credits: module.credits,
            components: module.components.map(component => ({
              name: component.name,
              weight: component.weight,
              grade: component.grade
            }))
          }))
        })),
        {
          year_number: newYearNumber,
          weight: newYearWeight,
          modules: []
        }
      ]
    };

    try {
      const response = await fetch("http://localhost:8000/course/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedCourseData),
      });

      if (response.ok) {
        alert(`Year ${newYearNumber} added successfully! You can now add modules to it.`);
        setShowAddYear(false);
        onCourseUpdate();
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      alert(`Connection error: ${error.message}`);
    }
  };

  const handleWeightChange = (yearId, newWeight) => {
    setYearWeights({
      ...yearWeights,
      [yearId]: parseFloat(newWeight) || 0
    });
  };

  const saveWeights = async () => {
    const totalWeight = Object.values(yearWeights).reduce((sum, w) => sum + w, 0);
    
    if (totalWeight !== 100) {
      alert(`Year weights must sum to 100% (currently ${totalWeight}%)`);
      return;
    }

    // Reconstruct course data with updated weights
    const updatedCourseData = {
      name: courseData.name,
      years: courseData.years.map(year => ({
        year_number: year.year_number,
        weight: yearWeights[year.id],
        modules: year.modules.map(module => ({
          module_name: module.module_name,
          credits: module.credits,
          components: module.components.map(component => ({
            name: component.name,
            weight: component.weight,
            grade: component.grade
          }))
        }))
      }))
    };

    try {
      const response = await fetch("http://localhost:8000/course/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedCourseData),
      });

      if (response.ok) {
        alert("Year weights updated successfully!");
        onCourseUpdate();
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      alert(`Connection error: ${error.message}`);
    }
  };

  const totalWeight = Object.values(yearWeights).reduce((sum, w) => sum + w, 0);

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Year Configuration</h2>
        <div className="card">
          <h3>Current Years</h3>
          {courseData.years.map(year => (
            <div key={year.id} className="year-weight-item">
              <span>Year {year.year_number}</span>
              <div className="input-group">
                <label>Weight:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={yearWeights[year.id] || 0}
                  onChange={(e) => handleWeightChange(year.id, e.target.value)}
                />
                <span>%</span>
              </div>
            </div>
          ))}
          
          <div className="weight-total">
            Total: {totalWeight}% / 100%
          </div>
          
          {totalWeight !== Object.values(yearWeights).reduce((sum, w) => sum + courseData.years.find(y => y.id === parseInt(Object.keys(yearWeights).find(k => yearWeights[k] === w)))?.weight || 0, 0) && (
            <button onClick={saveWeights} className="btn-primary">
              Save Weight Changes
            </button>
          )}
          
          {!showAddYear && (
            <button onClick={handleAddYear} className="btn-secondary">
              + Add Another Year
            </button>
          )}
          
          {showAddYear && (
            <div className="add-year-form">
              <h4>Add Year {newYearNumber}</h4>
              <div className="input-group">
                <label>Weight (%):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newYearWeight}
                  onChange={(e) => setNewYearWeight(parseFloat(e.target.value) || 0)}
                />
              </div>
              <p className="text-muted">
                Note: You'll need to adjust existing year weights so the total equals 100%
              </p>
              <div className="button-group">
                <button onClick={saveNewYear} className="btn-primary">
                  Add Year
                </button>
                <button onClick={() => setShowAddYear(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2>Data Management</h2>
        <div className="card">
          <div className="setting-item">
            <div>
              <h3>Clear All Grades</h3>
              <p>Reset all component grades to empty while keeping your course structure</p>
            </div>
            <button onClick={handleResetGrades} className="btn-warning">
              Clear Grades
            </button>
          </div>
          
          <div className="setting-item">
            <div>
              <h3>Archive & Start New Course</h3>
              <p>Save current course to archives and create a new course setup</p>
            </div>
            <button onClick={handleArchiveCourse} className="btn-danger">
              Archive Course
            </button>
          </div>
        </div>
      </div>

      {archivedCourses.length > 0 && (
        <div className="settings-section">
          <h2>Archived Courses</h2>
          <div className="card">
            <ul className="archived-list">
              {archivedCourses.map(course => (
                <li key={course.id}>
                  <strong>{course.name}</strong>
                  <br />
                  <small>
                    Created: {new Date(course.created_at).toLocaleDateString()}
                    {' | '}
                    Last updated: {new Date(course.updated_at).toLocaleDateString()}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
