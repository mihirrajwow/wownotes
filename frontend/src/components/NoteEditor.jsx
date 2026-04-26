import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Tag, Palette, Pin, Save } from 'lucide-react';
import s from './NoteEditor.module.css';

const COLORS = ['default','rose','amber','emerald','sky','violet'];
const COLOR_HEX = {
  default: '#faf8f5', rose: '#ffe4e6', amber: '#fef3c7',
  emerald: '#d1fae5', sky: '#e0f2fe', violet: '#ede9fe',
};

export default function NoteEditor({ note, onSave, onDelete, onClose, saving, defaultCourse, defaultSemester }) {
  const [title,     setTitle]     = useState(note.title   || '');
  const [content,   setContent]   = useState(note.content || '');
  const [tags,      setTags]      = useState((note.tags   || []).join(', '));
  const [color,     setColor]     = useState(note.color   || 'default');
  const [isPinned,  setIsPinned]  = useState(note.isPinned || false);
  const [subject,   setSubject]   = useState(note.subject || '');
  const [course,    setCourse]    = useState(note.course  || defaultCourse || '');
  const [semester,  setSemester]  = useState(note.semester || defaultSemester || '');
  const [showPalette, setShowPalette] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const parsedTags = tags.split(',').map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g,'')).filter(Boolean);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return onClose();
    onSave({
      title: title.trim() || 'Untitled',
      content, color, isPinned,
      tags: parsedTags,
      subject: subject.trim(),
      course:   course   || null,
      semester: semester ? parseInt(semester) : null,
    });
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} style={{ '--modal-bg': COLOR_HEX[color] }} onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className={s.toolbar}>
          <div className={s.toolLeft}>
            <button className={`${s.toolBtn} ${isPinned ? s.active : ''}`} onClick={() => setIsPinned(p => !p)} title="Pin"><Pin size={15}/></button>
            <div className={s.paletteWrap}>
              <button className={`${s.toolBtn} ${showPalette ? s.active : ''}`} onClick={() => setShowPalette(p => !p)} title="Color"><Palette size={15}/></button>
              {showPalette && (
                <div className={s.palette}>
                  {COLORS.map(c => (
                    <button key={c} className={`${s.dot} ${color===c ? s.dotSelected : ''}`}
                      style={{ background: COLOR_HEX[c] }}
                      onClick={() => { setColor(c); setShowPalette(false); }} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={s.toolRight}>
            {onDelete && <button className={`${s.toolBtn} ${s.danger}`} onClick={onDelete} title="Delete"><Trash2 size={15}/></button>}
            <button className={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? <span className={s.spin}/> : <><Save size={13}/> Save</>}
            </button>
            <button className={s.closeBtn} onClick={onClose}><X size={17}/></button>
          </div>
        </div>

        {/* Body */}
        <div className={s.body}>
          <input ref={titleRef} className={s.titleInput} placeholder="Note title…" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}/>
          <textarea className={s.contentArea} placeholder="Start writing…" value={content} onChange={e => setContent(e.target.value)} maxLength={50000}/>
        </div>

        {/* Academic context */}
        <div className={s.context}>
          <input className={s.ctxInput} placeholder="Subject (e.g. DBMS)" value={subject} onChange={e => setSubject(e.target.value)} />
          <select className={s.ctxSelect} value={course} onChange={e => { setCourse(e.target.value); setSemester(''); }}>
            <option value="">Course</option>
            <option value="btech">B.Tech</option>
            <option value="mba">MBA</option>
            <option value="mca">MCA</option>
          </select>
          {course && (
            <select className={s.ctxSelect} value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="">Semester</option>
              {Array.from({ length: course==='btech' ? 8 : 4 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Sem {n}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tags */}
        <div className={s.footer}>
          <Tag size={13} className={s.tagIcon}/>
          <input className={s.tagInput} placeholder="Tags, comma separated" value={tags} onChange={e => setTags(e.target.value)}/>
          {parsedTags.length > 0 && (
            <div className={s.tagPills}>
              {parsedTags.map(t => <span key={t} className={s.pill}>#{t}</span>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
