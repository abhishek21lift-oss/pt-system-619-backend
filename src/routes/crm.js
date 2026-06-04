import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await req.supabase.from('crm_leads').select('*').order('days');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/:id', async (req, res) => {
  const { stage } = req.body;
  const { data, error } = await req.supabase.from('crm_leads').update({ stage }).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
