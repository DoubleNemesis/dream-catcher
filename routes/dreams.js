import express from 'express';
import { getDatabase } from '../config/database.js';
import { getDreamInterpretation } from '../utils/ai.js'; // or '../utils/ai-gemini.js' if using Gemini

const router = express.Router();

// Validation helper
function validateDreamText(dreamText) {
  // Type check
  if (typeof dreamText !== 'string') {
    return { valid: false, error: 'Dream text must be a string' };
  }

  // Sanitization: trim whitespace
  const trimmed = dreamText.trim();

  // Required field check
  if (trimmed.length === 0) {
    return { valid: false, error: 'Dream text is required' };
  }

  // Length limit check
  if (trimmed.length > 5000) {
    return { valid: false, error: 'Dream text must be less than 5000 characters' };
  }

  return { valid: true, value: trimmed };
}

// Get all dreams
router.get('/', async (req, res) => {
  console.log('GET /api/dreams received');
  try {
    const db = await getDatabase();
    const result = await db.all('SELECT * FROM dreams ORDER BY created_at DESC');
    console.log('Fetched', result.length, 'dreams');
    res.json(result);
  } catch (error) {
    console.error('Error fetching dreams:', error);
    res.status(500).json({ error: 'Failed to fetch dreams' });
  }
});

// Get single dream
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const result = await db.get('SELECT * FROM dreams WHERE id = ?', req.params.id);
    
    if (!result) {
      return res.status(404).json({ error: 'Dream not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching dream:', error);
    res.status(500).json({ error: 'Failed to fetch dream' });
  }
});

// Create new dream with AI interpretation
router.post('/', async (req, res) => {
  console.log('POST /api/dreams received');
  console.log('Request body:', req.body);

  const { dream_text } = req.body;

  // Validate input
  const validation = validateDreamText(dream_text);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error, type: 'validation' });
  }

  try {
    let interpretation;
    try {
      interpretation = await getDreamInterpretation(validation.value);
    } catch (aiError) {
      console.error('AI interpretation failed:', aiError);
      return res.status(503).json({ 
        error: 'AI service temporarily unavailable.',
        type: 'ai_error'
      });
    }
    
    console.log('AI interpretation received, inserting into database...');

    // Insert into database and return the created dream
    const db = await getDatabase();
    const result = await db.run(
      'INSERT INTO dreams (dream_text, interpretation) VALUES (?, ?)',
      [validation.value, interpretation]
    );
    
    // Fetch the inserted record
    const dream = await db.get('SELECT * FROM dreams WHERE id = ?', result.lastID);
    
    console.log('Dream created successfully:', dream.id);
    res.status(201).json(dream);
  } catch (error) {
    console.error('Error creating dream:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to save dream. Please try again.', type: 'database_error' });
  }
});

// Delete dream
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM dreams WHERE id = ?', req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }
    
    res.json({ message: 'Dream deleted successfully' });
  } catch (error) {
    console.error('Error deleting dream:', error);
    res.status(500).json({ error: 'Failed to delete dream' });
  }
});

export default router;
