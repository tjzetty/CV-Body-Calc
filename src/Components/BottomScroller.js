import * as React from "react";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import Button from "@mui/material/Button";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";

export default function BottomScroller() {
  const [value, setValue] = React.useState(0);

  return (
    <Box
      sx={{
        width: "100vw",
        position: "absolute",
        bottom: 0,
        left: "-(100/90)% !important",
      }}
    >
      <BottomNavigation
        showLabels
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
        }}
      >
        <Button
          variant="contained"
          sx={{ width: "100vw" }}
          onClick={() => {
            window.scrollBy(window.screenY, window.innerHeight);
          }}
        >
          <KeyboardDoubleArrowDownIcon
            fontSize="large"
            sx={{ contentAlign: "left", display: "flex", alignItems: "left" }}
          />
          Let's give it a try
          <KeyboardDoubleArrowDownIcon fontSize="large" />
        </Button>
      </BottomNavigation>
    </Box>
  );
}
