import { Filter } from "lucide-react";
import { GRADES, BRANCHES } from "../data/platformData";

export default function GradeFilter({
  value,
  onChange,
  options = GRADES.map((grade) => ({ value: grade.name, label: grade.shortName || grade.name })),
  label = "الصف الدراسي",
  includeAll = false,
  allValue = BRANCHES[0],
  allLabel = "كل الصفوف",
  disabled = false,
  showLabel = true,
}) {
  const choices = includeAll
    ? [{ value: allValue, label: allLabel }, ...options]
    : options;

  return (
    <div className="grade-filter" role="group" aria-label={label}>
      {showLabel && <span className="grade-filter-label">
        <Filter size={15} aria-hidden="true" />
        {label}
      </span>}
      <div className="grade-filter-options">
        {choices.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              className={`grade-filter-option${selected ? " is-active" : ""}`}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
