-- optional right/wrong record for an adjustment, so old whiteboard weeks can
-- count toward the right / wrong / % columns in standings too
alter table public.score_adjustments
  add column correct int,
  add column decided int,
  add constraint score_adjustments_record_check
    check ((correct is null) = (decided is null) and (correct is null or (correct >= 0 and correct <= decided)));
