import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const crmSchema = z.object({
  name: z.string().min(1),
  stage: z.string().default('Lead'),
  source: z.string().default(''),
  trainer: z.string().default(''),
  days: z.number().int().min(0).default(0),
  value: z.number().min(0).default(0),
});

const CRM_STAGES = ['Lead', 'Contacted', 'Trial Session', 'Consultation', 'Proposal Sent', 'Converted'];

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.abs(+req.query.limit || 50), 200);
    const offset = Math.abs(+req.query.offset || 0);
    let query = req.supabase.from('crm_leads').select('*', { count: 'exact' });
    const { stage, trainer } = req.query;
    if (stage) query = query.eq('stage', stage);
    if (trainer) query = query.eq('trainer', trainer);
    const { data, error, count } = await query.order('days').range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data, count, limit, offset });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('crm_leads').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = crmSchema.parse(req.body);
    const { data, error } = await req.supabase.from('crm_leads').insert(parsed).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { stage } = req.body;
    if (stage && !CRM_STAGES.includes(stage)) {
      return res.status(400).json({ error: `Stage must be one of: ${CRM_STAGES.join(', ')}` });
    }
    const parsed = crmSchema.partial().parse(req.body);
    const { data, error } = await req.supabase.from('crm_leads').update(parsed).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('crm_leads').delete().eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

export default router;
