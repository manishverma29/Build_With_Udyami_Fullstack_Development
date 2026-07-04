const MOOD_MAP = {
  happy:    { emoji: '😊', label: 'Happy' },
  excited:  { emoji: '🤩', label: 'Excited' },
  neutral:  { emoji: '😐', label: 'Neutral' },
  sad:      { emoji: '😢', label: 'Sad' },
  angry:    { emoji: '😡', label: 'Angry' },
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function DiaryCard({ entry, onEdit, onDelete, style }) {
  const mood = MOOD_MAP[entry.mood] || MOOD_MAP.neutral;

  return (
    <article className="diary-card" style={style} aria-label={`Diary entry: ${entry.title}`}>
      {/* Mood badge */}
      <div className="card-mood-badge" aria-label={`Mood: ${mood.label}`}>
        {mood.emoji} {mood.label}
      </div>

      {/* Title */}
      <h2 className="card-title">{entry.title}</h2>

      {/* Content preview */}
      <p className="card-preview">{entry.content}</p>

      {/* Footer */}
      <div className="card-footer">
        <span className="card-date" aria-label="Created date">
          🕐 {formatDate(entry.createdAt)}
          {entry.updatedAt !== entry.createdAt && (
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.3rem' }}>(edited)</span>
          )}
        </span>

        <div className="card-actions">
          <button
            id={`edit-btn-${entry.id}`}
            className="btn-edit"
            onClick={onEdit}
            aria-label={`Edit "${entry.title}"`}
          >
            ✏️ Edit
          </button>
          <button
            id={`delete-btn-${entry.id}`}
            className="btn-danger"
            onClick={onDelete}
            aria-label={`Delete "${entry.title}"`}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default DiaryCard;
