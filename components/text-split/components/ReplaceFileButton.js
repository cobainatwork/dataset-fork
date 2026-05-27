'use client';
import { useRef, useState } from 'react';
import { IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useTranslation } from 'react-i18next';

export default function ReplaceFileButton({ file, onReplaceRequested }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);

  function pickFile() { inputRef.current?.click(); }

  function onFileChosen(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setPending({ file: f, name: f.name });
  }

  function confirmReplace() {
    if (!pending) return;
    onReplaceRequested?.(file, pending.file);
    setPending(null);
  }

  return (
    <>
      <Tooltip title={t('textSplit.replaceVersion')}>
        <IconButton size="small" onClick={pickFile} aria-label={t('textSplit.replaceVersion')}>
          <SwapHorizIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <input ref={inputRef} type="file" accept=".md,.pdf" hidden onChange={onFileChosen} />
      <Dialog open={!!pending} onClose={() => setPending(null)}>
        <DialogTitle>{t('textSplit.replaceConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('textSplit.replaceConfirmBody', { oldName: file.fileName, newName: pending?.name || '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>{t('common.cancel')}</Button>
          <Button color="warning" variant="contained" onClick={confirmReplace}>
            {t('textSplit.replaceConfirmAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
