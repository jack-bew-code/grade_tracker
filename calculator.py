from typing import List
from models import Module, Year

def calculate_module_grade(module: Module) -> float:
    total_score = 0.0
    weight_accounted_for = 0.0

    for comp in module.components:
        if comp.grade is not None:

            grade = float(comp.grade)
            weight = float(comp.weight)
            print(f"Grade: {grade} Weight {weight}")
            print(f"Total score {total_score}")
            
            total_score += (grade*(weight/100))
            print(f"Total score: {total_score}")
            weight_accounted_for += weight
            print(f"DEBUG: Module Grade Calc: {total_score}")
            pass
    
    if weight_accounted_for == 0:
        return 0.0
    
    return (total_score / weight_accounted_for) * 100

def calculate_year_grade(year: Year) -> float:
    score = 0.0
    credit_sum = 0.0

    for module in year.modules:
        module_grade = calculate_module_grade(module)
        score += (module_grade * module.credits)
        credit_sum += module.credits
        print(f"DEBUG: Year Score: {score} / Credits: {credit_sum}")

    if credit_sum ==0:
        return 0.0
    
    return score/credit_sum

def calculate_degree_total(years: List[Year]) -> float:
    total_weighted_score = 0.0
    total_weighted_accounted_for = 0.0

    for year in years:
        year_grade = calculate_year_grade(year)
        total_weighted_score += (year_grade * year.weight)
        total_weighted_accounted_for += year.weight
        print(f"DEBUG: Final Weighted: {total_weighted_score}")

    if total_weighted_accounted_for ==0:
        return 0.0
    
    return total_weighted_score/total_weighted_accounted_for
    


#-----------------------TESTING CODE ONLY----------------------------
if __name__ == "__main__":
    from models import Component, Module, Year

    # --- YEAR 1 DATA ---
    # Module 1: 15 Credits
    m1_comp1 = Component(name="Exam", weight=100.0, grade=70.0)
    module1 = Module(module_name="Data Structures", credits=15, components=[m1_comp1])

    # Module 2: 15 Credits
    m2_comp1 = Component(name="Project", weight=100.0, grade=90.0)
    module2 = Module(module_name="Web Tech", credits=15, components=[m2_comp1])

    year1 = Year(year_number=1, weight=10.0, modules=[module1, module2])
    
    
    # --- YEAR 2 DATA ---
    # Module 1: 30 Credits
    m1_comp1 = Component(name="Exam", weight=100.0, grade=60.0)
    module1 = Module(module_name="Data Structures", credits=30, components=[m1_comp1])

    # Module 2: 30 Credits
    m2_comp1 = Component(name="Project", weight=100.0, grade=50.0)
    module2 = Module(module_name="Web Tech", credits=30, components=[m2_comp1])

    year2 = Year(year_number=2, weight=30.0, modules=[module1, module2])

    # --- YEAR 3 DATA ---
    # Module 3: 60 Credits (Dissertation!)
    m3_comp1 = Component(name="Thesis", weight=100.0, grade=80.0)
    module3 = Module(module_name="Dissertation", credits=60, components=[m3_comp1])

    year3 = Year(year_number=3, weight=60.0, modules=[module3])

    # --- FINAL CALCULATION ---
    all_years = [year1, year2, year3]
    final_grade = calculate_degree_total(all_years)

    print(f"Year 1 Average: {calculate_year_grade(year1)}%")
    print(f"Year 2 Average: {calculate_year_grade(year2)}%")
    print(f"Year 3 Average: {calculate_year_grade(year3)}%")
    print(f"--- FINAL DEGREE TOTAL: {final_grade}% ---")