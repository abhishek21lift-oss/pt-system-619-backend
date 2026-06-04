import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const plSchema = z.object({
  name: z.string().min(1),
  squat: z.number().min(0).default(0),
  bench: z.number().min(0).default(0),
  deadlift: z.number().min(0).default(0),
  total: z.number().min(0).default(0),
  bw: z.number().min(0).default(0),
  wc: z.string().default(''),
  meet: z.string().default(''),
});

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.abs(+req.query.limit || 50), 200);
    const offset = Math.abs(+req.query.offset || 0);
    let query = req.supabase.from('powerlifting_clients').select('*', { count: 'exact' });
    const { data, error, count } = await query.order('name').range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data, count, limit, offset });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('powerlifting_clients').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = plSchema.parse(req.body);
    const { data, error } = await req.supabase.from('powerlifting_clients').insert(parsed).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = plSchema.partial().parse(req.body);
    const { data, error } = await req.supabase.from('powerlifting_clients').update(parsed).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('powerlifting_clients').delete().eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

export default router;
