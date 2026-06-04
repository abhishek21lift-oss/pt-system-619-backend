import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await req.supabase.from('clients').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await req.supabase.from('clients').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { data, error } = await req.supabase.from('clients').insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
  const { data, error } = await req.supabase.from('clients').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
