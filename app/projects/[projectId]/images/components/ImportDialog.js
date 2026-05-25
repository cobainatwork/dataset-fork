'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  Tabs,
  Tab,
  Paper,
  Chip,
  Card
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import axios from 'axios';

export default function ImportDialog({ open, projectId, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(0); // 0: 目錄匯入, 1: PDF 匯入, 2: 壓縮包匯入
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputPath, setInputPath] = useState('');
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedZip, setSelectedZip] = useState(null);

  const handleAddDirectory = () => {
    if (inputPath.trim() && !directories.includes(inputPath.trim())) {
      setDirectories([...directories, inputPath.trim()]);
      setInputPath('');
    }
  };

  const handleRemoveDirectory = index => {
    setDirectories(directories.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (directories.length === 0) {
      toast.error(t('images.selectAtLeastOne'));
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/api/projects/${projectId}/images`, {
        directories
      });

      toast.success(t('images.importSuccess', { count: response.data.count }));
      setDirectories([]);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to import images:', error);
      toast.error(error.response?.data?.error || t('images.importFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePdfSelect = event => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedPdf(file);
    } else {
      toast.error(t('images.invalidPdfFile', { defaultValue: '請選擇有效的 PDF 檔案' }));
    }
  };

  const handlePdfImport = async () => {
    if (!selectedPdf) {
      toast.error(t('images.selectPdfFile', { defaultValue: '請選擇 PDF 檔案' }));
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedPdf);

      // 呼叫 PDF 轉換 API
      const response = await axios.post(`/api/projects/${projectId}/images/pdf-convert`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(
        t('images.pdfImportSuccess', {
          defaultValue: `成功從 PDF "${response.data.pdfName}" 匯入 ${response.data.count} 張圖片`,
          count: response.data.count,
          name: response.data.pdfName
        })
      );
      setSelectedPdf(null);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to import PDF:', error);
      toast.error(error.response?.data?.error || t('images.pdfImportFailed', { defaultValue: 'PDF 匯入失敗' }));
    } finally {
      setLoading(false);
    }
  };

  const handleZipSelect = event => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.zip')) {
      setSelectedZip(file);
    } else {
      toast.error(t('images.invalidZipFile', { defaultValue: '請選擇有效的 ZIP 檔案' }));
    }
  };

  const handleZipImport = async () => {
    if (!selectedZip) {
      toast.error(t('images.selectZipFile', { defaultValue: '請選擇 ZIP 檔案' }));
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedZip);

      // 呼叫壓縮包匯入 API
      const response = await axios.post(`/api/projects/${projectId}/images/zip-import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(
        t('images.zipImportSuccess', {
          defaultValue: `成功從壓縮包 "${response.data.zipName}" 匯入 ${response.data.count} 張圖片`,
          count: response.data.count,
          name: response.data.zipName
        })
      );
      setSelectedZip(null);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to import ZIP:', error);
      toast.error(error.response?.data?.error || t('images.zipImportFailed', { defaultValue: '壓縮包匯入失敗' }));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setDirectories([]);
      setSelectedPdf(null);
      setSelectedZip(null);
      setMode(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('images.importImages')}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Tabs
          value={mode}
          onChange={(e, newValue) => setMode(newValue)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={t('images.importFromDirectory', { defaultValue: '從目錄匯入' })}
            icon={<FolderOpenIcon />}
            iconPosition="start"
          />
          <Tab
            label={t('images.importFromPdf', { defaultValue: '從 PDF 匯入' })}
            icon={<PictureAsPdfIcon />}
            iconPosition="start"
          />
          <Tab
            label={t('images.importFromZip', { defaultValue: '從壓縮包匯入' })}
            icon={<FolderZipIcon />}
            iconPosition="start"
          />
        </Tabs>

        {mode === 0 ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('images.importTip')}
            </Alert>

            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
              <TextField
                fullWidth
                size="small"
                label={t('images.directoryPath')}
                placeholder={t('images.enterDirectoryPath')}
                value={inputPath}
                onChange={e => setInputPath(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleAddDirectory();
                  }
                }}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<FolderOpenIcon />}
                onClick={handleAddDirectory}
                disabled={loading || !inputPath.trim()}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: 1,
                  transition: 'all 0.2s',
                  '&:hover:not(:disabled)': {
                    boxShadow: 2,
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                {t('images.addDirectory', { defaultValue: '新增目錄' })}
              </Button>
            </Box>

            {directories.length > 0 && (
              <Card
                sx={{
                  p: 2.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FolderOpenIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {t('images.selectedDirectories')} ({directories.length})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {directories.map((dir, index) => (
                    <Chip
                      key={index}
                      label={dir}
                      onDelete={() => handleRemoveDirectory(index)}
                      disabled={loading}
                      icon={<FolderOpenIcon />}
                      sx={{
                        borderRadius: 1.5,
                        fontWeight: 500,
                        maxWidth: '100%',
                        '& .MuiChip-label': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Card>
            )}
          </>
        ) : mode === 1 ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('images.pdfImportTip', { defaultValue: '選擇 PDF 檔案，系統會自動將其轉換為圖片並匯入' })}
            </Alert>

            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'background.default',
                border: '2px dashed',
                borderColor: selectedPdf ? 'primary.main' : 'divider',
                transition: 'all 0.3s',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.main'
                }
              }}
              onClick={() => document.getElementById('pdf-file-input').click()}
            >
              <input
                id="pdf-file-input"
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handlePdfSelect}
                disabled={loading}
              />
              <UploadFileIcon sx={{ fontSize: 64, color: selectedPdf ? 'primary.main' : 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {selectedPdf ? selectedPdf.name : t('images.clickToSelectPdf', { defaultValue: '點選選擇 PDF 檔案' })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('images.supportedFormat', { defaultValue: '支援格式：PDF' })}
              </Typography>
              {selectedPdf && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('images.fileSize', { defaultValue: '檔案大小' })}: {(selectedPdf.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              )}
            </Paper>
          </>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('images.zipImportTip', { defaultValue: '選擇 ZIP 壓縮包檔案，系統會自動解壓並匯入其中的圖片' })}
            </Alert>

            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'background.default',
                border: '2px dashed',
                borderColor: selectedZip ? 'primary.main' : 'divider',
                transition: 'all 0.3s',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.main'
                }
              }}
              onClick={() => document.getElementById('zip-file-input').click()}
            >
              <input
                id="zip-file-input"
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                style={{ display: 'none' }}
                onChange={handleZipSelect}
                disabled={loading}
              />
              <FolderZipIcon sx={{ fontSize: 64, color: selectedZip ? 'primary.main' : 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {selectedZip ? selectedZip.name : t('images.clickToSelectZip', { defaultValue: '點選選擇 ZIP 檔案' })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('images.supportedZipFormat', { defaultValue: '支援格式：ZIP' })}
              </Typography>
              {selectedZip && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('images.fileSize', { defaultValue: '檔案大小' })}: {(selectedZip.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              )}
            </Paper>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        {mode === 0 ? (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={loading || directories.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {t('images.startImport')}
          </Button>
        ) : mode === 1 ? (
          <Button
            onClick={handlePdfImport}
            variant="contained"
            disabled={loading || !selectedPdf}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {t('images.convertAndImport', { defaultValue: '轉換並匯入' })}
          </Button>
        ) : (
          <Button
            onClick={handleZipImport}
            variant="contained"
            disabled={loading || !selectedZip}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {t('images.extractAndImport', { defaultValue: '解壓並匯入' })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
