import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const revenueSchema = z.object({
  month: z.string().min(1),
  total: z.number().min(0).default(0),
  abhishek: z.number().min(0).default(0),
  riya: z.number().min(0).default(0),
  rajat: z.number().min(0).default(0),
});

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.abs(+req.query.limit || 60), 200);
    const offset = Math.abs(+req.query.offset || 0);
    let query = req.supabase.from('monthly_revenue').select('*', { count: 'exact' });
    const { data, error, count } = await query.order('month').range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data, count, limit, offset });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('monthly_revenue').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = revenueSchema.parse(req.body);
    const { data, error } = await req.supabase.from('monthly_revenue').insert(parsed).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = revenueSchema.partial().parse(req.body);
    const { data, error } = await req.supabase.from('monthly_revenue').update(parsed).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('monthly_revenue').delete().eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

export default router;
