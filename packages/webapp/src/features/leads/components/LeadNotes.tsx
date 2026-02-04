/**
 * Lead notes display and add/update form.
 *
 * Shows current note (if any) and provides a textarea for adding or
 * updating notes. Uses useAddLeadNote mutation which writes to both
 * lead_registry.notes and lead_activity_log.
 */

import { useState } from 'react';
import { Card } from '@/shared/ui';
import { useToast } from '@/shared/stores/toastStore';
import { useAuthStore } from '@/features/auth/store';
import { useAddLeadNote } from '../hooks/useAddLeadNote';

interface LeadNotesProps {
  leadId: number;
  currentNote: string | null;
}

export function LeadNotes({ leadId, currentNote }: LeadNotesProps) {
  const telegramId = useAuthStore((s) => s.telegramId);
  const mutation = useAddLeadNote();
  const { toast } = useToast();
  const [noteText, setNoteText] = useState('');

  const handleSubmit = () => {
    if (!noteText.trim() || !telegramId) return;

    const vars = { leadId, telegramId, note: noteText.trim() };
    mutation.mutate(vars, {
      onSuccess: () => {
        setNoteText('');
        toast({ type: 'success', message: 'Note saved' });
      },
      onError: () => {
        toast({
          type: 'error',
          message: 'Failed to save note',
          action: { label: 'Retry', onClick: () => mutation.mutate(vars) },
        });
      },
    });
  };

  return (
    <div className="space-y-3">
      {/* Current note display */}
      {currentNote ? (
        <Card padding="sm">
          <p className="whitespace-pre-wrap text-sm text-text-secondary">
            {currentNote}
          </p>
        </Card>
      ) : (
        <p className="text-sm text-text-hint">No notes yet.</p>
      )}

      {/* Add/update note form */}
      <div className="space-y-2">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add context, reminders, or follow-up notes..."
          rows={3}
          className="w-full resize-none rounded-xl border border-surface-secondary bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-hint focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!noteText.trim() || mutation.isPending}
          className="min-h-[44px] rounded-button bg-accent px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 active:bg-accent/80"
        >
          {mutation.isPending ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </div>
  );
}
