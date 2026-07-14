import { memo } from 'react';

function StudyCard({ study }) {
  if (!study) return null;

  return (
    <article className="study-card" aria-labelledby={`title-${study.id}`}>
      <header className="study-card__header">
        <h2 id={`title-${study.id}`} className="study-card__title">
          {study.title}
        </h2>
        <p className="study-card__meta">
          <span className="study-card__authors">{study.authors.join(', ')}</span>
          <span className="study-card__separator">•</span>
          <span className="study-card__year">{study.year}</span>
        </p>
      </header>
      <div className="study-card__abstract">
        <h3 className="study-card__section-heading">Abstract</h3>
        <p>{study.abstract}</p>
      </div>
    </article>
  );
}

export default memo(StudyCard);
