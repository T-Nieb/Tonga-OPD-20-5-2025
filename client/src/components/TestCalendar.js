import * as React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { Box } from '@mui/material';

export default function TestCalendar() {
  const [value, setValue] = React.useState(null);

  return (
    <Box sx={{ p: 4 }}>
      <DatePicker
        label="Test Calendar"
        value={value}
        onChange={setValue}
        renderDay={(day, _value, DayComponentProps) => {
          let sx = {};
          if (day.getDate() % 2 === 0) {
            sx = { bgcolor: 'success.main', color: 'white' };
          } else {
            sx = { bgcolor: 'error.main', color: 'white' };
          }
          return <PickersDay key={day.toString()} {...DayComponentProps} sx={sx} />;
        }}
      />
    </Box>
  );
} 