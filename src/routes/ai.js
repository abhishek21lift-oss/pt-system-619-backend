import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const dietSchema = z.object({
  age: z.number().int().min(15).max(70),
  gender: z.enum(['male', 'female']),
  weight: z.number().min(40).max(180),
  height: z.number().min(140).max(220),
  bf: z.number().min(5).max(50),
  activity: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['fat_loss', 'muscle_gain', 'recomp', 'strength', 'powerlifting']),
  diet: z.enum(['veg', 'egg', 'non_veg', 'vegan']),
});

const workoutSchema = z.object({
  goal: z.string(),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  days: z.number().int().min(1).max(7),
  equipment: z.string(),
  injuries: z.string().default('none'),
  style: z.string(),
});

const actMul = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
const goalAdj = { fat_loss: -500, muscle_gain: 300, recomp: 0, strength: 200, powerlifting: 300 };
const goalLabels = { fat_loss: 'Fat Loss', muscle_gain: 'Muscle Gain', recomp: 'Recomposition', strength: 'Strength', powerlifting: 'Powerlifting Peak' };
const dietLabels = { veg: 'Vegetarian', egg: 'Eggetarian', non_veg: 'Non-Vegetarian', vegan: 'Vegan' };

function calcBase(form) {
  const { age, gender, weight, height, activity, goal } = form;
  const bmr = gender === 'male' ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = Math.round(bmr * actMul[activity]);
  const kcal = tdee + goalAdj[goal];
  const protein = Math.round(weight * (goal === 'muscle_gain' || goal === 'powerlifting' ? 2.2 : 2.0));
  const fat = Math.round(kcal * 0.28 / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  const iscut = goal === 'fat_loss';
  const meals = (iscut ? [
    { time: '7:00 AM', name: 'Breakfast', kcal: Math.round(kcal * 0.25) },
    { time: '11:00 AM', name: 'Mid-Morning', kcal: Math.round(kcal * 0.10) },
    { time: '1:00 PM', name: 'Lunch', kcal: Math.round(kcal * 0.30) },
    { time: '4:00 PM', name: 'Pre-Workout', kcal: Math.round(kcal * 0.10) },
    { time: '7:00 PM', name: 'Post-Workout', kcal: Math.round(kcal * 0.15) },
    { time: '9:00 PM', name: 'Dinner', kcal: Math.round(kcal * 0.10) },
  ] : [
    { time: '7:00 AM', name: 'Breakfast', kcal: Math.round(kcal * 0.22) },
    { time: '10:00 AM', name: 'Mid-Morning', kcal: Math.round(kcal * 0.12) },
    { time: '1:00 PM', name: 'Lunch', kcal: Math.round(kcal * 0.28) },
    { time: '4:00 PM', name: 'Pre-Workout', kcal: Math.round(kcal * 0.12) },
    { time: '7:00 PM', name: 'Post-Workout', kcal: Math.round(kcal * 0.14) },
    { time: '9:30 PM', name: 'Dinner', kcal: Math.round(kcal * 0.12) },
  ]);
  return { bmr: Math.round(bmr), tdee, kcal, protein, fat, carbs, meals };
}

router.post('/diet', async (req, res, next) => {
  try {
    const form = dietSchema.parse(req.body);
    const base = calcBase(form);

    const prompt = `You are a professional Indian fitness nutritionist. Respond ONLY as valid JSON (no markdown, no backticks).
Client: Age ${form.age}, ${form.gender}, ${form.weight}kg, ${form.height}cm, BF ~${form.bf}%
Activity: ${form.activity}, Goal: ${goalLabels[form.goal]}, Diet: ${dietLabels[form.diet]}
Targets: ${base.kcal} kcal, ${base.protein}g protein, ${base.carbs}g carbs, ${base.fat}g fat
JSON format: {"tip":"one coaching insight","foods":["5 best Indian foods for goal"],"avoid":["3 foods to avoid"],"hydration":"water recommendation","supplement":"top 2 supplements"}`;

    let ai = {};
    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const txt = data.content?.[0]?.text || '{}';
        ai = JSON.parse(txt.replace(/```json|```/g, '').trim());
      }
    } catch {
      /* AI offline, use calculated plan only */
    }

    res.json({ ...base, ...ai, _ai: !!ai.tip });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.post('/workout', async (req, res, next) => {
  try {
    const form = workoutSchema.parse(req.body);

    const prompt = `You are a world-class strength and conditioning coach working in India. Respond ONLY as valid JSON (no markdown).
Client: Goal=${form.goal}, Experience=${form.experience}, Days/week=${form.days}, Equipment=${form.equipment}, Injuries=${form.injuries}, Style=${form.style}
JSON: {"program_name":"name","overview":"2 sentences","days":[{"day":"Day N","focus":"muscle group","exercises":[{"name":"","sets":"","reps":"","rest":"","notes":""}]}],"progression":"weekly progression rule","deload":"deload protocol"}
Include EXACTLY ${form.days} training days. Use Indian gym-friendly exercises.`;

    let result;
    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const txt = data.content?.[0]?.text || '{}';
        result = JSON.parse(txt.replace(/```json|```/g, '').trim());
      }
    } catch {
      /* AI offline */
    }

    if (!result) {
      const style = form.style.charAt(0).toUpperCase() + form.style.slice(1);
      result = {
        program_name: `${form.days}-Day ${style} Program`,
        overview: `${form.experience.charAt(0).toUpperCase() + form.experience.slice(1)}-level ${form.style} program. ${form.days} training days per week, optimised for ${form.goal.replace('_', ' ')}.`,
        days: Array.from({ length: form.days }, (_, i) => ({
          day: `Day ${i + 1}`,
          focus: ['Lower — Squat Focus', 'Upper — Push Focus', 'Lower — Hinge Focus', 'Upper — Pull Focus', 'Full Body', 'Active Recovery'][i % 6],
          exercises: [
            { name: 'Barbell Back Squat', sets: '4', reps: '5', rest: '3 min', notes: 'Belt on last sets' },
            { name: 'Romanian Deadlift', sets: '3', reps: '8', rest: '2 min', notes: 'Slow eccentric' },
            { name: 'Leg Press', sets: '3', reps: '10-12', rest: '90s', notes: 'Full ROM' },
          ],
        })),
        progression: 'Add 2.5kg/week on primary lifts. Deload if 2 consecutive sessions fail.',
        deload: 'Week 4: drop volume by 40%, keep intensity. Focus on technique.',
      };
    }

    res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

export default router;
