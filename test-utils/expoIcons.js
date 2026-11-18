/* eslint-env jest */
// Native rendering is checked on Android; keep the real icon adapter in component tests.
const React = require('react');

jest.doMock('@expo/ui', () => ({
  Host: ({ children, ...props }) => React.createElement('ExpoUiHost', props, children),
  Icon: (props) => React.createElement('ExpoUiIcon', props),
  Button: (props) => React.createElement('ExpoUiButton', props),
  Text: ({ children, ...props }) => React.createElement('ExpoUiText', props, children),
  TextInput: (props) => React.createElement('ExpoUiTextInput', props),
  useNativeState: (initialValue) => React.useRef({ value: initialValue }).current,

}));

jest.doMock('@expo/ui/jetpack-compose', () => {
  const FilterChip = ({ children, ...props }) => React.createElement('ExpoFilterChip', props, children);
  FilterChip.Label = ({ children }) => React.createElement('ExpoFilterChipLabel', null, children);
  const NavigationBarItem = ({ children, ...props }) => React.createElement('ExpoNavigationItem', props, children);
  NavigationBarItem.Icon = ({ children }) => React.createElement('ExpoNavigationIcon', null, children);
  NavigationBarItem.Label = ({ children }) => React.createElement('ExpoNavigationLabel', null, children);
  const ListItem = ({ children, ...props }) => React.createElement('ExpoDrawerListItem', props, children);
  const Card = ({ children, ...props }) => React.createElement('ExpoHomeCard', props, children);
  const RNHostView = ({ children, ...props }) => React.createElement('ExpoRNHostView', props, children);
  const Slider = ({ children, ...props }) => React.createElement('ExpoComposeSlider', props, children);

  Slider.Thumb = ({ children }) => React.createElement('ExpoSliderThumb', null, children);
  Slider.Track = ({ children }) => React.createElement('ExpoSliderTrack', null, children);
  ListItem.HeadlineContent = ({ children }) => React.createElement('ExpoDrawerHeadline', null, children);
  ListItem.LeadingContent = ({ children }) => React.createElement('ExpoDrawerLeading', null, children);
  ListItem.SupportingContent = ({ children }) => React.createElement('ExpoDrawerSupporting', null, children);
  ListItem.TrailingContent = ({ children }) => React.createElement('ExpoDrawerTrailing', null, children);
  return {
    Host: ({ children, ...props }) => React.createElement('ExpoComposeHost', props, children),

    Button: ({ children, ...props }) => props.colors?.containerColor === '#65D66E'
      ? React.createElement('ExpoHomePill', { ...props, variant: 'filled' }, children)
      : React.createElement('ExpoComposeButton', props, children),
    OutlinedButton: ({ children, ...props }) => React.createElement('ExpoHomePill', { ...props, variant: 'outlined' }, children),
    FilterChip,
    NavigationBar: ({ children, ...props }) => React.createElement('ExpoNavigationBar', props, children),
    NavigationBarItem,
    ListItem,
    Card,
    RNHostView,
    Slider,

    Box: ({ children, ...props }) => React.createElement('ExpoComposeBox', props, children),
    Column: ({ children, ...props }) => React.createElement('ExpoComposeColumn', props, children),
    Text: ({ children, ...props }) => React.createElement('ExpoComposeText', props, children),
    LinearProgressIndicator: (props) => React.createElement('ExpoLinearProgress', props),
    CircularProgressIndicator: (props) => React.createElement('ExpoCircularProgress', props),
    Switch: (props) => React.createElement('ExpoComposeSwitch', props),
    Shape: { Pill: () => null },
  };
});
jest.doMock('@expo/ui/jetpack-compose/modifiers', () => ({
  semantics: (params) => ({ $type: 'semantics', ...params }),
  selectable: (selected, handler, role) => ({ $type: 'selectable', selected, handler, role }),
  clickable: (handler) => ({ $type: 'clickable', handler }),
  fillMaxSize: () => ({ $type: 'fillMaxSize' }),
  size: (width, height) => ({ $type: 'size', width, height }),
  height: (value) => ({ $type: 'height', value }),
  fillMaxWidth: () => ({ $type: 'fillMaxWidth' }),
  paddingAll: (value) => ({ $type: 'paddingAll', value }),
  clip: (shape) => ({ $type: 'clip', shape }),
  background: (color) => ({ $type: 'background', color }),
  Shapes: { Circle: { type: 'circle' } },
}));

[
  'home', 'search', 'library_music', 'add', 'close', 'play_arrow', 'pause',
  'skip_previous', 'skip_next', 'shuffle', 'repeat', 'repeat_one', 'favorite', 'add_circle', 'check_circle',
  'keyboard_arrow_down', 'more_horiz', 'queue_music', 'playlist_add', 'share',
  'phone_android', 'check', 'chevron_left', 'chevron_right', 'delete', 'music_note',
  'person', 'settings', 'history', 'bar_chart', 'devices', 'logout', 'visibility', 'visibility_off',
].forEach((asset) => {
  jest.doMock(`@expo/material-symbols/${asset}.xml`, () => `${asset}-symbol`, { virtual: true });
});

jest.doMock('../src/components/icons/AppIcon', () =>
  jest.requireActual('../src/components/icons/AppIcon.android')
);
jest.doMock('../src/components/buttons/SecondaryButton', () =>
  jest.requireActual('../src/components/buttons/SecondaryButton.android')
);
jest.doMock('../src/components/buttons/PrimaryButton', () =>
  jest.requireActual('../src/components/buttons/PrimaryButton.android')
);
jest.doMock('../src/components/buttons/PlaylistButton', () =>
  jest.requireActual('../src/components/buttons/PlaylistButton.android')
);
jest.doMock('../src/components/navigation/HomeFilterChip', () =>
  jest.requireActual('../src/components/navigation/HomeFilterChip.android')
);
