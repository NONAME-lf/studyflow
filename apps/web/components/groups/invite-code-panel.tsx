'use client';

import { Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useRegenerateInviteCode } from '@/lib/queries';

/** Visible to the headman only (the API returns null to members). */
export function InviteCodePanel({ groupId, code }: { groupId: string; code: string }) {
  const regenerate = useRegenerateInviteCode(groupId);
  const [confirm, setConfirm] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Код скопійовано');
    } catch {
      toast.error('Не вдалося скопіювати — виділіть код вручну');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-dashed border-ink/40 px-4 py-3">
      <div>
        <p className="text-sm text-muted-foreground">Код запрошення</p>
        <p
          className="font-display text-xl font-bold tracking-[0.2em] text-ink select-all"
          data-testid="invite-code"
        >
          {code}
        </p>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => void copy()}>
          <Copy /> Копіювати
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirm(true)}
          data-testid="regenerate-code"
        >
          <RefreshCw /> Новий код
        </Button>
      </div>
      <p className="w-full text-sm text-muted-foreground">
        Надішліть код одногрупникам: вони введуть його на сторінці «Групи».
      </p>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Створити новий код?</AlertDialogTitle>
            <AlertDialogDescription>
              Старий код перестане працювати. Учасники, які вже в групі, залишаться.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                regenerate.mutate(undefined, {
                  onSuccess: (res) => toast.success(`Новий код: ${res.inviteCode}`),
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              Створити новий код
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
