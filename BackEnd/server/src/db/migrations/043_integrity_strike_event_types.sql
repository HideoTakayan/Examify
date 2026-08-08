-- Khớp STRIKE_EVENT_TYPES / report-violation API.

ALTER TABLE exam_integrity_events DROP CONSTRAINT IF EXISTS exam_integrity_events_type_check;

ALTER TABLE exam_integrity_events
  ADD CONSTRAINT exam_integrity_events_type_check
  CHECK (
    event_type IN (
      'exam_opened',
      'fullscreen_enter',
      'fullscreen_exit',
      'fullscreen_error',
      'visibility_hidden',
      'window_blur',
      'window_focus',
      'tab_switch',
      'devtools_open',
      'copy_attempt',
      'paste_attempt',
      'context_menu',
      'before_unload',
      'other'
    )
  );
