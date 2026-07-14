const DECISIONS = [
  { value: 'include', label: 'Include', shortcut: 'I' },
  { value: 'exclude', label: 'Exclude', shortcut: 'E' },
  { value: 'undecided', label: 'Undecided', shortcut: 'U' },
];

function DecisionControls({ currentDecision, onDecision }) {
  return (
    <div className="decision-controls" role="group" aria-label="Screening decision">
      {DECISIONS.map(({ value, label, shortcut }) => {
        const isActive = currentDecision === value;
        return (
          <button
            key={value}
            type="button"
            className={`decision-btn decision-btn--${value} ${isActive ? 'decision-btn--active' : ''}`}
            onClick={() => onDecision(value)}
            aria-pressed={isActive}
            aria-label={`${label} (shortcut: ${shortcut})`}
          >
            <span className="decision-btn__label">{label}</span>
            <span className="decision-btn__shortcut" aria-hidden="true">{shortcut}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DecisionControls;
