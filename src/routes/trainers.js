import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await req.supabase.from('trainers').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
