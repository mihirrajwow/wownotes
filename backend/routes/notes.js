const express = require('express');
const Note = require('../models/Note');
const router = express.Router();

// Auth guard middleware
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
};

router.use(requireAuth);

// GET all notes (excluding archived unless ?archived=true)
router.get('/', async (req, res) => {
  try {
    const { archived, search, tag } = req.query;
    const query = {
      user: req.user._id,
      isArchived: archived === 'true',
    };

    if (tag) query.tags = tag;

    let notes;
    if (search) {
      notes = await Note.find({
        ...query,
        $text: { $search: search },
      }).sort({ isPinned: -1, createdAt: -1 });
    } else {
      notes = await Note.find(query).sort({ isPinned: -1, updatedAt: -1 });
    }

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

// GET single note
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch note.' });
  }
});

// CREATE note
router.post('/', async (req, res) => {
  try {
    const { title, content, tags, color, isPinned } = req.body;
    const note = await Note.create({
      user: req.user._id,
      title,
      content,
      tags,
      color,
      isPinned,
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE note
router.put('/:id', async (req, res) => {
  try {
    const { title, content, tags, color, isPinned, isArchived } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, content, tags, color, isPinned, isArchived },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

module.exports = router;
