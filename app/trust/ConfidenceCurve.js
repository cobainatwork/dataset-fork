'use client';
import { Box, Typography } from '@mui/material';

export default function ConfidenceCurve({ buckets }) {
  const keys = Object.keys(buckets).sort();
  return (
    <Box sx={{ mt: 2 }}>
      {keys.map((k) => {
        const b = buckets[k];
        const total = b.correct + b.incorrect + (b.partial || 0);
        const precision = total ? (b.correct / total) : 0;
        return (
          <Box key={k} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ width: 60 }}>{k}</Box>
            <Box sx={{ width: 200, height: 16, bgcolor: 'grey.200', mr: 2 }}>
              <Box sx={{ width: `${precision * 100}%`, height: '100%', bgcolor: 'primary.main' }} />
            </Box>
            <Typography variant="caption">{total} feedbacks · {(precision * 100).toFixed(0)}%</Typography>
          </Box>
        );
      })}
    </Box>
  );
}
