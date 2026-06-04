import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const programSchema = z.object({
  name: z.string().min(1),
  client: z.string().default(''),
  trainer: z.string().default(''),
  weeks: z.number().int().min(0).default(0),
  phase: z.string().default(''),
  days: z.number().int().min(0).default(0),
  progress: z.number().int().min(0).max(100).default(0),
});

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.abs(+req.query.limit || 50), 200);
    const offset = Math.abs(+req.query.offset || 0);
    let query = req.supabase.from('programs').select('*', { count: 'exact' });
    const { trainer, phase } = req.query;
    if (trainer) query = query.eq('trainer', trainer);
    if (phase) query = query.eq('phase', phase);
    const { data, error, count } = await query.order('name').range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data, count, limit, offset });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('programs').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = programSchema.parse(req.body);
    const { data, error } = await req.supabase.from('programs').insert(parsed).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = programSchema.partial().parse(req.body);
    const { data, error } = await req.supabase.from('programs').update(parsed).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('programs').delete().eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

export default router;
