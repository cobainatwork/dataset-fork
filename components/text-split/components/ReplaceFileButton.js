'use client';
import { useRef, useState } from 'react';
import { IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { replaceFile } from '@/lib/api/file';

export default function ReplaceFileButton({ projectId, file, onReplaced }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  function pickFile() { inputRef.current?.click(); }

  async function onFileChosen(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const content = await f.arrayBuffer();
    setPending({ file: f, content, name: f.name });
  }

  async function confirmReplace() {
    if (!pending) return;
    setBusy(true);
    try {
      await replaceFile({ projectId, oldFileId: file.id, file: pending.file, fileContent: pending.content, fileName: pending.name, t });
      toast.success(t('textSplit.replaceSuccess'));
      setPending(null);
      onReplaced?.();
    } catch (err) {
      toast.error(err.message || t('textSplit.replaceFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Tooltip title={t('textSplit.replaceVersion')}>
        <IconButton size="small" onClick={pickFile} aria-label={t('textSplit.replaceVersion')}>
          <SwapHorizIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <input ref={inputRef} type="file" accept=".md,.pdf" hidden onChange={onFileChosen} />
      <Dialog open={!!pending} onClose={() => !busy && setPending(null)}>
        <DialogTitle>{t('textSplit.replaceConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('textSplit.replaceConfirmBody', { oldName: file.fileName, newName: pending?.name || '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={busy}>{t('common.cancel')}</Button>
          <Button color="warning" variant="contained" onClick={confirmReplace} disabled={busy}>
            {t('textSplit.replaceConfirmAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
