import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Box,
  Chip,
  Checkbox,
  ListItemText
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  }
};

/**
 * 模型選擇元件
 * @param {Object} props
 * @param {Array} props.models - 可用模型列表
 * @param {Array} props.selectedModels - 已選擇的模型ID列表
 * @param {Function} props.onChange - 選擇改變時的回撥函式
 */
export default function ModelSelector({ models, selectedModels, onChange }) {
  // 獲取模型名稱
  const getModelName = modelId => {
    const model = models.find(m => m.id === modelId);
    return model ? `${model.providerName}: ${model.modelName}` : modelId;
  };
  const { t } = useTranslation();

  return (
    <FormControl fullWidth>
      <InputLabel id="model-select-label">{t('playground.selectModelMax3')}</InputLabel>
      <Select
        labelId="model-select-label"
        id="model-select"
        multiple
        value={selectedModels}
        onChange={onChange}
        input={<OutlinedInput label="選擇模型（最多3個）" />}
        renderValue={selected => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map(modelId => (
              <Chip key={modelId} label={getModelName(modelId)} color="primary" variant="outlined" size="small" />
            ))}
          </Box>
        )}
        MenuProps={MenuProps}
      >
        {models
          .filter(m => {
            if (m.providerId.toLowerCase() === 'ollama') {
              return m.modelName && m.endpoint;
            } else {
              return m.modelName && m.endpoint && m.apiKey;
            }
          })
          .map(model => (
            <MenuItem
              key={model.id}
              value={model.id}
              disabled={selectedModels.length >= 3 && !selectedModels.includes(model.id)}
            >
              <Checkbox checked={selectedModels.indexOf(model.id) > -1} />
              <ListItemText primary={`${model.providerName}: ${model.modelName}`} />
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
}
