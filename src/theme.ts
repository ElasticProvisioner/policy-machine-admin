import {createTheme, MantineColorsTuple} from '@mantine/core';

const violet: MantineColorsTuple = [
  "#f7ecff",
  "#e7d6fb",
  "#caaaf1",
  "#ac7ce8",
  "#9354e0",
  "#833bdb",
  "#7b2eda",
  "#6921c2",
  "#5d1cae",
  "#501599"
];

const blue: MantineColorsTuple = [
  "#e5f3ff",
  "#cde2ff",
  "#9ac2ff",
  "#64a0ff",
  "#3884fe",
  "#1d72fe",
  "#0969ff",
  "#0058e4",
  "#004ecd",
  "#0043b5"
];

const green: MantineColorsTuple = [
  "#e6ffee",
  "#d3f9e0",
  "#a8f2c0",
  "#7aea9f",
  "#54e382",
  "#3bdf70",
  "#2bdd66",
  "#1bc455",
  "#0bae4a",
  "#00973c"
];

const red: MantineColorsTuple = [
  "#ffeaf3",
  "#fcd4e1",
  "#f4a7bf",
  "#ec779c",
  "#e64f7e",
  "#e3366c",
  "#e22862",
  "#c91a52",
  "#b41148",
  "#9f003e"
]


// Corner radius used by the main panel cards across the app; reused as the
// default radius for Mantine components so buttons/badges/inputs match.
export const PANEL_RADIUS = 10;

export const lightTheme = createTheme({
  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  colors: {
    violet,
    blue,
    green,
    red
  },
  primaryColor: 'green',
  primaryShade: 9,
  other: {
    intellijContentBg: '#ffffff',
    intellijPanelBg: '#ffffff',
    intellijToolbarBg: '#ffffff',
    intellijDivider: '#d4d4d4',
  },
});

export const darkTheme = createTheme({
  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  colors: {
    violet,
    blue,
    green,
    red
  },
  primaryColor: 'green',
  primaryShade: 9,
  other: {
    intellijContentBg: '#1e1f22',  // JetBrains Dark editor background
    intellijPanelBg: '#2b2d30',    // JetBrains Dark sidebar/panel background
    intellijToolbarBg: '#313438',  // JetBrains Dark toolbar background
    intellijDivider: '#1e1f22',    // JetBrains Dark divider
  },
});

export const theme = lightTheme; // Default theme
