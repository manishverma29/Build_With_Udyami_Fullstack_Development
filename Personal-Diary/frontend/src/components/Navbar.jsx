function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-brand">
        <div className="navbar-brand-icon" aria-hidden="true">📖</div>
        <span className="navbar-brand-name">Personal Diary</span>
      </div>

      <div className="navbar-user">
        <span className="navbar-greeting">
          Hello, <span>{user.username}</span> 👋
        </span>
        <button
          id="logout-btn"
          className="btn-logout"
          onClick={onLogout}
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
