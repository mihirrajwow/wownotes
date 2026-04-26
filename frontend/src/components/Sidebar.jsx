import React, { useState } from 'react';
import { StickyNote, Archive, Tag, LogOut, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar({ user, tags, activeTag, setActiveTag, showArchived, setShowArchived, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logo}>
        <BookOpen size={22} className={styles.logoIcon} />
        {!collapsed && <span className={styles.logoText}>tpp™</span>}
      </div>

      <nav className={styles.nav}>
        <button
          className={`${styles.navItem} ${!showArchived && !activeTag ? styles.active : ''}`}
          onClick={() => { setShowArchived(false); setActiveTag(''); }}
        >
          <StickyNote size={17} />
          {!collapsed && <span>All Notes</span>}
        </button>

        <button
          className={`${styles.navItem} ${showArchived ? styles.active : ''}`}
          onClick={() => { setShowArchived(true); setActiveTag(''); }}
        >
          <Archive size={17} />
          {!collapsed && <span>Archive</span>}
        </button>

        {!collapsed && tags.length > 0 && (
          <div className={styles.tagSection}>
            <p className={styles.tagLabel}>Tags</p>
            {tags.map(tag => (
              <button
                key={tag}
                className={`${styles.navItem} ${styles.tagItem} ${activeTag === tag ? styles.active : ''}`}
                onClick={() => { setActiveTag(tag); setShowArchived(false); }}
              >
                <Tag size={14} />
                <span>#{tag}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className={styles.bottom}>
        {!collapsed && user && (
          <div className={styles.userInfo}>
            <img src={user.avatar} alt={user.name} className={styles.avatar} />
            <div className={styles.userText}>
              <p className={styles.userName}>{user.name.split(' ')[0]}</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>
        )}

        <button className={styles.navItem} onClick={onLogout} title="Sign out">
          <LogOut size={17} />
          {!collapsed && <span>Sign Out</span>}
        </button>

        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </aside>
  );
}
