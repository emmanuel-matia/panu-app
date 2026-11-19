CREATE OR REPLACE FUNCTION public.notify_on_public_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.target_kind = 'post' AND NEW.action = 'comment' AND NEW.hidden_at IS NULL THEN
  PERFORM public.push_notification((SELECT author_id FROM public.posts WHERE id=NEW.target_id), NEW.user_id, 'comment', NEW.target_id);
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_on_public_comment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER public_engagement_comment_notify AFTER INSERT ON public.public_engagement FOR EACH ROW EXECUTE FUNCTION public.notify_on_public_comment();