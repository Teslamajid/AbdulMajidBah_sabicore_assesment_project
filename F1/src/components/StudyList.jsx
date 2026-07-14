import { useCallback, useEffect, useMemo, useState } from 'react';
import StudyCard from './StudyCard.jsx';
import DecisionControls from './DecisionControls.jsx';
import ProgressBar from './ProgressBar.jsx';

const STORAGE_KEY = 'sabi_decisions';

function loadDecisions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function StudyList({ studies }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState(loadDecisions);

  const currentStudy = studies[currentIndex];
  const total = studies.length;

  // Persist decisions on every change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  }, [decisions]);

  const handleDecision = useCallback(
    (decision) => {
      if (!currentStudy) return;
      setDecisions((prev) => ({ ...prev, [currentStudy.id]: decision }));
      // Auto-advance on decisive choices.
      if (decision === 'include' || decision === 'exclude') {
        setCurrentIndex((idx) => Math.min(idx + 1, total - 1));
      }
    },
    [currentStudy, total]
  );

  const goNext = useCallback(
    () => setCurrentIndex((idx) => Math.min(idx + 1, total - 1)),
    [total]
  );
  const goPrev = useCallback(
    () => setCurrentIndex((idx) => Math.max(idx - 1, 0)),
    []
  );

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event) => {
      // Ignore typing inside inputs, textareas, or contenteditable regions.
      const target = event.target;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isEditable) return;

      switch (event.key) {
        case 'i':
        case 'I':
          event.preventDefault();
          handleDecision('include');
          break;
        case 'e':
        case 'E':
          event.preventDefault();
          handleDecision('exclude');
          break;
        case 'u':
        case 'U':
          event.preventDefault();
          handleDecision('undecided');
          break;
        case 'ArrowRight':
          event.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goPrev();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDecision, goNext, goPrev]);

  const currentDecision = useMemo(
    () => (currentStudy ? decisions[currentStudy.id] : undefined),
    [decisions, currentStudy]
  );

  if (!currentStudy) {
    return (
      <div className="empty-state">
        <p>No studies to screen.</p>
      </div>
    );
  }

  return (
    <section className="study-list" aria-live="polite">
      <ProgressBar
        currentIndex={currentIndex}
        total={total}
        decisions={decisions}
      />
      <StudyCard study={currentStudy} />
      <DecisionControls
        currentDecision={currentDecision}
        onDecision={handleDecision}
      />
      <nav className="nav-controls" aria-label="Study navigation">
        <button
          type="button"
          className="nav-btn"
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Previous study (Left arrow)"
        >
          ← Previous
        </button>
        <button
          type="button"
          className="nav-btn"
          onClick={goNext}
          disabled={currentIndex === total - 1}
          aria-label="Next study (Right arrow)"
        >
          Next →
        </button>
      </nav>
    </section>
  );
}

export default StudyList;
