import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar.jsx';
import DiaryCard from '../components/DiaryCard.jsx';
import EntryModal from '../components/EntryModal.jsx';

const API = 'http://localhost:5000/api';

function Dashboard({ user, onLogout }) {
  const [entries, setEntries]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editEntry, setEditEntry]       = useState(null);   // entry being edited
  const [deleteTarget, setDeleteTarget] = useState(null);   // entry pending delete

  // ── Fetch entries ──────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/entries/${user.id}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      console.error('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Create entry ───────────────────────────────────────────────
  const handleCreate = async (formData) => {
    const res = await fetch(`${API}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, userId: user.id }),
    });
    if (res.ok) {
      await fetchEntries();
      setShowModal(false);
    }
    return res;
  };

  // ── Edit entry ─────────────────────────────────────────────────
  const handleEdit = async (formData) => {
    const res = await fetch(`${API}/entries/${editEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, userId: user.id }),
    });
    if (res.ok) {
      await fetchEntries();
      setEditEntry(null);
    }
    return res;
  };

  // ── Delete entry ───────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`${API}/entries/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });
    await fetchEntries();
    setDeleteTarget(null);
  };

  // ── Filtered entries ───────────────────────────────────────────
  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />

      <main className="dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">My Diary</h1>
            <p className="dashboard-subtitle">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
          <button
            id="new-entry-btn"
            className="btn-new-entry"
            onClick={() => { setEditEntry(null); setShowModal(true); }}
          >
            ✏️ New Entry
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="stats-bar">
            <div className="stat-chip">
              📝 <strong>{entries.length}</strong> total entries
            </div>
            {search && (
              <div className="stat-chip">
                🔍 <strong>{filtered.length}</strong> matching &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            id="search-entries"
            className="search-input"
            type="text"
            placeholder="Search entries by title or content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Entries */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading entries…</p>
          </div>
        ) : (
          <div className="entries-grid">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  {search ? '🔍' : '📓'}
                </div>
                <h3>
                  {search ? 'No results found' : 'No entries yet'}
                </h3>
                <p>
                  {search
                    ? `No entries match "${search}". Try a different search term.`
                    : 'Start capturing your thoughts and memories. Click "New Entry" to begin!'}
                </p>
                {!search && (
                  <button
                    className="btn-new-entry"
                    onClick={() => { setEditEntry(null); setShowModal(true); }}
                    style={{ margin: '0 auto' }}
                  >
                    ✏️ Write First Entry
                  </button>
                )}
              </div>
            ) : (
              filtered.map((entry, idx) => (
                <DiaryCard
                  key={entry.id}
                  entry={entry}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                  onEdit={() => { setEditEntry(entry); setShowModal(true); }}
                  onDelete={() => setDeleteTarget(entry)}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {showModal && (
        <EntryModal
          entry={editEntry}
          onSave={editEntry ? handleEdit : handleCreate}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="delete-modal">
              <div className="delete-icon">🗑️</div>
              <h3>Delete Entry?</h3>
              <p>
                Are you sure you want to delete <strong>&ldquo;{deleteTarget.title}&rdquo;</strong>?
                This action cannot be undone.
              </p>
              <div className="delete-actions">
                <button
                  id="cancel-delete-btn"
                  className="btn-secondary"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-btn"
                  className="btn-confirm-delete"
                  onClick={handleDelete}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
