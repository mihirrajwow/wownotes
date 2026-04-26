const mongoose = require('mongoose');

// Personal notes created by a student (private, only they see them)
const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Untitled Note', trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 50000 },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    color: {
      type: String,
      enum: ['default', 'rose', 'amber', 'emerald', 'sky', 'violet'],
      default: 'default',
    },

    // Optional academic context (for personal notes)
    course: { type: String, enum: ['btech', 'mba', 'mca', null], default: null },
    semester: { type: Number, default: null },
    subject: { type: String, trim: true, default: '' },

    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

noteSchema.index({ user: 1, createdAt: -1 });
noteSchema.index({ user: 1, title: 'text', content: 'text' });

module.exports = mongoose.model('Note', noteSchema);
