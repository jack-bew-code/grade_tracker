import React, { useState } from 'react';
import './App.css';

function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [courseName, setCourseName] = useState("My Degree Course");
  const [years, setYears] = useState([{
    year_number: 1,
    weight: 100,
    modules: []
  }]);
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  
  // Module form state
  const [moduleName, setModuleName] = useState("");
  const [moduleCredits, setModuleCredits] = useState(20);
  const [moduleComponents, setModuleComponents] = useState([]);
  
  // Component form state
  const [componentName, setComponentName] = useState("");
  const [componentWeight, setComponentWeight] = useState(0);
  
  const addComponentToModule = () => {
    if (!componentName || componentWeight <= 0) {
      alert("Please enter a component name and weight");
      return;
    }
    
    const totalWeight = moduleComponents.reduce((sum, c) => sum + c.weight, 0) + componentWeight;
    if (totalWeight > 100) {
      alert("Total component weights cannot exceed 100%");
      return;
    }
    
    setModuleComponents([...moduleComponents, {
      name: componentName,
      weight: parseFloat(componentWeight),
      grade: null
    }]);
    
    setComponentName("");
    setComponentWeight(0);
  };
  
  const removeComponent = (index) => {
    setModuleComponents(moduleComponents.filter((_, i) => i !== index));
  };
  
  const addModule = () => {
    if (!moduleName) {
      alert("Please enter a module name");
      return;
    }
    
    if (moduleComponents.length === 0) {
      alert("Please add at least one component to this module");
      return;
    }
    
    const totalWeight = moduleComponents.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight !== 100) {
      alert(`Component weights must sum to 100% (currently ${totalWeight}%)`);
      return;
    }
    
    const newModule = {
      module_name: moduleName,
      credits: parseInt(moduleCredits),
      components: moduleComponents
    };
    
    const updatedYears = [...years];
    updatedYears[currentYearIndex].modules.push(newModule);
    setYears(updatedYears);
    
    // Reset form
    setModuleName("");
    setModuleCredits(20);
    setModuleComponents([]);
  };
  
  const removeModule = (moduleIndex) => {
    const updatedYears = [...years];
    updatedYears[currentYearIndex].modules = updatedYears[currentYearIndex].modules.filter((_, i) => i !== moduleIndex);
    setYears(updatedYears);
  };
  
  const saveCourse = async () => {
    if (years[currentYearIndex].modules.length === 0) {
      alert("Please add at least one module before saving");
      return;
    }
    
    const courseData = {
      name: courseName,
      years: years
    };
    
    try {
      const response = await fetch("http://localhost:8000/course/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(courseData),
      });
      
      if (response.ok) {
        alert("Course setup complete!");
        onComplete();
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      alert(`Connection error: ${error.message}`);
    }
  };
  
  return (
    <div className="setup-wizard">
      <h1>Course Setup Wizard</h1>
      
      {step === 1 && (
        <div className="wizard-step">
          <h2>Step 1: Course Details</h2>
          <div className="card">
            <label>Course Name:</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g., Computer Science Degree"
            />
            
            <div className="info-box">
              <p>📚 Starting with Year 1 (100% weight)</p>
              <p>You can add more years and adjust weights in Settings later</p>
            </div>
            
            <button onClick={() => setStep(2)} className="btn-primary">
              Next: Add Modules
            </button>
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div className="wizard-step">
          <h2>Step 2: Add Modules to Year {years[currentYearIndex].year_number}</h2>
          
          <div className="card">
            <h3>Current Modules ({years[currentYearIndex].modules.length})</h3>
            {years[currentYearIndex].modules.length === 0 ? (
              <p className="text-muted">No modules added yet</p>
            ) : (
              <ul className="module-list">
                {years[currentYearIndex].modules.map((mod, idx) => (
                  <li key={idx}>
                    <strong>{mod.module_name}</strong> ({mod.credits} credits)
                    <br />
                    <small>Components: {mod.components.map(c => `${c.name} (${c.weight}%)`).join(', ')}</small>
                    <button onClick={() => removeModule(idx)} className="btn-small btn-danger">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="card">
            <h3>Add New Module</h3>
            <input
              type="text"
              placeholder="Module Name (e.g., Data Structures)"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
            />
            
            <div className="input-group">
              <label>Credits:</label>
              <input
                type="number"
                value={moduleCredits}
                onChange={(e) => setModuleCredits(e.target.value)}
                min="1"
              />
            </div>
            
            <h4>Module Components</h4>
            <div className="component-form">
              <input
                type="text"
                placeholder="Component name (e.g., Midterm, Final Exam)"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Weight %"
                value={componentWeight || ''}
                onChange={(e) => setComponentWeight(parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
              />
              <button onClick={addComponentToModule} className="btn-small">Add Component</button>
            </div>
            
            {moduleComponents.length > 0 && (
              <div className="component-list">
                <p>Total: {moduleComponents.reduce((sum, c) => sum + c.weight, 0)}% / 100%</p>
                <ul>
                  {moduleComponents.map((comp, idx) => (
                    <li key={idx}>
                      {comp.name}: {comp.weight}%
                      <button onClick={() => removeComponent(idx)} className="btn-small">×</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button onClick={addModule} className="btn-secondary">
              Add This Module
            </button>
          </div>
          
          <div className="wizard-actions">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button
              onClick={saveCourse}
              className="btn-primary"
              disabled={years[currentYearIndex].modules.length === 0}
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SetupWizard;
