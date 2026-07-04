import { useState } from 'react';

const MOODS = [
  { key: 'happy',   emoji: '😊', label: 'Happy'   },
  { key: 'excited', emoji: '🤩', label: 'Excited' },
  { key: 'neutral', emoji: '😐', label: 'Neutral' },
  { key: 'sad',     emoji: '😢', label: 'Sad'     },
  { key: 'angry',   emoji: '😡', label: 'Angry'   },
];

function EntryModal({ entry, onSave, onClose }) {
  const isEdit = Boolean(entry);

  const [form, setForm] = useState({
    title:   entry?.title   || '',
    content: entry?.content || '',
    mood:    entry?.mood    || 'neutral',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleMood = (key) => {
    setForm({ ...form, mood: key });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Please enter a title for your entry.');
      return;
    }
    if (!form.content.trim()) {
      setError('Please write something in your entry.');
      return;
    }

    setLoading(true);
    try {
      const res = await onSave({
        title:   form.title.trim(),
        content: form.content.trim(),
        mood:    form.mood,
      });

      if (res && !res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save entry.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {isEdit ? '✏️ Edit Entry' : '📝 New Diary Entry'}
          </h2>
          <button
            id="modal-close-btn"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="entry-title">Title</label>
            <input
              id="entry-title"
              className="form-input"
              type="text"
              name="title"
              placeholder="Give your entry a title…"
              value={form.title}
              onChange={handleChange}
              autoFocus
            />
          </div>

          {/* Mood Selector */}
          <div className="form-group">
            <label className="form-label">How are you feeling?</label>
            <div className="mood-selector" role="group" aria-label="Mood selection">
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  id={`mood-${m.key}`}
                  className={`mood-option ${form.mood === m.key ? 'active' : ''}`}
                  onClick={() => handleMood(m.key)}
                  aria-pressed={form.mood === m.key}
                  aria-label={m.label}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="form-group">
            <label className="form-label" htmlFor="entry-content">
              Your Thoughts
            </label>
            <textarea
              id="entry-content"
              className="form-input form-textarea"
              name="content"
              placeholder="Pour your heart out… What happened today? How do you feel?"
              value={form.content}
              onChange={handleChange}
              rows={6}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              id="modal-cancel-btn"
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              id="modal-save-btn"
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading
                ? '🔄 Saving…'
                : isEdit
                  ? '💾 Save Changes'
                  : '✨ Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EntryModal;
