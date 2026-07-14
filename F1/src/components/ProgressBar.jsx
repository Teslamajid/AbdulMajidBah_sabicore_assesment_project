function ProgressBar({ currentIndex, total, decisions }) {
  const decidedCount = Object.values(decisions).filter(
    (d) => d === 'include' || d === 'exclude'
  ).length;
  const percent = total > 0 ? (decidedCount / total) * 100 : 0;

  return (
    <div className="progress" aria-label="Screening progress">
      <div className="progress__labels">
        <span className="progress__position">
          Study <strong>{currentIndex + 1}</strong> of <strong>{total}</strong>
        </span>
        <span className="progress__decided">
          <strong>{decidedCount}</strong> decided ({Math.round(percent)}%)
        </span>
      </div>
      <div
        className="progress__bar"
        role="progressbar"
        aria-valuenow={decidedCount}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="progress__bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
