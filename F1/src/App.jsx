import StudyList from './components/StudyList.jsx';
import studies from './data/studies.json';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Sabi Core — Study Screener</h1>
        <p className="app__subtitle">
          Human-in-the-loop evidence screening. Decisions persist to
          localStorage.
        </p>
        <p className="app__hints">
          Keyboard: <kbd>I</kbd> include · <kbd>E</kbd> exclude ·{' '}
          <kbd>U</kbd> undecided · <kbd>←</kbd> / <kbd>→</kbd> navigate
        </p>
      </header>
      <main className="app__main">
        <StudyList studies={studies} />
      </main>
      <footer className="app__footer">
        <small>F1 — Sabi Core Take-Home Assessment</small>
      </footer>
    </div>
  );
}

export default App;
