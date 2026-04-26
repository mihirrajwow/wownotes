import React from 'react';
import { Pin, Archive, ArchiveRestore } from 'lucide-react';
import styles from './NoteCard.module.css';

const COLOR_BG = {
  default: 'var(--note-default)',
  rose:    'var(--note-rose)',
  amber:   'var(--note-amber)',
  emerald: 'var(--note-emerald)',
  sky:     'var(--note-sky)',
  violet:  'var(--note-violet)',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NoteCard({ note, onOpen, onPin, onArchive, style }) {
  const bg = COLOR_BG[note.color] || COLOR_BG.default;
  const preview = note.content?.replace(/\s+/g, ' ').trim().slice(0, 140);

  return (
    <div
      className={styles.card}
      style={{ '--card-bg': bg, ...style }}
      onClick={onOpen}
    >
      <div className={styles.actions} onClick={e => e.stopPropagation()}>
        <button
          className={`${styles.action} ${note.isPinned ? styles.pinned : ''}`}
          onClick={onPin}
          title={note.isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={13} />
        </button>
        <button
          className={styles.action}
          onClick={onArchive}
          title={note.isArchived ? 'Unarchive' : 'Archive'}
        >
          {note.isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
        </button>
      </div>

      <h3 className={styles.title}>{note.title || 'Untitled'}</h3>
      {preview && <p className={styles.preview}>{preview}</p>}

      {note.tags?.length > 0 && (
        <div className={styles.tags}>
          {note.tags.slice(0, 3).map(t => (
            <span key={t} className={styles.tag}>#{t}</span>
          ))}
        </div>
      )}

      <p className={styles.time}>{timeAgo(note.updatedAt)}</p>
    </div>
  );
}
