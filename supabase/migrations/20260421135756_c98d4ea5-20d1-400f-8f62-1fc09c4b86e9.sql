CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  reps INTEGER NOT NULL CHECK (reps >= 0 AND reps <= 1000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scores"
ON public.scores FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert scores"
ON public.scores FOR INSERT
WITH CHECK (
  length(player_name) > 0
  AND length(player_name) <= 20
  AND reps >= 0
  AND reps <= 1000
);

CREATE INDEX idx_scores_reps_desc ON public.scores (reps DESC, created_at ASC);